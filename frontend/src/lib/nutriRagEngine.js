import { runHybridRagQuery, getInitialDocuments } from '../services/nutriRagEngine';
import { evaluateClinicalSafety } from '../services/clinicalSafetyGuard';
import {
  buildCompletePersonContext,
  generateProactiveDailyRoadmap
} from './proactiveAiEngine';
import { buildCoachContext } from './coachContextBuilder';

export * from '../services/nutriRagEngine';

function normLower(str = '') {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const EXCLUSION_PREFIX_REGEX =
  /\b(evita|evitar|evites|sin|no\s+consumas|no\s+incluyas|no\s+te\s+ponemos|excluye|excluido|excluida|exclusiones|alergia|alergico|intolerancia|limita|reemplaza|sustituye|en\s+lugar\s+de)\b/;

/**
 * Validador determinista post-LLM / post-síntesis contra alergias, dieta y alimentos excluidos.
 * NUNCA reemplaza palabras en silencio por "[plato]" (lo cual invertía frases como "Evita el queso").
 * Verifica si un término prohibido aparece de forma afirmativa (sin prefijo de exclusión en los 45 chars previos).
 */
export function validateRagAnswerAllergens(rawAnswer = '', userProfile = {}) {
  const answer = String(rawAnswer || '');
  const normAnswer = normLower(answer);

  const forbiddenTerms = [];
  const dislikedRaw = normLower(userProfile?.dislikedFoods || '')
    .split(/[,;.\n]+/)
    .map(t => t.trim())
    .filter(t => t.length >= 2);
  forbiddenTerms.push(...dislikedRaw);

  const customAllergyRaw = normLower(userProfile?.customAllergy || '')
    .split(/[,;.\n]+/)
    .map(t => t.trim())
    .filter(t => t.length >= 2);
  forbiddenTerms.push(...customAllergyRaw);

  const allergies = (userProfile?.allergies || []).map(a => normLower(a));
  const dietType = normLower(userProfile?.dietType || '');

  if (allergies.some(a => a.includes('lactosa') || a.includes('lacteo')) || dietType === 'sin_lactosa' || dietType === 'vegana') {
    forbiddenTerms.push('yogur griego', 'queso', 'leche');
  }
  if (allergies.some(a => a.includes('gluten') || a.includes('trigo')) || dietType === 'sin_gluten') {
    forbiddenTerms.push('trigo', 'pasta', 'cebada');
  }
  if (allergies.some(a => a.includes('huevo')) || dietType === 'vegana') {
    forbiddenTerms.push('huevo', 'claras');
  }
  if (allergies.some(a => a.includes('marisco') || a.includes('pescado')) || dietType === 'vegetariana' || dietType === 'vegana') {
    forbiddenTerms.push('salmon', 'trucha', 'atun', 'sardina', 'jurel', 'pescado');
  }
  if (dietType === 'vegetariana' || dietType === 'vegana') {
    forbiddenTerms.push('pechuga de pollo', 'pollo', 'carne de res');
  }

  const uniqueForbidden = [...new Set(forbiddenTerms.filter(Boolean))];
  const flaggedTerms = [];

  for (const term of uniqueForbidden) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(`(^|[^a-z0-9])${escaped}(s|es)?([^a-z0-9]|$)`, 'g');
    let match;
    let hasAffirmativeMention = false;
    while ((match = rx.exec(normAnswer)) !== null) {
      const prefix = normAnswer.slice(Math.max(0, match.index - 45), match.index);
      if (!EXCLUSION_PREFIX_REGEX.test(prefix)) {
        hasAffirmativeMention = true;
        break;
      }
    }
    if (hasAffirmativeMention) {
      flaggedTerms.push(term);
    }
  }

  const warningBanner =
    flaggedTerms.length > 0
      ? `⚠️ **Nota de seguridad de tu perfil:** Esta respuesta mencionó (${flaggedTerms.join(', ')}), que está en tus alergias, dieta o alimentos excluidos. Omite esos ingredientes y prioriza opciones 100% compatibles con tu perfil.`
      : null;

  return {
    safe: flaggedTerms.length === 0,
    flaggedTerms,
    warningBanner
  };
}

