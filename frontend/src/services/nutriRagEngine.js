// Motor de Asesoría Nutricional + Búsqueda Híbrida RAG (Vector + Léxico) + Visión Multimodal
import {
  buildCountryRagDocument,
  getCountryProfile,
  getBudgetProfile,
  getMetabolismProfile,
  computeMetabolicMetrics
} from './countryNutritionData';
import { GLOBAL_MEDICAL_RAG_DOCUMENTS } from './clinicalKnowledgeBase';

// Gobernanza y Presupuesto de Tokens para uso diario a largo plazo (evita fatiga de contexto y sobrecosto)
export const TOKEN_GOVERNANCE = {
  MAX_CONTEXT_TOKENS: 900,
  MAX_OUTPUT_TOKENS: 420,
  DAILY_TOKEN_BUDGET: 12000
};

const QUERY_RESPONSE_CACHE = new Map();

export function estimateTokens(text) {
  if (!text) return 0;
  return Math.max(1, Math.ceil(String(text).length / 4));
}

function trimToTokenBudget(text, maxTokens) {
  const maxChars = maxTokens * 4;
  if (!text || text.length <= maxChars) return text || '';
  return text.slice(0, maxChars - 3).trim() + '...';
}

const INITIAL_DOCUMENTS = [
  {
    id: 'doc-oms-calorias',
    tenantId: 'reference',
    ownerUsername: 'sistema',
    fileName: 'Guia_Clinica_Calorias_y_Macronutrientes_OMS.pdf',
    sha256Hash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
    totalPages: 4,
    totalChunks: 3,
    ocrApplied: false,
    embeddingModel: 'text-embedding-004',
    tempFileDeleted: true,
    indexingStatus: 'INDEXED',
    createdAt: '2026-11-17',
    chunks: [
      {
        id: 'chk-oms-1',
        pageNumber: 1,
        sectionTitle: '1. Balance Energético y Cálculo de Calorías Diarias (TMB)',
        chunkOrder: 1,
        tokenCount: 640,
        content:
          'El gasto energético total diario se compone de la Tasa Metabólica Basal (TMB, 60-70%), el efecto térmico de los alimentos (10%) y la actividad física (20-30%). Para un déficit calórico saludable orientado a pérdida de grasa sin perder masa muscular, se recomienda reducir entre 300 y 500 kcal sobre el mantenimiento diario. Cada gramo de proteína aporta 4 kcal, cada gramo de carbohidrato aporta 4 kcal y cada gramo de grasa aporta 9 kcal.'
      },
      {
        id: 'chk-oms-2',
        pageNumber: 2,
        sectionTitle: '2. Distribución Óptima de Carbohidratos y Carga Glucémica',
        chunkOrder: 2,
        tokenCount: 615,
        content:
          'Los carbohidratos deben representar entre el 40% y el 50% de las calorías totales en adultos activos. Se priorizan carbohidratos complejos de absorción lenta y alto contenido de fibra (25-35 g/día) como avena integral, quinua, arroz integral, legumbres, batata y vegetales fibrosos, evitando picos de insulina y mejorando la saciedad prolongada.'
      },
      {
        id: 'chk-oms-3',
        pageNumber: 3,
        sectionTitle: '3. Requerimientos de Proteína y Grasas Saludables',
        chunkOrder: 3,
        tokenCount: 590,
        content:
          'Para preservar la masa muscular y optimizar la saciedad, se recomienda una ingesta proteica de 1.6 a 2.2 g de proteína por kg de peso corporal (pechuga de pollo, pescado, huevos, tofu, legumbres, yogur griego). Las grasas saludables (25-30% de kcal totales) deben provenir de ácidos grasos mono y poliinsaturados como aguacate, aceite de oliva virgen extra, nueces y semillas de chía.'
      }
    ]
  },
  {
    id: 'doc-tabla-alimentos',
    tenantId: 'reference',
    ownerUsername: 'sistema',
    fileName: 'Tabla_Composicion_Nutricional_Alimentos_2026.pdf',
    sha256Hash: '3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b',
    totalPages: 6,
    totalChunks: 2,
    ocrApplied: true,
    embeddingModel: 'text-embedding-004',
    tempFileDeleted: true,
    indexingStatus: 'INDEXED',
    createdAt: '2026-11-17',
    chunks: [
      {
        id: 'chk-tabla-1',
        pageNumber: 2,
        sectionTitle: 'Tabla 1: Cereales, Tubérculos y Carbohidratos por 100g',
        chunkOrder: 1,
        tokenCount: 680,
        content:
          'Arroz integral o blanco cocido (100g): 130 kcal, 28g carbohidratos, 2.7g proteína, 0.3g grasa. Avena en hojuelas cruda (100g): 389 kcal, 66g carbohidratos, 16.9g proteína, 6.9g grasa, 10.6g fibra. Plátano/Banano mediano (100g): 89 kcal, 22.8g carbohidratos, 1.1g proteína, 2.6g fibra. Papa o batata cocida (100g): 87 kcal, 20g carbohidratos, 1.9g proteína.'
      },
      {
        id: 'chk-tabla-2',
        pageNumber: 4,
        sectionTitle: 'Tabla 2: Proteínas Magras y Grasas Saludables por 100g',
        chunkOrder: 2,
        tokenCount: 650,
        content:
          'Pechuga de pollo a la plancha (100g): 165 kcal, 0g carbohidratos, 31g proteína, 3.6g grasa. Salmón al horno (100g): 208 kcal, 0g carbohidratos, 20g proteína, 13g grasa (rico en Omega-3). Huevo entero unidad (60g): 78 kcal, 0.6g carbohidratos, 6.3g proteína, 5.3g grasa. Aguacate Hass (100g): 160 kcal, 8.5g carbohidratos (6.7g fibra), 2g proteína, 14.7g grasa monoinsaturada.'
      }
    ]
  },
  {
    id: 'doc-plan-clinico',
    tenantId: 'reference',
    ownerUsername: 'sistema',
    fileName: 'Guia_Planificacion_Comidas_e_Hidratacion.pdf',
    sha256Hash: '9b2d4e81239a7f15cc804123de9081b2c4519081aa782311f098123ac4192831',
    totalPages: 3,
    totalChunks: 2,
    ocrApplied: false,
    embeddingModel: 'text-embedding-004',
    tempFileDeleted: true,
    indexingStatus: 'INDEXED',
    createdAt: '2026-11-17',
    chunks: [
      {
        id: 'chk-plan-1',
        pageNumber: 1,
        sectionTitle: 'Distribución Sugerida por Comidas del Día',
        chunkOrder: 1,
        tokenCount: 570,
        content:
          'Se recomienda distribuir la ingesta calórica diaria en 3 a 4 tiempos de comida: Desayuno (25% de las calorías diarias, priorizando proteína como huevos o yogur griego junto con avena o fruta), Almuerzo (35% de las calorías, combinando proteína magra, carbohidrato complejo y ensalada abundante), Merienda opcional (15%) y Cena ligera (25%).'
      },
      {
        id: 'chk-plan-2',
        pageNumber: 3,
        sectionTitle: 'Recomendaciones de Hidratación y Cena Ligera',
        chunkOrder: 2,
        tokenCount: 540,
        content:
          'Consumir mínimo 35 ml de agua por kg de peso corporal al día. En la cena se aconseja priorizar proteína magra (pescado blanco, salmón, pollo o claras con huevo) acompañada de vegetales verdes salteados o al vapor y una porción moderada de carbohidratos complejos (máximo 35-40g de carbohidratos netos) para favorecer el descanso nocturno y la sensibilidad a la insulina.'
      }
    ]
  }
];

