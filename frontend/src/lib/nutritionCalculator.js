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

export function parseLocalizedNumber(val, fallback = 0) {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'number') return Number.isFinite(val) ? val : fallback;
  const normalized = String(val).trim().replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getLocalTodayIso(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeClinicalText(str = '') {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function hasPositiveClinicalMatch(text, regex) {
  const clean = normalizeClinicalText(text);
  if (!clean) return false;
  // Ignorar cláusulas negadas simples (ej. "no tengo anorexia ni bulimia", "sin embarazo")
  const withoutNegations = clean.replace(
    /\b(no\s+tengo|no\s+padezco|sin|nunca\s+tuve|descartado)\s+[a-z0-9_\s]+?(?=[,.;]|$)/g,
    ' '
  );
  return regex.test(withoutNegations);
}

export function convertToMetric({
  heightUnit = 'cm',
  heightCm = 168,
  heightFeet = 5,
  heightInches = 6,
  weightUnit = 'kg',
  weightVal = 68,
  targetWeightVal = 64
}) {
  const rawCm = parseLocalizedNumber(heightCm, 168);
  const rawFt = parseLocalizedNumber(heightFeet, 5);
  const rawIn = parseLocalizedNumber(heightInches, 6);
  const rawW = parseLocalizedNumber(weightVal, weightUnit === 'lb' ? 150 : 68);
  const rawTW = parseLocalizedNumber(targetWeightVal, weightUnit === 'lb' ? 140 : rawW);

  const finalHeightCm =
    heightUnit === 'ft'
      ? Math.round((rawFt * 12 + rawIn) * 2.54)
      : Math.round(rawCm);

  const finalWeightKg =
    weightUnit === 'lb'
      ? Number((rawW / 2.20462).toFixed(1))
      : Number(rawW.toFixed(1));

  const finalTargetWeightKg =
    weightUnit === 'lb'
      ? Number((rawTW / 2.20462).toFixed(1))
      : Number(rawTW.toFixed(1));

  return {
    heightCm: Math.max(110, Math.min(230, finalHeightCm)),
    weightKg: Math.max(30, Math.min(260, finalWeightKg)),
    targetWeightKg: Math.max(30, Math.min(260, finalTargetWeightKg))
  };
}

/**
 * Evalúa las reglas de seguridad clínica obligatorias del onboarding:
 * - Menor de 18 años (Mifflin-St Jeor solo aplica a adultos; modo educativo de hábitos)
 * - Embarazo o lactancia (requiere superávit/micronutrientes supervisados)
 * - Antecedente o indicación de trastorno de la conducta alimentaria (TCA)
 * - Bajo peso actual (IMC < 18.5) o peso meta que llevaría a bajo peso (IMC meta < 18.5)
 * - Cálculo que bajaría del piso clínico por sexo (1.200 kcal mujeres / 1.500 kcal hombres) o del BMR
 */
export function buildPersonalizedNutritionSummary(onboardingData = {}) {
  const { heightCm, weightKg, targetWeightKg } = convertToMetric(onboardingData);
  const age = Math.max(10, Math.min(105, Math.round(parseLocalizedNumber(onboardingData.age, 28))));
  const sex = onboardingData.sex || 'femenino';
  const activityLevel = onboardingData.activityLevel || 'moderado';
  const rawGoal = onboardingData.goal || 'comer_saludable';
  const conditions = Array.isArray(onboardingData.healthConditions) ? onboardingData.healthConditions : [];
  const allergies = Array.isArray(onboardingData.allergies) ? onboardingData.allergies : [];
  const customConditionText = `${onboardingData.customAllergy || ''} ${onboardingData.dislikedFoods || ''} ${onboardingData.customCondition || ''}`;

  const heightM = heightCm / 100;
  const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));
  const targetBmi = Number((targetWeightKg / (heightM * heightM)).toFixed(1));

  const sexOffset = sex === 'masculino' ? 5 : sex === 'femenino' ? -161 : -78;
  const bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + sexOffset);
  const actObj = ACTIVITY_LEVELS.find(a => a.id === activityLevel) || ACTIVITY_LEVELS[2];
  const tdee = Math.round(bmr * actObj.multiplier);

  // Piso clínico diferenciado por sexo (ACSM / NIH / OMS)
  const sexSafeFloorKcal =
    sex === 'masculino' ? 1500 : sex === 'femenino' ? MIN_SAFE_DAILY_KCAL : 1350;

  const goalObj = ONBOARDING_GOALS.find(g => g.id === rawGoal) || ONBOARDING_GOALS[1];
  const rawSuggestedCalories = Math.round(tdee + goalObj.kcalDelta);

  // Reglas de seguridad clínica
  const isMinor = age < 18;
  const isSenior = age >= 65;
  const isPregnantOrLactating =
    conditions.includes('embarazo_lactancia') ||
    hasPositiveClinicalMatch(customConditionText, /\b(embaraz\w*|lactan\w*|gestaci\w*|posparto)\b/);
  const hasEatingDisorder =
    conditions.includes('tca') ||
    hasPositiveClinicalMatch(
      customConditionText,
      /\b(anorexi\w*|bulimi\w*|atracon\w*|ortorexi\w*|arfid|purga\w*|tca|trastorno\s+aliment\w*)\b/
    );
  const hasType1Diabetes =
    conditions.includes('diabetes_tipo_1') ||
    hasPositiveClinicalMatch(customConditionText, /\b(diabetes\s+tipo\s*1|dm1|bomba\s+de\s+insulina)\b/);

  const isWantsDeficit = rawGoal === 'deficit_calorico' || rawGoal === 'control_condicion';
  // En adultos mayores (>=65 años, consenso ESPEN/OPS), un IMC < 22.0 indica riesgo de sarcopenia/fragilidad
  const safeMinBmi = isSenior ? 22.0 : 18.5;
  const isUnderweightNow = bmi < safeMinBmi;
  const isTargetUnderweight = targetBmi < safeMinBmi && targetWeightKg < weightKg;
  const isUnderweightForDeficit = isWantsDeficit && (isUnderweightNow || isTargetUnderweight);
  const wouldBeUnderFloor = rawSuggestedCalories < sexSafeFloorKcal;

  const safetyReasons = [];
  if (isMinor) {
    safetyReasons.push('Eres menor de 18 años y tu cuerpo está en una etapa clave de desarrollo donde las fórmulas de restricción de adultos no aplican.');
  }
  if (isPregnantOrLactating) {
    safetyReasons.push('Indicaste embarazo o lactancia, una etapa donde tus necesidades de energía, hierro, folato y calcio requieren guía médica personalizada.');
  }
  if (hasEatingDisorder) {
    safetyReasons.push('Indicaste antecedentes o inquietudes sobre la relación con la comida (TCA), donde tu bienestar integral y acompañamiento profesional van primero.');
  }
  if (hasType1Diabetes) {
    safetyReasons.push('Indicaste Diabetes Tipo 1, donde el conteo de carbohidratos debe coordinarse estrictamente con tu esquema de insulina junto a tu endocrinólogo.');
  }
  if (isUnderweightForDeficit) {
    safetyReasons.push(
      isUnderweightNow
        ? `Tu IMC actual (${bmi}) está por debajo del umbral clínico protector (${safeMinBmi} kg/m²${isSenior ? ' en adultos mayores ESPEN' : ''}), por lo que un déficit calórico está contraindicado.`
        : `El peso meta indicado llevaría a un IMC de ${targetBmi} (< ${safeMinBmi}). Protegemos tu masa muscular y salud hormonal manteniendo un rango seguro.`
    );
  }
  if (wouldBeUnderFloor && isWantsDeficit) {
    safetyReasons.push(
      `Un plan de reducción para tus datos bajaría del piso clínico seguro (${sexSafeFloorKcal} kcal/día), lo cual compromete micronutrientes y tasa metabólica.`
    );
  }

  const safetyAdvisoryActive =
    isMinor ||
    isPregnantOrLactating ||
    hasEatingDisorder ||
    hasType1Diabetes ||
    isUnderweightForDeficit ||
    (wouldBeUnderFloor && isWantsDeficit);

  // Si se activa la regla de seguridad, no aplicamos déficit: ofrecemos energía de mantenimiento saludable (>= piso por sexo y >= BMR)
  const safeDailyCalories = safetyAdvisoryActive
    ? Math.max(sexSafeFloorKcal, tdee)
    : Math.max(sexSafeFloorKcal, bmr, rawSuggestedCalories);

  const effectiveGoalObj = safetyAdvisoryActive ? ONBOARDING_GOALS[3] : goalObj;

  // Ajuste clínico de proteína:
  // 1) Si hay condición renal (KDIGO), limitar a <= 1.0 g/kg y redistribuir las calorías restantes en carbos/grasas para evitar desgaste proteico-energético (PEW).
  // 2) Si es adulto mayor (>= 65 años, ESPEN/PROT-AGE) sin enfermedad renal, asegurar piso mínimo de 1.2 g/kg contra sarcopenia.
  const hasRenalCondition = conditions.some(c => normalizeClinicalText(c).includes('renal'));
  const rawTargetProtein = Math.round((safeDailyCalories * effectiveGoalObj.proteinRatio) / 4);
  const seniorMinProtein = isSenior && !hasRenalCondition ? Math.round(weightKg * 1.2) : 0;
  const targetProtein = hasRenalCondition
    ? Math.min(rawTargetProtein, Math.round(weightKg * 1.0))
    : Math.max(rawTargetProtein, seniorMinProtein);

  const proteinKcal = targetProtein * 4;
  const remainingNonProteinKcal = Math.max(400, safeDailyCalories - proteinKcal);
  const nonProteinRatioSum = Math.max(0.1, effectiveGoalObj.carbsRatio + effectiveGoalObj.fatRatio);
  const normCarbsShare = effectiveGoalObj.carbsRatio / nonProteinRatioSum;
  const normFatShare = effectiveGoalObj.fatRatio / nonProteinRatioSum;

  const targetCarbs = Math.round((remainingNonProteinKcal * normCarbsShare) / 4);
  const targetFat = Math.round((remainingNonProteinKcal * normFatShare) / 9);

  // Hidratación clínica: 35 ml/kg estándar (moderada en condición renal con nota de supervisión)
  const waterGoalMl = hasRenalCondition
    ? Math.min(2000, Math.max(1500, Math.round(weightKg * 28)))
    : Math.max(1750, Math.round(weightKg * 35));
  const waterGlasses = Math.max(6, Math.round(waterGoalMl / 250));

  // Metas clínicas de micronutrientes basadas en OMS / ADA / AHA-DASH / KDIGO / ESPEN
  const hasHypertension = conditions.some(c => normalizeClinicalText(c).includes('hiperten'));
  const hasDiabetes = conditions.some(c => normalizeClinicalText(c).includes('diabet') || normalizeClinicalText(c).includes('sop'));
  const hasAnemia = conditions.some(c => normalizeClinicalText(c).includes('anemia'));
  const hasGastritis = conditions.some(c => normalizeClinicalText(c).includes('gastritis'));
  const isPlantBased = onboardingData.dietType === 'vegana' || onboardingData.dietType === 'vegetariana';

  const baseIronMg =
    isPregnantOrLactating ? 27 : (sex === 'femenino' && age >= 14 && age <= 50) || hasAnemia ? 18 : 8;
  const ironTargetMg = isPlantBased ? Math.round(baseIronMg * 1.5) : baseIronMg;
  const calciumTargetMg = isMinor ? 1300 : isSenior || (sex === 'femenino' && age >= 51) ? 1200 : 1000;
  const vitaminCTargetMg = hasAnemia ? 110 : sex === 'masculino' ? 90 : 75;

  const clinicalTargets = {
    fiberGrams: hasGastritis
      ? 25
      : Math.max(25, Math.min(38, Math.round((safeDailyCalories / 1000) * 14))),
    sodiumMaxMg: hasHypertension || hasRenalCondition ? 1500 : 2000,
    potassiumTargetMg: hasRenalCondition ? 2200 : hasHypertension ? 4200 : 3500,
    proteinPerKg: Number((targetProtein / Math.max(1, weightKg)).toFixed(2)),
    addedSugarMaxGrams: hasDiabetes ? 15 : 25,
    omega3TargetMg: 1000,
    ironTargetMg,
    calciumTargetMg,
    vitaminCTargetMg,
    glycemicLoadMaxDaily: hasDiabetes ? 80 : 110
  };

  const bmiExplanation =
    bmi < safeMinBmi
      ? 'Tu relación peso-estatura indica que tu cuerpo se beneficiará de platos densos en nutrientes, proteína de calidad y grasas saludables sin recortes calóricos.'
      : bmi < 25
        ? 'Tu relación peso-estatura está en un rango de equilibrio general; nos enfocaremos en calidad de alimentos, masa muscular y energía diaria.'
        : 'Tu relación peso-estatura es solo un indicador orientativo (no distingue masa muscular de tejido adiposo); avanzaremos con saciedad y comida real.';

  const country = getCountryProfile(onboardingData.country || 'CO');
  const budget = getBudgetProfile(onboardingData.budgetTier || 'equilibrado');

  // Peso meta seguro (nunca menor al IMC protector por edad)
  const minHealthyWeightKg = Number((safeMinBmi * heightM * heightM).toFixed(1));
  const safeTargetWeightKg = safetyAdvisoryActive
    ? weightKg
    : Math.max(minHealthyWeightKg, targetWeightKg);

  return {
    heightCm,
    weightKg,
    targetWeightKg: safeTargetWeightKg,
    age,
    sex,
    bmr,
    tdee,
    sexSafeFloorKcal,
    rawSuggestedCalories,
    dailyCalories: safeDailyCalories,
    targetCarbs,
    targetProtein,
    targetFat,
    waterGoalMl,
    waterGlasses,
    bmi,
    targetBmi,
    bmiExplanation,
    clinicalTargets,
    hideCalorieNumbersMode: isMinor || hasEatingDisorder,
    safetyAdvisoryActive,
    safetyReasons,
    safetyMessage: safetyAdvisoryActive
      ? 'Por tu bienestar clínico, no activamos un plan de pérdida de peso ni recorte calórico. Te recomendamos conversar con un nutricionista o médico de cabecera, y hemos configurado tu cuenta en modo de orientación educativa y alimentación equilibrada.'
      : null,
    countryName: country.name,
    countryFoods: country.foods.slice(0, 4),
    budgetLabel: budget.label,
    allergies
  };
}
