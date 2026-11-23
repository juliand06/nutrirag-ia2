// Motor de Cálculo Nutricional y Reglas de Seguridad Clínica (TMB, GET, IMC, Macros, Agua)
// Reutiliza y extiende la lógica de Mifflin-St Jeor en src/services/userStorage.js y countryNutritionData.js

import { calculateRecommendedTargets, GOAL_OPTIONS } from '../services/userStorage';
import { computeMetabolicMetrics, getCountryProfile, getBudgetProfile } from '../services/countryNutritionData';
import { evaluateClinicalSafety, MIN_SAFE_DAILY_KCAL } from '../services/clinicalSafetyGuard';

export { calculateRecommendedTargets, GOAL_OPTIONS, computeMetabolicMetrics, evaluateClinicalSafety, MIN_SAFE_DAILY_KCAL };

export const ONBOARDING_GOALS = [
  {
    id: 'deficit_calorico',
    title: 'Bajar de peso con calma',
    subtitle: 'Sin pasar hambre ni dejar la comida de tu casa',
    kcalDelta: -380,
    carbsRatio: 0.40,
    proteinRatio: 0.32,
    fatRatio: 0.28
  },
  {
    id: 'mantenimiento',
    title: 'Mantener mi peso actual',
    subtitle: 'Sentirme con buena energía durante todo el día',
    kcalDelta: 0,
    carbsRatio: 0.45,
    proteinRatio: 0.27,
    fatRatio: 0.28
  },
  {
    id: 'masa_muscular',
    title: 'Ganar fuerza y músculo',
    subtitle: 'Aumentar proteína y energía limpia para entrenar',
    kcalDelta: 320,
    carbsRatio: 0.47,
    proteinRatio: 0.29,
    fatRatio: 0.24
  },
  {
    id: 'comer_saludable',
    title: 'Comer más saludable y variado',
    subtitle: 'Aprender a armar mejores platos en el día a día',
    kcalDelta: 0,
    carbsRatio: 0.45,
    proteinRatio: 0.27,
    fatRatio: 0.28
  },
  {
    id: 'control_condicion',
    title: 'Cuidar una condición de salud',
    subtitle: 'Azúcar, presión o colesterol con alimentos reales',
    kcalDelta: -150,
    carbsRatio: 0.36,
    proteinRatio: 0.32,
    fatRatio: 0.32
  }
];

export const ACTIVITY_LEVELS = [
  {
    id: 'sedentario',
    title: 'Tranquilo / Oficina',
    example: 'Trabajo sentado, camino poco y casi no hago ejercicio formal.',
    multiplier: 1.2
  },
  {
    id: 'ligero',
    title: 'Algo de movimiento',
    example: 'Camino al hacer vueltas, saco al perro o entreno 1 a 2 días por semana.',
    multiplier: 1.375
  },
  {
    id: 'moderado',
    title: 'Activo en la semana',
    example: 'Hago ejercicio 3 a 5 veces por semana o mi trabajo me mantiene de pie.',
    multiplier: 1.55
  },
  {
    id: 'intenso',
    title: 'Muy activo',
    example: 'Entreno fuerte 6+ días por semana o tengo un trabajo físico exigente.',
    multiplier: 1.725
  }
];

export function convertToMetric({
  heightUnit = 'cm',
  heightCm = 168,
  heightFeet = 5,
  heightInches = 6,
  weightUnit = 'kg',
  weightVal = 68,
  targetWeightVal = 64
}) {
  const finalHeightCm =
    heightUnit === 'ft'
      ? Math.round(((Number(heightFeet) || 5) * 12 + (Number(heightInches) || 0)) * 2.54)
      : Math.round(Number(heightCm) || 168);

  const finalWeightKg =
    weightUnit === 'lb'
      ? Number(((Number(weightVal) || 150) / 2.20462).toFixed(1))
      : Number(Number(weightVal || 68).toFixed(1));

  const finalTargetWeightKg =
    weightUnit === 'lb'
      ? Number(((Number(targetWeightVal) || 140) / 2.20462).toFixed(1))
      : Number(Number(targetWeightVal || finalWeightKg).toFixed(1));

  return {
    heightCm: Math.max(110, Math.min(230, finalHeightCm)),
    weightKg: Math.max(30, Math.min(260, finalWeightKg)),
    targetWeightKg: Math.max(30, Math.min(260, finalTargetWeightKg))
  };
}

/**
 * Evalúa las reglas de seguridad obligatorias del onboarding:
 * - Menor de 18 años
 * - Embarazo o lactancia
 * - Antecedente o indicación de trastorno alimentario (TCA)
 * - Cálculo que daría menos de 1.200 kcal
 */