function normalizeText(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const NUTRITION_KEYWORDS = [
  'caloria', 'kcal', 'carbohidrato', 'carb', 'proteina', 'grasa', 'lipido',
  'fibra', 'dieta', 'nutricion', 'nutriente', 'alimento', 'alimentacion', 'comida', 'comer',
  'desayuno', 'desayunar', 'almuerzo', 'almorzar', 'cena', 'cenar', 'merienda', 'snack',
  'fruta', 'verdura', 'vegetal', 'ensalada', 'pollo', 'carne', 'res', 'cerdo', 'pavo',
  'pescado', 'salmon', 'atun', 'huevo', 'arroz', 'avena', 'quinua', 'pan', 'pasta', 'papa',
  'batata', 'platano', 'banano', 'manzana', 'aguacate', 'frijol', 'lenteja', 'garbanzo',
  'legumbre', 'leche', 'yogur', 'queso', 'aceite', 'oliva', 'nuez', 'almendra', 'chia',
  'azucar', 'glucosa', 'insulina', 'glucemico', 'peso', 'kilo', 'kg', 'adelgazar', 'bajar',
  'subir', 'deficit', 'superavit', 'masa', 'muscular', 'musculo', 'hidratacion', 'agua',
  'vaso', 'ml', 'litro', 'vitamina', 'mineral', 'hierro', 'calcio', 'magnesio', 'omega',
  'colesterol', 'triglicerido', 'ayuno', 'metabolismo', 'basal', 'tmb', 'imc', 'salud',
  'bienestar', 'digestion', 'receta', 'plato', 'porcion', 'gramo', 'etiqueta', 'vegano',
  'vegetariano', 'gluten', 'lactosa', 'pdf', 'documento', 'plan', 'guia', 'tabla',
  'hola', 'buenos', 'buenas', 'gracias', 'ayuda', 'macro', 'menu', 'hambre', 'saciedad',
  'energia', 'entrenamiento', 'ejercicio', 'gimnasio', 'postreno', 'preentreno', 'suplemento',
  'creatina', 'meta', 'objetivo', 'seguimiento', 'progreso', 'hoy', 'falta', 'recomienda',
  'pais', 'colombia', 'mexico', 'peru', 'argentina', 'chile', 'ecuador', 'espana', 'estados unidos',
  'productividad', 'local', 'presupuesto', 'economico', 'barato', 'proceso', 'acompanamiento',
  'nopal', 'amaranto', 'yuca', 'guayaba', 'camote', 'palta', 'jurel', 'chochos', 'sardina', 'zapallo', 'arepa',
  'diabetes', 'prediabetes', 'hipertension', 'presion', 'gastritis', 'colon', 'anemia', 'fatiga',
  'cansancio', 'sodio', 'potasio', 'dash', 'ada', 'oms', 'issn', 'medico', 'clinico', 'condicion',
  'memoria', 'historial', 'evolucion', 'tendencia', 'conoces', 'habito', 'sueno', 'cortisol'
];

const OFF_TOPIC_TRIGGERS = [
  'futbol', 'champions', 'partido', 'messi', 'cristiano', 'mundial', 'politica', 'presidente',
  'elecciones', 'congreso', 'programar', 'java', 'python', 'javascript', 'react', 'codigo',
  'sql', 'nullpointer', 'error 404', 'error 500', 'compilar', 'videojuego', 'pelicula',
  'bitcoin', 'cripto', 'trading', 'derivada', 'integral', 'ecuacion', 'capital de',
  'historia universal', 'clima en', 'trafico'
];

const SEMANTIC_ANCHORS = [
  'calorias', 'kcal', 'deficit', 'energetico', 'metabolismo', 'basal', 'tmb',
  'carbohidratos', 'glucosa', 'insulina', 'avena', 'arroz', 'quinua', 'fibra', 'platano', 'papa',
  'proteina', 'aminoacidos', 'musculo', 'pollo', 'huevo', 'pescado', 'salmon', 'yogur',
  'grasa', 'lipidos', 'omega', 'aguacate', 'aceite', 'oliva', 'nueces',
  'desayuno', 'almuerzo', 'cena', 'merienda', 'agua', 'hidratacion', 'plan', 'comidas'
];

export function computeEmbedding(text) {
  const dims = 48;
  const vec = new Array(dims).fill(0);
  const normText = normalizeText(text);

  SEMANTIC_ANCHORS.forEach((anchor, i) => {
    const idx = i % dims;
    if (normText.includes(anchor)) {
      vec[idx] += 1.8;
    }
  });

  const words = normText.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length >= 3);
  words.forEach(w => {
    let hash = 0;
    for (let i = 0; i < w.length; i++) {
      hash = (hash * 31 + w.charCodeAt(i)) % dims;
    }
    vec[hash] += 0.35;
  });

  const norm = Math.sqrt(vec.reduce((acc, v) => acc + v * v, 0));
  if (norm > 0) {
    for (let i = 0; i < dims; i++) {
      vec[i] = Number((vec[i] / norm).toFixed(4));
    }
  }
  return vec;
}