/**
 * Envuelve el validador manteniendo firma string estable sin corromper ni invertir frases existentes.
 */
export function sanitizeRagAnswerForUser(rawAnswer = '', userProfile = {}) {
  const { safe, warningBanner } = validateRagAnswerAllergens(rawAnswer, userProfile);
  if (safe || !warningBanner) return String(rawAnswer || '');
  return `${rawAnswer}\n\n${warningBanner}`;
}

/**
 * Detector determinista de banderas rojas y emergencias médicas agudas.
 * NO dispara alerta ante preguntas puramente educativas ("¿qué es la hipoglucemia?").
 */
export function evaluateAcuteMedicalEmergency(question = '') {
  const clean = normLower(question);

  const isEducationalQuestion =
    /\b(que\s+es|que\s+significa|como\s+prevenir|definicion|explica\w*|diferencia\s+entre)\b/.test(clean) &&
    !/\b(tengo|siento|estoy|me\s+dio|glucosa\s+(en|de|a)\s+[1-6][0-9]|azucar\s+(en|de|a)\s+[1-6][0-9])\b/.test(clean);

  if (
    /\b(dolor\s+de\s+pecho|dolor\s+toracico|falta\s+de\s+aire|no\s+puedo\s+respirar|desmayo|me\s+desmaye|anafilaxia|garganta\s+cerrada|labios\s+hinchados|lengua\s+hinchada|ronchas\s+y\s+ahogo)\b/.test(
      clean
    )
  ) {
    return {
      isEmergency: true,
      category: 'URGENCIA_MEDICA_AGUDA',
      answer:
        '⚠️ **Atención Médica de Urgencia Inmediata:** Los síntomas que describes (dolor de pecho, dificultad respiratoria, reacción alérgica severa/angioedema o desmayo) requieren valoración médica presencial inmediata. Por favor **acude a urgencias o llama a la línea de emergencias de tu país (123 en Colombia / 911 / 112)** ahora mismo. No ingieras alimentos ni medicamentos adicionales sin indicación del equipo de urgencias.'
    };
  }

  if (
    /\b(vomito\s+y\s+sed\s+extrema|sed\s+extrema\s+y\s+vomito|aliento\s+afrutado|cetoacidosis)\b/.test(clean)
  ) {
    return {
      isEmergency: true,
      category: 'URGENCIA_CETOACIDOSIS',
      answer:
        '⚠️ **Alerta de Urgencia Metabólica:** Síntomas como vómito persistente, sed extrema, respiración rápida o aliento afrutado pueden corresponder a una descompensación glucémica aguda (cetoacidosis). **Acude de inmediato a un servicio de urgencias médicas** para hidratación y valoración clínica.'
    };
  }

  if (
    /\b(palpitaciones\s+y\s+debilidad|debilidad\s+muscular\s+extrema\s+y\s+palpitaciones|pulso\s+muy\s+irregular\s+y\s+debilidad)\b/.test(
      clean
    )
  ) {
    return {
      isEmergency: true,
      category: 'URGENCIA_ELECTROLITICA_CARDIACA',
      answer:
        '⚠️ **Alerta Clínica Prioritaria:** La combinación de palpitaciones y debilidad muscular marcada (especialmente si tomas medicación para la presión o tienes cuidado renal) requiere valoración médica presencial urgente. **Acude a urgencias o llama a emergencias.**'
    };
  }

  if (
    !isEducationalQuestion &&
    /\b((azucar|glucosa)\s+(en|de|a)\s+[1-6][0-9]|tengo\s+hipoglucemia|me\s+bajo\s+el\s+azucar|temblor\s+y\s+sudor\s+frio)\b/.test(
      clean
    )
  ) {
    return {
      isEmergency: true,
      category: 'URGENCIA_HIPOGLUCEMIA_ADA',
      answer:
        '⚠️ **Alerta Clínica de Hipoglucemia (<70 mg/dL — Regla 15-15 ADA):** Si tu glucosa capilar está por debajo de 70 mg/dL y estás consciente, consume de inmediato **15 gramos de carbohidrato de absorción rápida** (ej. medio vaso de jugo o agua con 1 cucharada de azúcar/miel — evita chocolate o grasas porque retrasan la absorción), espera 15 minutos en reposo y vuelve a medir. Si los síntomas empeoran o no sube de 70 mg/dL, acude a urgencias médicas de inmediato.'
    };
  }

  if (/\b(hacerme\s+dano|quitarme\s+la\s+vida|suicid\w*|autolesion\w*)\b/.test(clean)) {
    return {
      isEmergency: true,
      category: 'URGENCIA_SALUD_MENTAL',
      answer:
        '💛 **No estás solo/a y tu bienestar es lo más importante:** Por favor comunícate ahora mismo con una línea gratuita de apoyo emocional y urgencias de salud (Línea 106 o 123 en Colombia / 988 en EE. UU. / 024 en España / línea de emergencias de tu localidad) o habla con un familiar o profesional de confianza en este momento.'
    };
  }

  return { isEmergency: false };
}

