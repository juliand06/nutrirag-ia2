import type { Config, Context } from '@netlify/functions';
import { GoogleGenAI } from '@google/genai';

interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

interface CoachChatRequest {
  question?: string;
  intent?: string;
  coachContext?: Record<string, unknown>;
  chatHistory?: ChatTurn[];
}

const COACH_SYSTEM_INSTRUCTION = `Eres el Coach Clínico y Nutricional de NutriStudio AI.
Tu objetivo es ayudar a personas reales a comer mejor con su comida cotidiana y sus condiciones de salud, con calidez humana y rigor médico.

REGLAS CLÍNICAS Y DE ESTILO INQUEBRANTABLES:
1. Brevedad sin saturación: responde en 3 a 6 líneas claras (o lista corta de 3 viñetas). Nunca entregues muros de texto ni repitas todos los protocolos si la persona no los pidió.
2. Seguridad alimentaria absoluta: lee \`safetyAndStableFicha\` (alergias, alimentos que no le gustan, tipo de dieta, etapa de vida y notas confirmadas por el usuario). NUNCA recomiendes ningún alimento que choque con sus alergias, dieta o disgustos.
3. Si \`safetyAndStableFicha.safetyAdvisoryActive\` o \`hideCalorieNumbersMode\` es verdadero, NO propongas déficits calóricos ni recortes de peso; enfócate en comida nutritiva y hábitos.
4. Precedencia renal KDIGO: si existe condición renal, NO recomiendes dietas hiperproteicas ni aumentos de potasio sin aval nefrológico.
5. Interacciones fármaco-nutriente: menciona interacciones SOLO de los medicamentos declarados en \`safetyAndStableFicha.declaredMedications\`. Nunca menciones warfarina, levotiroxina o estatinas si la persona no los declaró.
6. Cero micronutrientes inventados: si \`micronutrientCoverage\` muestra 0% o valores \`null\`, sé honesto y no afirmes que el sodio o hierro de hoy excedió o cumplió una meta.
7. Memoria conversacional: ten en cuenta los turnos anteriores para responder preguntas de seguimiento ("¿y si lo cambio por arroz?").
8. Alcance: orientas sobre alimentación y hábitos; nunca diagnosticas ni modificas dosis de medicamentos. Haz como máximo 1 pregunta aclaratoria corta solo si hace falta.`;

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Método no permitido. Usa POST.' }, { status: 405 });
  }

  let body: CoachChatRequest;
  try {
    body = (await req.json()) as CoachChatRequest;
  } catch {
    return Response.json({ error: 'El cuerpo de la solicitud debe ser JSON válido.' }, { status: 400 });
  }

  const question = String(body.question || '').trim();
  if (!question || question.length > 1500) {
    return Response.json({ error: 'Ingresa una consulta válida (máx. 1500 caracteres).' }, { status: 400 });
  }

  const hasGatewayOrKey = Boolean(
    Netlify.env.get('GEMINI_API_KEY') ||
      Netlify.env.get('GOOGLE_GEMINI_BASE_URL') ||
      Netlify.env.get('GOOGLE_API_KEY')
  );

  if (!hasGatewayOrKey) {
    return Response.json(
      {
        error: 'COACH_GATEWAY_INACTIVE',
        message: 'El LLM del Coach requiere AI Gateway activo o GEMINI_API_KEY en el servidor.'
      },
      { status: 503 }
    );
  }

  const genAI = new GoogleGenAI({});
  const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash'];
  const history = Array.isArray(body.chatHistory) ? body.chatHistory.slice(-6) : [];
  const contextJson = JSON.stringify(body.coachContext || {});

  const contents = [
    ...history.map(turn => ({
      role: turn.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(turn.text || '').slice(0, 600) }]
    })),
    {
      role: 'user',
      parts: [
        {
          text: `CONTEXTO CLÍNICO VERIFICADO DEL USUARIO (NO INVENTAR DATOS FUERA DE AQUÍ):\n${contextJson}\n\nPREGUNTA ACTUAL DEL USUARIO:\n${question}`
        }
      ]
    }
  ];

  let lastError: unknown = null;
  for (const model of candidateModels) {
    try {
      const response = await genAI.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: COACH_SYSTEM_INSTRUCTION,
          temperature: 0.35,
          maxOutputTokens: 520
        }
      });

      const answer = String(response.text || '').trim();
      if (!answer) throw new Error('Respuesta vacía del modelo.');

      return Response.json(
        {
          answer,
          modelUsed: model,
          source: 'netlify-ai-gateway-gemini-coach'
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
      error: 'COACH_GENERATION_FAILED',
      message: 'No pudimos generar la respuesta del Coach en este momento.',
      detail: lastError instanceof Error ? lastError.message : String(lastError)
    },
    { status: 502 }
  );
};

export const config: Config = {
  path: '/api/coach-chat',
  method: 'POST',
  rateLimit: {
    action: 'rate_limit',
    aggregateBy: ['ip'],
    windowSize: 600,
    windowLimit: 30
  }
};