export function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function evaluateNutritionGuardrail(question) {
  const clean = (question || '').trim();
  if (clean.length < 2) {
    return {
      allowed: false,
      calmMessage:
        'Parece que tu mensaje llegó incompleto. Puedes escribirme cualquier duda sobre tu alimentación, calorías, distribución de carbohidratos o el contenido de tus documentos.'
    };
  }

  const norm = normalizeText(clean);
  const hasNutrition = NUTRITION_KEYWORDS.some(k => norm.includes(k));
  const hasOffTopic = OFF_TOPIC_TRIGGERS.some(t => norm.includes(t));

  // Detectar cadenas sin sentido como "asdf qwerty"
  const isGibberish = /^[bcdfghjklmnpqrstvwxyz\s0-9?!]+$/i.test(clean) && clean.length > 4;

  if (isGibberish || (hasOffTopic && !hasNutrition)) {
    return {
      allowed: false,
      calmMessage:
        'Entiendo tu mensaje, pero este espacio está dedicado exclusivamente a tu asesoría nutricional, control de calorías, macronutrientes y bienestar alimenticio. Con gusto puedo ayudarte a planificar tus comidas, revisar tu progreso del día o consultar tus guías nutricionales. ¿Qué te gustaría saber sobre tu alimentación?'
    };
  }

  if (!hasNutrition && clean.split(/\s+/).length > 3) {
    return {
      allowed: false,
      calmMessage:
        'Con tranquilidad te comento que mi función es orientarte únicamente en temas de nutrición, calorías, carbohidratos, proteínas y hábitos saludables. ¿Podrías enfocar tu consulta en algún alimento, comida del día o meta nutricional?'
    };
  }

  return { allowed: true, calmMessage: null };
}

