import { runHybridRagQuery, getInitialDocuments } from '../services/nutriRagEngine';
import { buildCompletePersonContext, generateProactiveDailyRoadmap } from './proactiveAiEngine';

export * from '../services/nutriRagEngine';

/**
 * Detector determinista de banderas rojas y emergencias médicas agudas.
 * Si detecta dolor torácico, síncope/desmayo, hipoglucemia severa (<70 mg/dL),
 * anafilaxia o crisis de autolesión, detiene la recomendación dietética y
 * entrega protocolo de urgencia médica inmediata.
 */
export function evaluateAcuteMedicalEmergency(question = '') {
  const clean = String(question || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (
    /\b(dolor\s+de\s+pecho|dolor\s+toracico|falta\s+de\s+aire|no\s+puedo\s+respirar|desmayo|me\s+desmaye|anafilaxia|garganta\s+cerrada)\b/.test(
      clean
    )
  ) {
    return {
      isEmergency: true,
      category: 'URGENCIA_MEDICA_AGUDA',
      answer:
        '⚠️ **Atención Médica de Urgencia Inmediata:** Los síntomas que describes (dolor de pecho, dificultad respiratoria, reacción alérgica severa o desmayo) requieren valoración médica presencial inmediata. Por favor **acude a urgencias o llama a la línea de emergencias de tu país (123 en Colombia / 911 / 112)** ahora mismo. No ingieras alimentos ni medicamentos adicionales sin indicación del equipo de urgencias.'
    };
  }

  if (/\b(hipoglucemia|azucar\s+en\s+[1-6][0-9]|glucosa\s+en\s+[1-6][0-9]|temblor\s+y\s+sudor\s+frio)\b/.test(clean)) {
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
 * Consulta RAG enriquecida con el contexto completo de los 13 puntos del onboarding,
 * alergias, alimentos que no le gustan, protocolos clínicos activos (ADA, DASH, OMS, ISSN, ESPEN, KDIGO, ATA, ESHRE),
 * interacciones fármaco-nutriente y minimización de datos personales (sin enviar nombre ni email al LLM externo).
 */
export async function queryHybridRag({
  question,
  documents = getInitialDocuments(),
  aiConfig = null,
  userProfile = null,
  workspace = null,
  dailyTracking = null
}) {
  // 1. Verificar primero si es una emergencia médica aguda
  const emergency = evaluateAcuteMedicalEmergency(question);
  if (emergency.isEmergency) {
    return {
      answer: emergency.answer,
      citations: [],
      guardrailTriggered: true,
      emergencyCategory: emergency.category,
      recommendedMeal: null
    };
  }

  const ctx = buildCompletePersonContext(userProfile || {}, workspace || {});
  const roadmap = generateProactiveDailyRoadmap(userProfile || {}, workspace || {});
  const drugNotes = (roadmap.drugNutrientInteractions || [])
    .map(d => `${d.medications}: ${d.interactionRule}`)
    .join(' | ');

  // 2. Minimización de PII (Ley 1581 / GDPR Art. 9): Nunca enviamos email ni nombre completo real al motor LLM externo
  const anonymizedProfile = {
    ...(userProfile || {}),
    name: 'Paciente',
    email: '[REDACTED_PII]',
    medicalConditions: roadmap.protocols.map(p => p.id),
    physicalNotes: [
      `País: ${ctx.country.name}`,
      `Tipo de dieta: ${userProfile?.dietType || 'omnívora'}`,
      (userProfile?.allergies || []).length ? `Alergias estrictas: ${userProfile.allergies.join(', ')}` : '',
      userProfile?.customAllergy ? `Intolerancia adicional: ${userProfile.customAllergy}` : '',
      userProfile?.dislikedFoods ? `Alimentos que NO le gustan (excluir): ${userProfile.dislikedFoods}` : '',
      `Tiempo para cocinar: ${ctx.cookingTimeLabel}`,
      `Comidas al día: ${userProfile?.mealsPerDay || 4} (${userProfile?.mealSchedule || 'horarios estándar'})`,
      `Protocolos clínicos activos: ${roadmap.protocols.map(p => `${p.label} [${p.source}]`).join('; ')}`,
      drugNotes ? `Farmacovigilancia alimento-medicamento: ${drugNotes}` : ''
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
    memoryPromptSummary: `Guía proactiva actual (${roadmap.timeWindowLabel}): Siguiente comida sugerida (${roadmap.nextMealType}): ${roadmap.recommendedMeal.dishName} (${roadmap.recommendedMeal.kcal} kcal, ${roadmap.recommendedMeal.protein}g proteína). Faltan hoy ${ctx.remaining.kcal} kcal, ${ctx.remaining.protein}g proteína y ${ctx.remaining.waterGlasses} vasos de agua.`
  };

  const baseResult = await runHybridRagQuery(
    question,
    documents,
    aiConfig,
    anonymizedProfile,
    mergedTracking,
    memoryContext
  );

  // 3. Añadir bloque clínico personalizado y farmacovigilancia al final si la consulta es válida
  if (!baseResult.guardrailTriggered && userProfile) {
    const protocolNote = roadmap.protocols[0]
      ? `\n\n**Respaldo clínico para tu perfil (${roadmap.protocols[0].source}):** ${roadmap.protocols[0].keyRules}${
          roadmap.drugNutrientInteractions?.[0]
            ? `\n**Nota de farmacovigilancia (${roadmap.drugNutrientInteractions[0].source}):** ${roadmap.drugNutrientInteractions[0].interactionRule}`
            : ''
        }${
          userProfile.dislikedFoods
            ? ` *(Recuerda que hemos excluido "${userProfile.dislikedFoods}" de todas tus recomendaciones).*`
            : ''
        }`
      : '';
    return {
      ...baseResult,
      answer: `${baseResult.answer}${protocolNote}`,
      recommendedMeal: roadmap.recommendedMeal
    };
  }

  return baseResult;
}
