// Ensamblador de Contexto en 5 Capas para el Coach IA Real (NutriStudio AI)
// Principio: "Guardar mucho, enviar al modelo lo relevante sin recortar seguridad, mostrar poco."

import { getCountryProfile, getBudgetProfile } from '../services/countryNutritionData';
import {
  resolveUserClinicalProtocols,
  resolveDrugNutrientInteractions,
  analyzeDayClinicalMetrics,
  normalizeVoluntaryLabValues,
  buildCompletePersonContext
} from './proactiveAiEngine';

function normText(str = '') {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Enrutador determinista de intención del usuario para seleccionar módulos de contexto
 * sin saturar la ventana del modelo ni mostrar tarjetas irrelevantes.
 */
export function detectCoachIntent(question = '') {
  const clean = normText(question);

  if (
    /\b(que\s+(?:puedo\s+|debo\s+|me\s+\w+\s+)?(?:com\w*|cen\w*|desayun\w*|almorz\w*|almuerz\w*|merend\w*)|receta|plato|menu|reemplaz\w*|cambiame\s+un\s+ingrediente|(?:opcion\w*|idea\w*|sugerencia\w*)\s+(?:de|para)\s+(?:desayun\w*|almuerz\w*|almorz\w*|cen\w*|com\w*|merend\w*)|(?:que|algo)\s+para\s+(?:desayunar|almorzar|cenar|merendar|comer))\b/.test(
      clean
    )
  ) {
    return 'meal_suggestion';
  }

  if (
    /\b(medicamento|pastilla|farmaco|levotiroxina|metformina|insulina|losartan|enalapril|warfarina|estatina|atorvastatina|toronja|pomelo|hierro\s+oral|interaccion)\b/.test(
      clean
    )
  ) {
    return 'drug_interaction';
  }

  if (
    /\b(glucosa|hba1c|colesterol|ldl|triglicerido|presion|hemoglobina|examen|laboratorio|analisis\s+de\s+sangre)\b/.test(
      clean
    )
  ) {
    return 'clinical_labs';
  }

  return 'general';
}

/**
 * Función pura que resume los últimos 7–14 días reales del usuario:
 * adherencia, promedios diarios, comidas que suele omitir, tendencia cronológica de peso
 * y su último chequeo rápido de bienestar (10s).
 */
export function computeRecentWindowSummary(workspace = {}, days = 14) {
  const allMeals = Array.isArray(workspace?.mealLogs) ? workspace.mealLogs : [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffIso = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(
    cutoff.getDate()
  ).padStart(2, '0')}`;

  const windowMeals = allMeals.filter(m => !m.date || m.date >= cutoffIso);
  const dayMap = new Map();

  windowMeals.forEach(m => {
    const key = m.date || 'sin-fecha';
    const prev = dayMap.get(key) || { kcal: 0, protein: 0, fiber: 0, types: new Set() };
    prev.kcal += Number(m.kcal ?? m.totalCalories) || 0;
    prev.protein += Number(m.protein ?? m.proteinGrams) || 0;
    prev.fiber += Number(m.fiber ?? m.fiberGrams) || 0;
    if (m.mealType) prev.types.add(m.mealType);
    dayMap.set(key, prev);
  });

  const activeDays = dayMap.size;
  let sumKcal = 0;
  let sumProt = 0;
  let sumFiber = 0;
  const mealTypeCounts = { Desayuno: 0, Almuerzo: 0, Merienda: 0, Cena: 0 };

  dayMap.forEach(d => {
    sumKcal += d.kcal;
    sumProt += d.protein;
    sumFiber += d.fiber;
    Object.keys(mealTypeCounts).forEach(t => {
      if (d.types.has(t)) mealTypeCounts[t] += 1;
    });
  });

  const skippedMealTypes =
    activeDays >= 2
      ? Object.entries(mealTypeCounts)
          .filter(([, count]) => count < activeDays * 0.4)
          .map(([t]) => t)
      : [];

  // Orden cronológico real por fecha para tendencia de peso
  const sortedWeights = [...(Array.isArray(workspace?.weightHistory) ? workspace.weightHistory : [])]
    .filter(w => Number(w?.weightKg) > 0)
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));

  const weightTrendKg =
    sortedWeights.length >= 2
      ? Number((sortedWeights[sortedWeights.length - 1].weightKg - sortedWeights[0].weightKg).toFixed(1))
      : null;

  const checkIns = Array.isArray(workspace?.wellnessCheckIns) ? workspace.wellnessCheckIns : [];
  const latestCheckIn = checkIns.length > 0 ? checkIns[checkIns.length - 1] : null;

  return {
    windowDays: days,
    activeDays,
    avgDailyKcal: activeDays > 0 ? Math.round(sumKcal / activeDays) : 0,
    avgDailyProtein: activeDays > 0 ? Math.round(sumProt / activeDays) : 0,
    avgDailyFiber: activeDays > 0 ? Math.round(sumFiber / activeDays) : 0,
    skippedMealTypes,
    weightTrendKg,
    latestWeightKg: sortedWeights.length > 0 ? sortedWeights[sortedWeights.length - 1].weightKg : null,
    latestCheckIn
  };
}

/**
 * Construye el paquete completo de contexto en 5 capas para el Coach IA:
 * 1) safetyAndStableFicha (NUNCA se recorta: alergias, dieta, disgustos, etapa clínica, fármacos, notas confirmadas)
 * 2) recentSummary14d (resumen calculado de 14 días)
 * 3) todaySnapshot (hoy + cobertura real de micronutrientes, sin inventar cifras)
 * 4) recentConversation (últimos 6 mensajes para soporte multi-turno)
 * 5) routedKnowledge (solo las 1-3 fichas clínicas relevantes según intención)
 */
export function buildCoachContext({
  question = '',
  userProfile = {},
  workspace = {},
  chatHistory = [],
  currentHour = new Date().getHours()
}) {
  const intent = detectCoachIntent(question);
  const ctx = buildCompletePersonContext(userProfile || {}, workspace || {}, currentHour);
  const protocols = resolveUserClinicalProtocols(userProfile || {});
  const drugInteractions = resolveDrugNutrientInteractions(protocols, userProfile || {});
  const labs = normalizeVoluntaryLabValues(userProfile?.voluntaryClinicalHistory);
  const dayMetrics = analyzeDayClinicalMetrics({ dayLogs: ctx.todayMeals, userProfile: userProfile || {} });
  const recentSummary14d = computeRecentWindowSummary(workspace || {}, 14);
  const country = getCountryProfile(userProfile?.country || 'CO');
  const budget = getBudgetProfile(userProfile?.budgetTier || 'equilibrado');

  const aiMemoryFacts = Array.isArray(workspace?.aiMemoryFacts)
    ? workspace.aiMemoryFacts.map(f => f.text).filter(Boolean).slice(0, 8)
    : [];

  // Capa 1: Ficha estable y seguridad (NUNCA recortable)
  const safetyAndStableFicha = {
    ageStage: Number(userProfile?.age) < 18 ? 'menor_18' : Number(userProfile?.age) >= 65 ? 'adulto_mayor' : 'adulto',
    safetyAdvisoryActive: Boolean(userProfile?.safetyAdvisoryActive),
    hideCalorieNumbersMode: Boolean(userProfile?.hideCalorieNumbersMode),
    dietType: userProfile?.dietType || 'omnivora',
    allergies: Array.isArray(userProfile?.allergies) ? userProfile.allergies.filter(a => a !== 'Ninguna') : [],
    customAllergy: userProfile?.customAllergy || '',
    dislikedFoods: userProfile?.dislikedFoods || '',
    declaredConditions: Array.isArray(userProfile?.healthConditions) ? userProfile.healthConditions : [],
    declaredMedications: labs?.medications || userProfile?.medications || '',
    drugInteractions: drugInteractions.map(d => ({
      medications: d.medications,
      rule: d.interactionRule,
      source: d.source
    })),
    voluntaryLabs: labs
      ? {
          examDate: labs.examDate || null,
          isStale: labs.isStale,
          fastingGlucoseMgDl: labs.fastingGlucoseMgDl,
          hba1cPct: labs.hba1cPct,
          ldlMgDl: labs.ldlMgDl,
          triglyceridesMgDl: labs.triglyceridesMgDl,
          bloodPressure: labs.bloodPressure || null,
          hemoglobinGDl: labs.hemoglobinGDl
        }
      : null,
    country: country.name,
    city: userProfile?.city || '',
    budget: budget.id,
    cookingTime: ctx.cookingTimeLabel,
    userConfirmedFacts: aiMemoryFacts
  };

  // Capa 3: Estado real de hoy (con cobertura verificada)
  const todaySnapshot = {
    todayIso: ctx.todayIso,
    currentHour,
    profileConfigured: ctx.profileConfigured,
    goals: ctx.profileConfigured ? ctx.goals : null,
    consumed: ctx.consumed,
    remaining: ctx.profileConfigured ? ctx.remaining : null,
    waterGlassesToday: ctx.waterGlassesToday,
    loggedMealTypes: ctx.loggedMealTypes,
    clinicalTotals: dayMetrics.totals,
    micronutrientCoverage: dayMetrics.coverage,
    glycemicLoadLevel: dayMetrics.glycemicLoadLevel,
    clinicalFindings: dayMetrics.clinicalFindings
  };

  // Capa 4: Memoria conversacional (últimos 6 turnos reales, excluyendo solo saludo inicial si sobra)
  const recentConversation = (Array.isArray(chatHistory) ? chatHistory : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && m.text)
    .slice(-6)
    .map(m => ({
      role: m.role,
      text: String(m.text).slice(0, 450)
    }));

  // Capa 5: Conocimiento enrutado por intención (máximo 3 fichas concretas)
  const routedKnowledge = {
    protocols: protocols.slice(0, 3).map(p => ({
      label: p.label,
      source: p.source,
      keyRules: p.keyRules,
      alertRule: p.alertRule
    }))
  };

  // Transparencia ("¿Por qué me dices esto?"): lista breve de 2-4 datos reales usados
  const usedFacts = [];
  if (safetyAndStableFicha.dietType !== 'omnivora') {
    usedFacts.push(`Estilo de alimentación: ${safetyAndStableFicha.dietType}`);
  }
  if (safetyAndStableFicha.allergies.length > 0) {
    usedFacts.push(`Alergias excluidas: ${safetyAndStableFicha.allergies.join(', ')}`);
  }
  if (safetyAndStableFicha.dislikedFoods) {
    usedFacts.push(`Excluye por gusto: ${safetyAndStableFicha.dislikedFoods}`);
  }
  if (safetyAndStableFicha.declaredMedications) {
    usedFacts.push(`Medicamentos declarados: ${safetyAndStableFicha.declaredMedications}`);
  }
  if (labs && !labs.isStale && (labs.fastingGlucoseMgDl || labs.hba1cPct || labs.ldlMgDl || labs.bloodPressure)) {
    usedFacts.push(`Exámenes de laboratorio vigentes (${labs.examDate || 'recientes'})`);
  }
  if (ctx.todayMeals.length > 0) {
    usedFacts.push(`Registro de hoy: ${ctx.todayMeals.length} comida(s), ${ctx.consumed.kcal} kcal`);
  }
  if (recentSummary14d.latestCheckIn) {
    usedFacts.push(
      `Chequeo reciente: energía ${recentSummary14d.latestCheckIn.energy}/5, sueño ${recentSummary14d.latestCheckIn.sleepHours}h`
    );
  }
  if (usedFacts.length === 0) {
    usedFacts.push(`País y entorno: ${country.name} · Protocolo base: ${protocols[0]?.source}`);
  }

  const promptPayload = {
    intent,
    safetyAndStableFicha,
    recentSummary14d,
    todaySnapshot,
    routedKnowledge
  };

  return {
    intent,
    safetyAndStableFicha,
    recentSummary14d,
    todaySnapshot,
    recentConversation,
    routedKnowledge,
    usedFacts: usedFacts.slice(0, 4),
    promptPayload
  };
}