function buildSmartLocalSynthesis(question, topRefs, userProfile, dailyTracking, hasUserDocs, userMemory) {
  const normQ = normalizeText(question);
  const name = userProfile?.name ? userProfile.name.split(' ')[0] : '';
  const country = getCountryProfile(userProfile?.country || 'CO');
  const budget = getBudgetProfile(userProfile?.budgetTier || 'equilibrado');
  const meta = getMetabolismProfile(userProfile?.metabolismType || 'equilibrado');
  const metrics = computeMetabolicMetrics(userProfile);

  const goalKcal = Number(userProfile?.dailyCalories || 0);
  const goalCarbs = Number(userProfile?.targetCarbs || 0);
  const goalProt = Number(userProfile?.targetProtein || 0);
  const goalFat = Number(userProfile?.targetFat || 0);

  const consumedKcal = Number(dailyTracking?.consumedKcal || 0);
  const consumedCarbs = Number(dailyTracking?.consumedCarbs || 0);
  const consumedProt = Number(dailyTracking?.consumedProtein || 0);
  const remainingKcal = goalKcal > 0 ? Math.max(0, goalKcal - consumedKcal) : 0;
  const remainingProt = goalProt > 0 ? Math.max(0, goalProt - consumedProt) : 0;

  const lines = [];

  if (
    normQ.includes('pais') ||
    normQ.includes('productividad') ||
    normQ.includes('economico') ||
    normQ.includes('presupuesto') ||
    normQ.includes('local') ||
    normQ.includes(normalizeText(country.name))
  ) {
    lines.push(
      `### Guía basada en la productividad alimenticia de **${country.name}** (Presupuesto: ${budget.id})`
    );
    lines.push(`- **Plus nutricional de ${country.name}:** ${country.nutritionalPlus}`);
    const topLocal = country.foods
      .slice(0, 4)
      .map(
        f =>
          `- **${f.name}:** ${f.kcal100g} kcal · ${f.protein100g}g proteína · ${f.carbs100g}g carbs — *${f.plus}*`
      );
    lines.push(topLocal.join('\n'));
    lines.push(`- **Plato recomendado hoy con ingredientes locales:** ${country.mealBlueprints.almuerzo}`);
  } else if (normQ.includes('metabolismo') || normQ.includes('tmb') || normQ.includes('proceso')) {
    lines.push(
      `### Acompañamiento de tu Proceso según tu Metabolismo${name ? `, ${name}` : ''}`
    );
    if (metrics) {
      lines.push(
        `- **Tus factores físicos calculados:** TMB (metabolismo basal) de **${metrics.bmr} kcal/día**, Gasto Energético Total (GET) de **${metrics.tdee} kcal/día** e IMC de **${metrics.bmi}** (${metrics.bmiCategory}).`
      );
    }
    lines.push(`- **Estrategia para tu ${meta.label}:** ${meta.strategy}`);
    lines.push(
      `- **Aplicación práctica en ${country.name}:** Desayuno sugerido: ${country.mealBlueprints.desayuno} | Cena ligera: ${country.mealBlueprints.cena}`
    );
  } else if (normQ.includes('cena') || normQ.includes('noche')) {
    lines.push(
      `Para una **cena ligera y equilibrada en ${country.name}**${name ? `, ${name},` : ''} adaptada a tu ${meta.label.split('(')[0].trim().toLowerCase()}:`
    );
    lines.push(`- **Opción local recomendada (${country.name}):** ${country.mealBlueprints.cena}`);
    lines.push(
      `- **Alternativa de alta saciedad:** 150g de pechuga de pollo a la plancha + ensalada verde con 50g de aguacate y aceite de oliva (~420 kcal · 14g carbohidratos · 42g proteína).`
    );
  } else if (normQ.includes('desayun') || normQ.includes('manana')) {
    lines.push(
      `Para el **desayuno en ${country.name}**${name ? `, ${name},` : ''} conviene combinar proteína local y fibra para activar tu metabolismo:`
    );
    lines.push(`- **Opción local recomendada (${country.name}):** ${country.mealBlueprints.desayuno}`);
    lines.push(
      `- **Opción energética:** Bowl con 50g de avena en hojuelas, 150g de yogur griego natural, fruta local y semillas de chía (~460 kcal · 62g carbohidratos · 24g proteína).`
    );
  } else if (normQ.includes('avena') || normQ.includes('arroz') || normQ.includes('pollo') || normQ.includes('100g')) {
    lines.push(
      `Aquí tienes la referencia nutricional exacta por cada **100 gramos** de alimento y sus fuentes de carbohidratos complejos:`
    );
    lines.push(
      `- **Pechuga de pollo a la plancha (100g):** 165 kcal · **31g proteína** · 0g carbohidratos · 3.6g grasa.`
    );
    lines.push(
      `- **Avena integral en hojuelas (100g cruda):** 389 kcal · **66g carbohidratos complejos** · 16.9g proteína · 10.6g fibra (una porción habitual de 50g aporta ~194 kcal y 33g carbohidratos).`
    );
    lines.push(
      `- **Arroz cocido (100g):** 130 kcal · **28g carbohidratos** · 2.7g proteína · 0.3g grasa.`
    );
    lines.push(
      `- **Plus local en ${country.name}:** ${country.foods[0]?.name} (${country.foods[0]?.plus})`
    );
  } else {
    if (topRefs[0]) {
      lines.push(topRefs[0].snippet);
    }
    if (topRefs[1]) {
      lines.push(topRefs[1].snippet);
    }
    lines.push(`- **Sugerencia para tu proceso en ${country.name}:** ${country.mealBlueprints.almuerzo}`);
  }

  // Integrar el estado real de la cuenta del usuario + metabolismo
  if (goalKcal > 0) {
    lines.push(
      `\n**Seguimiento de tu proceso hoy (${country.name} · ${meta.label.split('(')[0].trim()}):** Tu meta es **${goalKcal} kcal/día** (${goalCarbs}g carbs · ${goalProt}g proteína · ${goalFat}g grasas). Llevas **${consumedKcal} kcal** (${consumedCarbs}g carbs y ${consumedProt}g proteína), por lo que te restan **${remainingKcal} kcal** y **${remainingProt}g de proteína** para completar tu jornada.`
    );
  } else {
    lines.push(
      `\n**Siguiente paso en tu proceso:** Configura tu país, peso, estatura y tipo de metabolismo en **Mi cuenta y metas** para calcular tu TMB, GET y plan diario con alimentos locales.`
    );
  }

  if (userMemory?.activeProtocols?.length > 0) {
    const protoLines = userMemory.activeProtocols
      .map(p => `- **${p.label}** *(${p.source})*: ${p.keyRules}`)
      .join('\n');
    lines.push(`\n**Protocolos médicos/clínicos activos en tu perfil:**\n${protoLines}`);
  }

  if (userMemory?.proactiveInsights?.length > 0) {
    lines.push(
      `\n**Lo que he aprendido de tu historial (Memoria IA — ${userMemory.knowledgeScore}%):** ${userMemory.weightTrendText} ${userMemory.proactiveInsights[0]}`
    );
  }

  if (topRefs[0]) {
    lines.push(
      `*(Fuente RAG consultada: ${topRefs[0].documentName}, Pág. ${topRefs[0].pageNumber})*`
    );
  }

  return lines.join('\n\n');
}