/**
 * Consulta inteligente del Coach IA:
 * 1) Evalúa urgencias médicas agudas y seguridad clínica (por texto y por perfil).
 * 2) Ensambla el contexto en 5 capas (`buildCoachContext`) con memoria de 14 días, historial de 6 turnos y fármacos reales.
 * 3) Intenta responder con el modelo Gemini real vía `/api/coach-chat` (Netlify AI Gateway).
 * 4) Si está offline o en test/local sin gateway, usa respaldo RAG local validado sin saturar la respuesta.
 */
export async function queryHybridRag({
  question,
  documents = getInitialDocuments(),
  aiConfig = null,
  userProfile = null,
  workspace = null,
  dailyTracking = null,
  chatHistory = []
}) {
  // 1. Verificar emergencia médica aguda
  const emergency = evaluateAcuteMedicalEmergency(question);
  if (emergency.isEmergency) {
    return {
      answer: emergency.answer,
      citations: [],
      guardrailTriggered: true,
      emergencyCategory: emergency.category,
      recommendedMeal: null,
      usedFacts: ['Detector de señales clínicas de urgencia médica'],
      mode: 'emergency-guard'
    };
  }

  // 2. Verificar seguridad clínica por consulta Y por perfil (embarazo, TCA, menor de 18, DM1, <1200 kcal)
  const safety = evaluateClinicalSafety(question, userProfile);
  if (safety.blocked) {
    return {
      answer: safety.referralMessage,
      citations: [],
      guardrailTriggered: true,
      safetyReferral: true,
      recommendedMeal: null,
      usedFacts: ['Protección clínica del perfil y seguridad alimentaria'],
      mode: 'clinical-safety-guard'
    };
  }

  const ctx = buildCompletePersonContext(userProfile || {}, workspace || {});
  const roadmap = generateProactiveDailyRoadmap(userProfile || {}, workspace || {});
  const coachCtx = buildCoachContext({
    question,
    userProfile: userProfile || {},
    workspace: workspace || {},
    chatHistory
  });

  // 3. Intentar llamar al LLM real en servidor (/api/coach-chat) cuando estamos en navegador
  const isTestEnv = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test';
  if (!isTestEnv && typeof fetch === 'function' && typeof window !== 'undefined') {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 16000);
      const res = await fetch('/api/coach-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          intent: coachCtx.intent,
          coachContext: coachCtx.promptPayload,
          chatHistory: coachCtx.recentConversation
        }),
        signal: controller.signal
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        if (data?.answer) {
          const checked = sanitizeRagAnswerForUser(data.answer, userProfile || {});
          return {
            answer: checked,
            citations: [],
            guardrailTriggered: false,
            intent: coachCtx.intent,
            recommendedMeal: coachCtx.intent === 'meal_suggestion' ? roadmap.recommendedMeal : null,
            usedFacts: coachCtx.usedFacts,
            mode: 'gemini-coach-llm'
          };
        }
      }
    } catch {
      // Respaldo transparente al motor RAG local si no hay gateway activo en local
    }
  }

  // 4. Respaldo determinista local (sin enviar nombre ni email, y sin pegar bloques largos innecesarios)
  const drugNotes = (roadmap.drugNutrientInteractions || [])
    .map(d => `${d.medications}: ${d.interactionRule}`)
    .join(' | ');

  const anonymizedProfile = {
    ...(userProfile || {}),
    name: 'Paciente',
    email: '[REDACTED_PII]',
    medicalConditions: roadmap.protocols.map(p => p.id),
    physicalNotes: [
      `País: ${ctx.country.name}`,
      `Tipo de dieta: ${userProfile?.dietType || 'omnívora'}`,
      (userProfile?.allergies || []).length ? `Alergias estrictas: ${userProfile.allergies.join(', ')}` : '',
      userProfile?.dislikedFoods ? `Alimentos que NO le gustan: ${userProfile.dislikedFoods}` : '',
      drugNotes ? `Farmacovigilancia: ${drugNotes}` : ''
    ]
      .filter(Boolean)
      .join(' · ')
  };

  const mergedTracking = {
    consumedKcal: ctx.consumed.kcal,
    consumedCarbs: ctx.consumed.carbs,
    consumedProtein: ctx.consumed.protein,
    consumedFat: ctx.consumed.fat,
    waterTodayMl: ctx.waterTodayMl,
    ...(dailyTracking || {})
  };

  const memoryContext = {
    memoryPromptSummary: `Siguiente comida sugerida (${roadmap.nextMealType}): ${roadmap.recommendedMeal.dishName} (${roadmap.recommendedMeal.kcal} kcal, ${roadmap.recommendedMeal.protein}g proteína).`
  };

  const baseResult = await runHybridRagQuery(
    question,
    documents,
    aiConfig,
    anonymizedProfile,
    mergedTracking,
    memoryContext
  );

  if (!baseResult.guardrailTriggered && userProfile) {
    const check = validateRagAnswerAllergens(baseResult.answer, userProfile);
    let finalAnswer = baseResult.answer;

    // Si la plantilla local mencionó un alimento prohibido, sustituir por la recomendación segura real
    if (!check.safe) {
      finalAnswer = `Para cuidar tus preferencias y alergias (${check.flaggedTerms.join(', ')}), te sugiero optar por **${roadmap.recommendedMeal.dishName}** (${roadmap.recommendedMeal.kcal} kcal · ${roadmap.recommendedMeal.protein}g proteína · ${roadmap.recommendedMeal.fiber}g fibra), 100% compatible con tu perfil actual.`;
    }

    // Añadir farmacovigilancia breve SOLO si la consulta trata de medicamentos o hay fármacos declarados y relevantes
    if (coachCtx.intent === 'drug_interaction' && roadmap.drugNutrientInteractions?.length > 0) {
      const drugLine = roadmap.drugNutrientInteractions
        .map(d => `- **${d.medications} (${d.source}):** ${d.interactionRule}`)
        .join('\n');
      finalAnswer = `${finalAnswer}\n\n**Interacciones alimento-medicamento declaradas:**\n${drugLine}`;
    }

    return {
      ...baseResult,
      answer: finalAnswer,
      intent: coachCtx.intent,
      recommendedMeal: coachCtx.intent === 'meal_suggestion' ? roadmap.recommendedMeal : null,
      usedFacts: coachCtx.usedFacts,
      mode: baseResult.tokenMetrics?.mode || 'rag-local-0-tokens'
    };
  }

  return {
    ...baseResult,
    intent: coachCtx.intent,
    usedFacts: coachCtx.usedFacts
  };
}