export function buildPersonalizedNutritionSummary(onboardingData = {}) {
  const { heightCm, weightKg, targetWeightKg } = convertToMetric(onboardingData);
  const age = Number(onboardingData.age) || 28;
  const sex = onboardingData.sex || 'femenino';
  const activityLevel = onboardingData.activityLevel || 'moderado';
  const rawGoal = onboardingData.goal || 'comer_saludable';
  const conditions = Array.isArray(onboardingData.healthConditions) ? onboardingData.healthConditions : [];
  const allergies = Array.isArray(onboardingData.allergies) ? onboardingData.allergies : [];
  const customConditionText = `${onboardingData.customAllergy || ''} ${onboardingData.dislikedFoods || ''}`.toLowerCase();

  const sexOffset = sex === 'masculino' ? 5 : sex === 'femenino' ? -161 : -78;
  const bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + sexOffset);
  const actObj = ACTIVITY_LEVELS.find(a => a.id === activityLevel) || ACTIVITY_LEVELS[2];
  const tdee = Math.round(bmr * actObj.multiplier);

  const goalObj = ONBOARDING_GOALS.find(g => g.id === rawGoal) || ONBOARDING_GOALS[1];
  const rawSuggestedCalories = Math.round(tdee + goalObj.kcalDelta);

  // Reglas de seguridad clínica
  const isMinor = age < 18;
  const isPregnantOrLactating =
    conditions.includes('embarazo_lactancia') ||
    /embaraz|lactan|gestaci/.test(customConditionText);
  const hasEatingDisorder =
    conditions.includes('tca') ||
    /anorexia|bulimia|atracon|tca|trastorno aliment/.test(customConditionText);
  const wouldBeUnder1200 = rawSuggestedCalories < MIN_SAFE_DAILY_KCAL;

  const safetyReasons = [];
  if (isMinor) {
    safetyReasons.push('Eres menor de 18 años y tu cuerpo está en una etapa clave de crecimiento.');
  }
  if (isPregnantOrLactating) {
    safetyReasons.push('Indicaste embarazo o lactancia, una etapa donde tus necesidades de energía y micronutrientes requieren guía médica personalizada.');
  }
  if (hasEatingDisorder) {
    safetyReasons.push('Indicaste antecedentes o inquietudes sobre la relación con la comida, donde tu bienestar emocional y acompañamiento profesional van primero.');
  }
  if (wouldBeUnder1200 && (rawGoal === 'deficit_calorico' || rawGoal === 'control_condicion')) {
    safetyReasons.push('Un plan de reducción para tus datos bajaría de 1.200 kcal al día, lo cual no es seguro ni sostenible.');
  }

  const safetyAdvisoryActive =
    isMinor || isPregnantOrLactating || hasEatingDisorder || (wouldBeUnder1200 && rawGoal === 'deficit_calorico');

  // Si se activa la regla de seguridad, no mostramos plan de pérdida de peso: ofrecemos mantenimiento saludable (>= 1.200 kcal) y modo educativo
  const safeDailyCalories = safetyAdvisoryActive
    ? Math.max(MIN_SAFE_DAILY_KCAL, tdee)
    : Math.max(MIN_SAFE_DAILY_KCAL, rawSuggestedCalories);

  const effectiveGoalObj = safetyAdvisoryActive ? ONBOARDING_GOALS[3] : goalObj;

  const targetCarbs = Math.round((safeDailyCalories * effectiveGoalObj.carbsRatio) / 4);
  const targetProtein = Math.round((safeDailyCalories * effectiveGoalObj.proteinRatio) / 4);
  const targetFat = Math.round((safeDailyCalories * effectiveGoalObj.fatRatio) / 9);
  const waterGoalMl = Math.max(1750, Math.round(weightKg * 35));
  const waterGlasses = Math.max(7, Math.round(waterGoalMl / 250));

  const heightM = heightCm / 100;
  const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));
  const bmiExplanation =
    bmi < 18.5
      ? 'Tu relación peso-estatura sugiere que tu cuerpo se beneficiará de platos nutritivos y densos en energía real.'
      : bmi < 25
        ? 'Tu relación peso-estatura está en un rango de equilibrio general; nos enfocaremos en calidad de alimentos y energía diaria.'
        : 'Tu relación peso-estatura es solo un punto de partida orientativo (no mide músculo ni hábitos); iremos paso a paso con comida saciante y real.';

  const country = getCountryProfile(onboardingData.country || 'CO');
  const budget = getBudgetProfile(onboardingData.budgetTier || 'equilibrado');

  return {
    heightCm,
    weightKg,
    targetWeightKg: safetyAdvisoryActive ? weightKg : targetWeightKg,
    age,
    sex,
    bmr,
    tdee,
    rawSuggestedCalories,
    dailyCalories: safeDailyCalories,
    targetCarbs,
    targetProtein,
    targetFat,
    waterGoalMl,
    waterGlasses,
    bmi,
    bmiExplanation,
    safetyAdvisoryActive,
    safetyReasons,
    safetyMessage: safetyAdvisoryActive
      ? 'Por tu bienestar, no activamos un plan de pérdida de peso ni recorte calórico. Te recomendamos conversar con un nutricionista o médico de cabecera, y hemos configurado tu cuenta en modo de orientación educativa y alimentación equilibrada.'
      : null,
    countryName: country.name,
    countryFoods: country.foods.slice(0, 4),
    budgetLabel: budget.label,
    allergies
  };
}