export async function runHybridRagQuery(
  question,
  documents,
  aiConfig,
  userProfile,
  dailyTracking,
  userMemory = null,
  tokenBudgetState = null
) {
  const guardrail = evaluateNutritionGuardrail(question);
  if (!guardrail.allowed) {
    return {
      guardrailTriggered: true,
      answer: guardrail.calmMessage,
      citations: [],
      tokenMetrics: {
        tokensUsed: 0,
        tokensSaved: 450,
        mode: 'guardrail-local-0-tokens'
      }
    };
  }

  // Caché de consultas repetidas en el mismo estado diario (0 tokens)
  const cacheKey = `${userProfile?.id || 'anon'}|${userProfile?.country || 'CO'}|${dailyTracking?.consumedKcal || 0}|${normalizeText(question).trim()}`;
  if (QUERY_RESPONSE_CACHE.has(cacheKey)) {
    const cached = QUERY_RESPONSE_CACHE.get(cacheKey);
    return {
      ...cached,
      tokenMetrics: {
        tokensUsed: 0,
        tokensSaved: 700,
        mode: 'cache-0-tokens'
      }
    };
  }

  const hasUserDocs = Array.isArray(documents) && documents.length > 0;
  const countryRagDoc = buildCountryRagDocument(userProfile?.country || 'CO');
  const docsToSearch = hasUserDocs
    ? [...documents, ...GLOBAL_MEDICAL_RAG_DOCUMENTS, countryRagDoc]
    : [...INITIAL_DOCUMENTS, ...GLOBAL_MEDICAL_RAG_DOCUMENTS, countryRagDoc];

  const qVec = computeEmbedding(question);
  const qWords = normalizeText(question)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3);

  const allScored = [];
  docsToSearch.forEach(doc => {
    (doc.chunks || []).forEach(chunk => {
      const cVec = computeEmbedding(chunk.sectionTitle + ' ' + chunk.content);
      const vectorScore = Math.max(0.12, cosineSimilarity(qVec, cVec));
      const lowerContent = normalizeText(chunk.sectionTitle + ' ' + chunk.content);
      let matches = 0;
      qWords.forEach(w => {
        if (lowerContent.includes(w)) matches++;
      });
      const lexicalScore = qWords.length > 0 ? Math.min(1, matches / qWords.length) : 0.3;
      const hybridScore = Number((vectorScore * 0.65 + lexicalScore * 0.35).toFixed(3));

      allScored.push({
        documentId: doc.id,
        documentName: doc.fileName,
        pageNumber: chunk.pageNumber,
        sectionTitle: chunk.sectionTitle,
        chunkOrder: chunk.chunkOrder,
        vectorScore: Number(vectorScore.toFixed(3)),
        lexicalScore: Number(lexicalScore.toFixed(3)),
        hybridScore,
        snippet: chunk.content
      });
    });
  });

  allScored.sort((a, b) => b.hybridScore - a.hybridScore);
  const topRefs = allScored.slice(0, 2);
  const userCitations = hasUserDocs ? topRefs : [];

  const goalKcal = Number(userProfile?.dailyCalories || 0);
  const consumedKcal = Number(dailyTracking?.consumedKcal || 0);
  const consumedCarbs = Number(dailyTracking?.consumedCarbs || 0);
  const consumedProtein = Number(dailyTracking?.consumedProtein || 0);
  const consumedFat = Number(dailyTracking?.consumedFat || 0);
  const waterTodayMl = Number(dailyTracking?.waterTodayMl || 0);

  const country = getCountryProfile(userProfile?.country || 'CO');
  const budget = getBudgetProfile(userProfile?.budgetTier || 'equilibrado');
  const meta = getMetabolismProfile(userProfile?.metabolismType || 'equilibrado');
  const metrics = computeMetabolicMetrics(userProfile);

  const metabolicText = metrics
    ? `TMB: ${metrics.bmr} kcal, GET: ${metrics.tdee} kcal, IMC: ${metrics.bmi} (${metrics.bmiCategory}), Metabolismo: ${meta.label}`
    : `Metabolismo: ${meta.label}`;
  const physicalNotesText = userProfile?.physicalNotes ? `, Factores físicos adicionales: ${userProfile.physicalNotes}` : '';

  const memoryBlock = userMemory?.memoryPromptSummary ? `\n\n${userMemory.memoryPromptSummary}` : '';
  const profileSummary =
    (goalKcal > 0
      ? `Datos del usuario en sesión: Nombre: ${userProfile.name}, País: ${country.name} (Productividad local: ${country.productivityFocus}; Plus nutricional: ${country.nutritionalPlus}), Presupuesto/posibilidades: ${budget.label}, Peso: ${userProfile.weightKg || 0} kg, ${metabolicText}${physicalNotesText}. Meta diaria: ${goalKcal} kcal (${userProfile.targetCarbs}g carbohidratos, ${userProfile.targetProtein}g proteína, ${userProfile.targetFat}g grasas). Progreso registrado hoy: ${consumedKcal} kcal consumidas (${consumedCarbs}g carbs, ${consumedProtein}g proteína, ${consumedFat}g grasas) y ${waterTodayMl} ml de agua.`
      : `Datos del usuario en sesión: Nombre: ${userProfile?.name || 'Usuario'}, País: ${country.name} (Plus: ${country.nutritionalPlus}), Presupuesto: ${budget.label}, ${metabolicText}${physicalNotesText}. Aún tiene sus metas en 0 kcal (lleva ${consumedKcal} kcal registradas hoy y ${waterTodayMl} ml de agua).`) +
    memoryBlock;

  // Compresión estricta de contexto (máx. 900 tokens de entrada) para que la IA no se sature a largo plazo
  const compactProfileSummary = trimToTokenBudget(profileSummary, 420);
  const compactContextText = trimToTokenBudget(
    topRefs
      .map(
        (c, idx) =>
          `[Ref ${idx + 1}: ${c.documentName}, Pág. ${c.pageNumber}]: ${trimToTokenBudget(c.snippet, 180)}`
      )
      .join('\n'),
    420
  );

  const usedToday = Number(tokenBudgetState?.tokensUsedToday || 0);
  const withinDailyBudget = usedToday < TOKEN_GOVERNANCE.DAILY_TOKEN_BUDGET;
  // Ahorro estimado frente a enviar historial crudo + documentos completos sin compresión (~2400 tokens)
  const rawUncompressedEstimate = 2400;

  if (withinDailyBudget && aiConfig.provider === 'OPENAI' && aiConfig.openAiKey?.trim()) {
    try {
      const userPrompt = `${compactProfileSummary}\n\nReferencias RAG:\n${compactContextText}\n\nConsulta: ${question}`;
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiConfig.openAiKey.trim()}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: TOKEN_GOVERNANCE.MAX_OUTPUT_TOKENS,
          messages: [
            {
              role: 'system',
              content:
                'Eres un nutricionista clínico profesional, cercano y conciso. Responde en español en viñetas cortas con calorías, gramos y guía práctica personalizada.'
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          temperature: 0.3
        })
      });
      if (res.ok) {
        const data = await res.json();
        const answer = data.choices[0].message.content;
        const tokensUsed =
          data.usage?.total_tokens || estimateTokens(userPrompt) + estimateTokens(answer);
        const resultObj = {
          guardrailTriggered: false,
          answer,
          citations: userCitations,
          tokenMetrics: {
            tokensUsed,
            tokensSaved: Math.max(0, rawUncompressedEstimate - tokensUsed),
            mode: 'openai-comprimido'
          }
        };
        QUERY_RESPONSE_CACHE.set(cacheKey, resultObj);
        return resultObj;
      }
    } catch {
      // Continúa al respaldo
    }
  }

  if (withinDailyBudget && aiConfig.provider === 'GEMINI' && aiConfig.geminiKey?.trim()) {
    try {
      const promptText = `Actúa como nutricionista clínico en NutriStudio (sé claro y conciso).
${compactProfileSummary}

Referencias RAG:
${compactContextText}

Instrucciones: Si no es tema de nutrición, redirige con calma. Si lo es, responde en español en viñetas cortas con gramos, calorías y guía para el proceso de hoy.

Consulta: ${question}`;

      const modelsToTry = ['gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-flash-latest'];
      for (const modelName of modelsToTry) {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${aiConfig.geminiKey.trim()}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              generationConfig: {
                maxOutputTokens: TOKEN_GOVERNANCE.MAX_OUTPUT_TOKENS,
                temperature: 0.3
              },
              contents: [
                {
                  parts: [{ text: promptText }]
                }
              ]
            })
          }
        );
        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const answer = text.trim();
            const tokensUsed =
              data?.usageMetadata?.totalTokenCount ||
              estimateTokens(promptText) + estimateTokens(answer);
            const resultObj = {
              guardrailTriggered: false,
              answer,
              citations: userCitations,
              tokenMetrics: {
                tokensUsed,
                tokensSaved: Math.max(0, rawUncompressedEstimate - tokensUsed),
                mode: 'gemini-comprimido'
              }
            };
            QUERY_RESPONSE_CACHE.set(cacheKey, resultObj);
            return resultObj;
          }
        }
      }
    } catch {
      // Continúa a síntesis local inteligente
    }
  }

  const localAnswer = buildSmartLocalSynthesis(
    question,
    topRefs,
    userProfile,
    dailyTracking,
    hasUserDocs,
    userMemory
  );
  const localResult = {
    guardrailTriggered: false,
    answer: withinDailyBudget
      ? localAnswer
      : `${localAnswer}\n\n*(Modo Ahorro de Tokens activo: se alcanzó el límite diario de ${TOKEN_GOVERNANCE.DAILY_TOKEN_BUDGET.toLocaleString()} tokens LLM, por lo que sigo guiándote sin interrupción con el motor RAG local de 0 tokens).*`,
    citations: userCitations,
    tokenMetrics: {
      tokensUsed: 0,
      tokensSaved: 950,
      mode: withinDailyBudget ? 'rag-local-0-tokens' : 'modo-ahorro-limite-diario'
    }
  };
  QUERY_RESPONSE_CACHE.set(cacheKey, localResult);
  return localResult;
}

