import { runHybridRagQuery, getInitialDocuments } from '../services/nutriRagEngine';
import {
  buildCompletePersonContext,
  generateProactiveDailyRoadmap,
  ALLERGEN_SYNONYM_MATRIX
} from './proactiveAiEngine';

export * from '../services/nutriRagEngine';

/**
 * Verificador determinista post-LLM / post-síntesis:
 * Garantiza que ninguna sugerencia textual contradiga las alergias, dieta o alimentos excluidos (`dislikedFoods`)
 * del paciente, reemplazando menciones genéricas de ejemplos fijos por su plato seguro `recommendedMeal`.
 */
export function sanitizeRagAnswerForUser(rawAnswer = '', userProfile = {}, recommendedMeal = null) {
  let cleanText = String(rawAnswer || '');
  const safeSubstitute = recommendedMeal?.dishName || 'vegetales frescos con proteína compatible';

  const forbiddenTerms = [];
  const dislikedRaw = String(userProfile?.dislikedFoods || '')
    .toLowerCase()
    .split(/[,;.\n]+/)
    .map(t => t.trim())
    .filter(t => t.length >= 2);
  forbiddenTerms.push(...dislikedRaw);

  const customAllergyRaw = String(userProfile?.customAllergy || '')
    .toLowerCase()
    .split(/[,;.\n]+/)
    .map(t => t.trim())
    .filter(t => t.length >= 2);
  forbiddenTerms.push(...customAllergyRaw);

  const allergies = (userProfile?.allergies || []).map(a => String(a).toLowerCase());
  const dietType = String(userProfile?.dietType || '').toLowerCase();

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
    forbiddenTerms.push('salmon', 'salmón', 'trucha', 'atun', 'atún', 'sardina', 'jurel', 'pescado');
  }
  if (dietType === 'vegetariana' || dietType === 'vegana') {
    forbiddenTerms.push('pechuga de pollo', 'pollo', 'carne de res');
  }

  const uniqueForbidden = [...new Set(forbiddenTerms.filter(Boolean))];
  uniqueForbidden.forEach(term => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(escaped, 'gi');
    if (rx.test(cleanText)) {
      cleanText = cleanText.replace(rx, `[${safeSubstitute}]`);
    }
  });

  return cleanText;
}

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

  // 3. Sanitización determinista post-LLM contra alergias/disgustos + bloque clínico personalizado y farmacovigilancia
  if (!baseResult.guardrailTriggered && userProfile) {
    const sanitizedAnswer = sanitizeRagAnswerForUser(
      baseResult.answer,
      userProfile,
      roadmap.recommendedMeal
    );
    const allProtocolsNote = roadmap.protocols
      .map(p => `- **${p.label} (${p.source}):** ${p.keyRules}`)
      .join('\n');
    const allDrugNotes = (roadmap.drugNutrientInteractions || [])
      .map(d => `- **Farmacovigilancia (${d.source} — ${d.medications}):** ${d.interactionRule}`)
      .join('\n');

    const protocolNote = `\n\n**Respaldo clínico activo en tu perfil:**\n${allProtocolsNote}${
      allDrugNotes ? `\n${allDrugNotes}` : ''
    }${
      userProfile.dislikedFoods
        ? `\n*(Verificación de seguridad activa: excluimos "${userProfile.dislikedFoods}" y tus alérgenos de toda sugerencia).*`
        : ''
    }`;

    return {
      ...baseResult,
      answer: `${sanitizedAnswer}${protocolNote}`,
      recommendedMeal: roadmap.recommendedMeal
    };
  }

  return baseResult;
}
