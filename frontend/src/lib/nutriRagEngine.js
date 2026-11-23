import { runHybridRagQuery, getInitialDocuments } from '../services/nutriRagEngine';
import { buildCompletePersonContext, generateProactiveDailyRoadmap } from './proactiveAiEngine';

export * from '../services/nutriRagEngine';

/**
 * Consulta RAG enriquecida con el contexto completo de los 13 puntos del onboarding,
 * alergias, alimentos que no le gustan, protocolos clínicos activos (ADA, DASH, OMS, ISSN, ESPEN)
 * y lo que la persona ha comido o bebido hoy.
 */
export async function queryHybridRag({
  question,
  documents = getInitialDocuments(),
  aiConfig = null,
  userProfile = null,
  workspace = null,
  dailyTracking = null
}) {
  const ctx = buildCompletePersonContext(userProfile || {}, workspace || {});
  const roadmap = generateProactiveDailyRoadmap(userProfile || {}, workspace || {});

  const enrichedProfile = {
    ...(userProfile || {}),
    medicalConditions: roadmap.protocols.map(p => p.id),
    physicalNotes: [
      `Ciudad: ${userProfile?.city || ctx.country.name}`,
      `Tipo de dieta: ${userProfile?.dietType || 'omnívora'}`,
      (userProfile?.allergies || []).length ? `Alergias: ${userProfile.allergies.join(', ')}` : '',
      userProfile?.customAllergy ? `Intolerancia adicional: ${userProfile.customAllergy}` : '',
      userProfile?.dislikedFoods ? `Alimentos que NO le gustan (no recomendar): ${userProfile.dislikedFoods}` : '',
      `Tiempo para cocinar: ${ctx.cookingTimeLabel}`,
      `Comidas al día: ${userProfile?.mealsPerDay || 4} (${userProfile?.mealSchedule || 'horarios estándar'})`,
      `Protocolos clínicos activos: ${roadmap.protocols.map(p => `${p.label} [${p.source}]`).join('; ')}`
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
    enrichedProfile,
    mergedTracking,
    memoryContext
  );

  // Añadir bloque clínico personalizado al final si la consulta es válida
  if (!baseResult.guardrailTriggered && userProfile) {
    const protocolNote = roadmap.protocols[0]
      ? `\n\n**Respaldo clínico para tu perfil (${roadmap.protocols[0].source}):** ${roadmap.protocols[0].keyRules}${
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