export const MEAL_PRESETS = [
  {
    id: 'preset-chicken',
    title: 'Almuerzo: Pechuga de pollo, arroz integral y aguacate',
    badge: '545 kcal · 48g Carbs',
    category: 'Balanceado',
    svgType: 'chicken',
    analysis: {
      isFoodValid: true,
      dishName: 'Pechuga de pollo a la plancha con arroz integral, aguacate y ensalada fresca',
      totalCalories: 545,
      carbsGrams: 48,
      proteinGrams: 43,
      fatGrams: 18,
      fiberGrams: 8,
      glycemicLoad: 'Baja-Media',
      healthScore: 94,
      ingredients: [
        { name: 'Pechuga de pollo a la plancha (150g)', calories: 248, carbsGrams: 0, proteinGrams: 46, fatGrams: 5 },
        { name: 'Arroz integral cocido (140g)', calories: 156, carbsGrams: 34, proteinGrams: 3, fatGrams: 1 },
        { name: 'Aguacate Hass en láminas (50g) + AOVE', calories: 105, carbsGrams: 4, proteinGrams: 1, fatGrams: 10 },
        { name: 'Ensalada fresca de tomate y hojas verdes (120g)', calories: 36, carbsGrams: 7, proteinGrams: 1, fatGrams: 0 }
      ],
      nutritionalAdvice:
        'Excelente equilibrio de macronutrientes. Los 48g de carbohidratos complejos acompañados de 8g de fibra y grasas saludables del aguacate permiten una liberación gradual de energía, mientras que los 43g de proteína favorecen el mantenimiento muscular.'
    }
  },
  {
    id: 'preset-salmon',
    title: 'Cena ligera: Salmón al horno con quinua y brócoli',
    badge: '585 kcal · 38g Carbs',
    category: 'Rico en Omega-3',
    svgType: 'salmon',
    analysis: {
      isFoodValid: true,
      dishName: 'Filete de salmón al horno con quinua, aguacate y brócoli al vapor',
      totalCalories: 585,
      carbsGrams: 38,
      proteinGrams: 42,
      fatGrams: 28,
      fiberGrams: 9,
      glycemicLoad: 'Baja',
      healthScore: 96,
      ingredients: [
        { name: 'Salmón al horno (160g)', calories: 310, carbsGrams: 0, proteinGrams: 32, fatGrams: 20 },
        { name: 'Quinua blanca cocida (120g)', calories: 144, carbsGrams: 25, proteinGrams: 5, fatGrams: 2 },
        { name: 'Aguacate Hass (60g)', calories: 96, carbsGrams: 5, proteinGrams: 1, fatGrams: 9 },
        { name: 'Brócoli y espárragos al vapor (100g)', calories: 35, carbsGrams: 7, proteinGrams: 3, fatGrams: 0 }
      ],
      nutritionalAdvice:
        'Plato rico en ácidos grasos Omega-3 y proteína de alto valor biológico. Aporta solo 29g de carbohidratos netos (descontando los 9g de fibra), ideal para cuidar la sensibilidad a la insulina en la noche.'
    }
  },
  {
    id: 'preset-oatmeal',
    title: 'Desayuno: Bowl de avena integral, yogur griego y banano',
    badge: '460 kcal · 62g Carbs',
    category: 'Alto en Fibra',
    svgType: 'oatmeal',
    analysis: {
      isFoodValid: true,
      dishName: 'Bowl de avena integral con yogur griego, banano, arándanos y chía',
      totalCalories: 460,
      carbsGrams: 62,
      proteinGrams: 24,
      fatGrams: 12,
      fiberGrams: 11,
      glycemicLoad: 'Media-Baja',
      healthScore: 91,
      ingredients: [
        { name: 'Avena integral en hojuelas (50g)', calories: 194, carbsGrams: 33, proteinGrams: 8, fatGrams: 3 },
        { name: 'Yogur griego natural sin azúcar (150g)', calories: 130, carbsGrams: 6, proteinGrams: 15, fatGrams: 4 },
        { name: 'Banano mediano en rodajas (80g)', calories: 72, carbsGrams: 18, proteinGrams: 1, fatGrams: 0 },
        { name: 'Semillas de chía y arándanos (15g)', calories: 64, carbsGrams: 5, proteinGrams: 2, fatGrams: 4 }
      ],
      nutritionalAdvice:
        'Ideal para comenzar el día o antes de realizar actividad física. Sus 11g de fibra soluble (beta-glucanos) junto con los 24g de proteína del yogur griego proporcionan saciedad prolongada.'
    }
  },
  {
    id: 'preset-burger',
    title: 'Comida rápida: Hamburguesa doble con queso y papas',
    badge: '940 kcal · 86g Carbs',
    category: 'Alta Densidad Calórica',
    svgType: 'burger',
    analysis: {
      isFoodValid: true,
      dishName: 'Hamburguesa doble con queso cheddar y porción de papas fritas',
      totalCalories: 940,
      carbsGrams: 86,
      proteinGrams: 44,
      fatGrams: 46,
      fiberGrams: 5,
      glycemicLoad: 'Alta',
      healthScore: 48,
      ingredients: [
        { name: 'Pan brioche tostado con salsas (85g)', calories: 260, carbsGrams: 46, proteinGrams: 7, fatGrams: 5 },
        { name: 'Doble carne de res + queso cheddar (180g)', calories: 390, carbsGrams: 2, proteinGrams: 33, fatGrams: 27 },
        { name: 'Papas fritas tradicionales (120g)', calories: 290, carbsGrams: 38, proteinGrams: 4, fatGrams: 14 }
      ],
      nutritionalAdvice:
        'Esta comida concentra 940 kcal, 86g de carbohidratos de rápida absorción y 46g de grasas. Puedes integrarla ocasionalmente acompañándola con agua y priorizando vegetales frescos con proteína magra en tu siguiente comida del día.'
    }
  },
  {
    id: 'preset-nonfood',
    title: 'Prueba de validación: Imagen que NO corresponde a comida',
    badge: 'Control de dominio',
    category: 'Validación de imagen',
    svgType: 'nonfood',
    analysis: {
      isFoodValid: false,
      dishName: 'La imagen seleccionada no corresponde a un plato o alimento',
      totalCalories: 0,
      carbsGrams: 0,
      proteinGrams: 0,
      fatGrams: 0,
      fiberGrams: 0,
      glycemicLoad: 'No aplica',
      healthScore: 0,
      ingredients: [],
      nutritionalAdvice:
        'Revisé la imagen con tranquilidad y noté que no muestra un alimento, bebida ni tabla nutricional. No te preocupes, puedes subir la fotografía de cualquier plato de comida cuando quieras para estimar sus calorías, carbohidratos y proteínas.'
    }
  }
];

export function getInitialDocuments() {
  return INITIAL_DOCUMENTS;
}
