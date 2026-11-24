import type { Config, Context } from '@netlify/functions';
import { GoogleGenAI } from '@google/genai';

interface MealVisionRequest {
  imageBase64?: string;
  mimeType?: string;
  mealType?: string;
  userHint?: string;
  clinicalContext?: {
    country?: string;
    dietType?: string;
    allergies?: string[];
    protocols?: string[];
  };
}

const VISION_SYSTEM_PROMPT = `Eres un nutricionista clínico experto en bromatología y análisis visual de platos reales (latinoamericanos y globales) para NutriStudio AI.
Analiza la fotografía enviada y responde EXCLUSIVAMENTE con un objeto JSON válido (sin bloques markdown ni texto fuera del JSON).

Reglas clínicas estrictas:
1. Primero determina si la imagen muestra realmente comida, bebida o una tabla nutricional ("isFoodValid": true o false). Si muestra personas, objetos, pantallas, animales o documentos que no son comida, devuelve "isFoodValid": false y explica amablemente en "rejectionReason".
2. Si "isFoodValid" es true:
   - Identifica cada ingrediente o componente visible en el plato con su nombre claro en español y estima su peso realista en gramos ("estimatedGrams").
   - Calcula para CADA ingrediente (para esos gramos estimados, NO por 100g): kcal, protein, carbs, fat, fiber y glycemicIndex ("Bajo", "Medio" o "Alto"). Para micronutrientes (sodiumMg, potassiumMg, ironMg, calciumMg, vitaminCMg, omega3Mg), complétalos SOLO si el alimento tiene una composición estándar confiable (USDA/ICBF); si es una salsa casera o preparación mixta incierta, devuelve null en ese micronutriente en lugar de inventar cifras.
   - Lista en "detectedAllergens" los alérgenos presentes o muy probables usando términos en minúscula de esta lista: "huevo", "lacteos", "gluten", "pescado", "mariscos", "mani", "frutos_secos", "soya".
   - Redacta "clinicalObservation" (máximo 2 frases) aplicando evidencia médica (ADA, DASH, OMS, ISSN, ESPEN, KDIGO, ATA) adaptada a los protocolos del usuario.
   - Redacta "practicalUpgradeTip" (1 frase accionable para mejorar la saciedad, fibra o balance glucémico de ese plato).

Formato JSON obligatorio:
{
  "isFoodValid": true,
  "rejectionReason": null,
  "dishName": "Nombre descriptivo del plato en español",
  "confidence": "Alta",
  "detectedAllergens": ["huevo"],
  "ingredients": [
    {
      "name": "Huevos revueltos",
      "estimatedGrams": 110,
      "kcal": 175,
      "protein": 13,
      "carbs": 1,
      "fat": 13,
      "fiber": 0,
      "sodiumMg": 210,
      "potassiumMg": 145,
      "ironMg": 1.8,
      "calciumMg": 58,
      "vitaminCMg": 0,
      "omega3Mg": 85,
      "glycemicIndex": "Bajo"
    }
  ],
  "clinicalObservation": "Buen aporte proteico para iniciar el día...",
  "practicalUpgradeTip": "Añade una porción de vegetales o fruta entera con fibra..."
}`;

function extractJsonObject(rawText: string) {
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('La respuesta de visión no contenía un JSON válido.');
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Método no permitido. Usa POST.' }, { status: 405 });
  }

  let body: MealVisionRequest;
  try {
    body = (await req.json()) as MealVisionRequest;
  } catch {
    return Response.json({ error: 'El cuerpo de la solicitud debe ser JSON válido.' }, { status: 400 });
  }

  const imageBase64 = String(body.imageBase64 || '').replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '').trim();
  const mimeType = String(body.mimeType || 'image/jpeg').trim();

  if (!imageBase64 || imageBase64.length < 100) {
    return Response.json({ error: 'Debes enviar una imagen válida en base64.' }, { status: 400 });
  }

  // Límite de seguridad (~4 MB base64)
  if (imageBase64.length > 5_500_000) {
    return Response.json(
      { error: 'La imagen es demasiado grande. Intenta con una foto más liviana.' },
      { status: 413 }
    );
  }

  const hasGatewayOrKey = Boolean(
    Netlify.env.get('GEMINI_API_KEY') ||
      Netlify.env.get('GOOGLE_GEMINI_BASE_URL') ||
      Netlify.env.get('GOOGLE_API_KEY')
  );

  if (!hasGatewayOrKey) {
    return Response.json(
      {
        error: 'VISION_GATEWAY_INACTIVE',
        message:
          'El motor de Visión IA requiere estar desplegado en Netlify con AI Gateway activo o tener GEMINI_API_KEY configurada en el servidor.'
      },
      { status: 503 }
    );
  }

  const ctx = body.clinicalContext || {};
  const userPrompt = [
    `Tiempo de comida: ${body.mealType || 'Comida del día'}.`,
    ctx.country ? `País de referencia gastronómica: ${ctx.country}.` : '',
    ctx.dietType ? `Tipo de alimentación del usuario: ${ctx.dietType}.` : '',
    Array.isArray(ctx.allergies) && ctx.allergies.length > 0
      ? `Alergias/intolerancias registradas: ${ctx.allergies.join(', ')}.`
      : '',
    Array.isArray(ctx.protocols) && ctx.protocols.length > 0
      ? `Protocolos clínicos activos: ${ctx.protocols.join('; ')}.`
      : '',
    body.userHint ? `Nota adicional del usuario sobre el plato: "${body.userHint}".` : '',
    'Analiza la imagen y devuelve únicamente el JSON clínico estructurado.'
  ]
    .filter(Boolean)
    .join('\n');

  // Netlify AI Gateway inyecta automáticamente GEMINI_API_KEY y GOOGLE_GEMINI_BASE_URL
  const genAI = new GoogleGenAI({});
  const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash'];
  let lastError: unknown = null;

  for (const model of candidateModels) {
    try {
      const response = await genAI.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              { text: `${VISION_SYSTEM_PROMPT}\n\n${userPrompt}` },
              {
                inlineData: {
                  mimeType,
                  data: imageBase64
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      });

      const rawText = response.text || '';
      const parsed = extractJsonObject(rawText);

      return Response.json(
        {
          ...parsed,
          modelUsed: model,
          source: 'netlify-ai-gateway-gemini-vision'
        },
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
          }
        }
      );
    } catch (err) {
      lastError = err;
    }
  }

  return Response.json(
    {
      error: 'VISION_ANALYSIS_FAILED',
      message: 'No pudimos completar el análisis visual en este momento. Intenta de nuevo en unos segundos.',
      detail: lastError instanceof Error ? lastError.message : String(lastError)
    },
    { status: 502 }
  );
};

export const config: Config = {
  path: '/api/analyze-meal-photo',
  method: 'POST',
  rateLimit: {
    action: 'rate_limit',
    aggregateBy: ['ip'],
    windowSize: 600,
    windowLimit: 15
  }
};
