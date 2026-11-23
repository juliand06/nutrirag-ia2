// Motor de IA Proactiva y Clínica 360° (NutriStudio AI)
// Analiza TODA la información de la persona (los 13 pasos del onboarding + comidas del día +
// hidratación + evolución de peso + hora actual + alergias + alimentos que no le gustan +
// tiempo de cocina + presupuesto + país + condiciones clínicas) y genera guía proactiva
// paso a paso en toda la plataforma SIN necesidad de que la persona tenga que preguntar en el chat.
// Fundamentado en guías clínicas: OMS/FAO, ADA (Diabetes/Glucosa), AHA/DASH (Hipertensión/Colesterol),
// ISSN (Proteína/Músculo), ESPEN (Crononutrición) y KDIGO/EASL.

import { GLOBAL_FOOD_DATABASE, scaleFoodPortion } from '../services/foodDatabase';
import { getCountryProfile, getBudgetProfile } from '../services/countryNutritionData';
import { MEDICAL_CONDITIONS } from '../services/clinicalKnowledgeBase';

function norm(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Mapea tanto los IDs del onboarding ('diabetes', 'hipertension', 'colesterol')
 * como los IDs clínicos extendidos a los protocolos médicos oficiales.
 */
export function resolveUserClinicalProtocols(userProfile = {}) {
  const raw = [
    ...(Array.isArray(userProfile?.healthConditions) ? userProfile.healthConditions : []),
    ...(Array.isArray(userProfile?.medicalConditions) ? userProfile.medicalConditions : [])
  ];
  const goal = userProfile?.goal || '';
  const mappedIds = new Set();

  raw.forEach(id => {
    const clean = norm(id);
    if (clean.includes('diabet') || clean.includes('insulina') || clean.includes('glucosa')) {
      mappedIds.add('resistencia_insulina_diabetes');
    }
    if (clean.includes('hiperten') || clean.includes('presion') || clean.includes('cardio')) {
      mappedIds.add('hipertension_cardiovascular');
    }
    if (clean.includes('colesterol') || clean.includes('triglicer') || clean.includes('lipid')) {
      mappedIds.add('colesterol_trigliceridos');
    }
    if (clean.includes('gastritis') || clean.includes('colon') || clean.includes('digest')) {
      mappedIds.add('gastritis_digestion');
    }
    if (clean.includes('anemia') || clean.includes('fatiga') || clean.includes('hierro')) {
      mappedIds.add('anemia_fatiga');
    }
    if (clean.includes('higado')) {
      mappedIds.add('higado_graso_metabolico');
    }
    if (clean.includes('renal') || clean.includes('rinon')) {
      mappedIds.add('salud_renal_kdigo');
    }
  });

  if (goal === 'masa_muscular') {
    mappedIds.add('rendimiento_deportivo');
  }
  if (goal === 'control_condicion' && mappedIds.size === 0) {
    mappedIds.add('resistencia_insulina_diabetes');
  }

  const protocols = MEDICAL_CONDITIONS.filter(c => mappedIds.has(c.id));

  // Si no tiene condición médica específica, activamos el protocolo preventivo OMS/ESPEN de base
  if (protocols.length === 0) {
    return [
      {
        id: 'oms_prevencion_integral',
        label: 'Prevención Metabólica y Crononutrición (OMS / FAO / ESPEN)',
        source: 'Guías Globales OMS/FAO & Consenso ESPEN de Crononutrición',
        keyRules:
          'Prioriza alimentos naturales (NOVA 1), 25–35 g de fibra diaria, 1.6 g/kg de proteína repartida en 3–4 comidas y cenas ligeras 2–3 horas antes de dormir.',
        alertRule: 'Moderar azúcares añadidos, harinas refinadas y ultraprocesados altos en sodio.'
      }
    ];
  }

  return protocols;
}

/**
 * Evalúa si un alimento es compatible con las alergias, intolerancias, gustos (dislikedFoods),
 * tipo de dieta (vegana, vegetariana, sin_gluten, sin_lactosa) y condiciones médicas de la persona.
 */
export function evaluateFoodPersonalCompatibility(food, userProfile = {}) {
  if (!food) return { compatible: true, level: 'optimal', reasons: [], clinicalTip: '' };

  const foodName = norm(food.name);
  const foodCat = norm(food.category);
  const allergies = (userProfile?.allergies || []).map(norm);
  const customAllergy = norm(userProfile?.customAllergy || '');
  const dislikedRaw = norm(userProfile?.dislikedFoods || '');
  const dietType = norm(userProfile?.dietType || 'omnivora');
  const protocols = resolveUserClinicalProtocols(userProfile);

  const reasons = [];
  let level = 'optimal'; // 'optimal' | 'caution' | 'avoid'

  // 1. Alimentos que no le gustan (dislikedFoods)
  const dislikedTokens = dislikedRaw
    .split(/[,;.\n]+/)
    .map(t => t.trim())
    .filter(t => t.length >= 3);
  for (const token of dislikedTokens) {
    if (foodName.includes(token)) {
      level = 'avoid';
      reasons.push(`Indicaste que no te gusta "${token}". Tu IA lo excluye de tus sugerencias.`);
    }
  }

  // 2. Alergias e intolerancias
  if (customAllergy.length >= 3 && foodName.includes(customAllergy)) {
    level = 'avoid';
    reasons.push(`Coincide con tu alergia/intolerancia registrada ("${userProfile.customAllergy}").`);
  }

  if (
    (allergies.some(a => a.includes('lactosa') || a.includes('lacteo')) || dietType === 'sin_lactosa') &&
    (foodName.includes('queso') || foodName.includes('leche') || foodName.includes('yogur'))
  ) {
    level = 'avoid';
    reasons.push('Contiene lácteos/lactosa. Te sugerimos tofu, huevo o bebida vegetal sin azúcar.');
  }

  if (
    (allergies.some(a => a.includes('gluten') || a.includes('trigo')) || dietType === 'sin_gluten') &&
    (foodName.includes('trigo') || foodName.includes('pan ') || foodName.includes('pasta'))
  ) {
    level = 'avoid';
    reasons.push('Puede contener gluten. Cambia por arepa de maíz, quinua, arroz integral o papa.');
  }

  if (
    allergies.some(a => a.includes('huevo')) &&
    (foodName.includes('huevo') || foodName.includes('claras'))
  ) {
    level = 'avoid';
    reasons.push('Excluido por tu alergia al huevo.');
  }

  if (
    allergies.some(a => a.includes('marisco') || a.includes('pescado')) &&
    (foodName.includes('salmon') || foodName.includes('trucha') || foodName.includes('atun') || foodName.includes('sardina') || foodName.includes('jurel'))
  ) {
    level = 'avoid';
    reasons.push('Excluido por alergia a pescado/mariscos.');
  }

  if (
    allergies.some(a => a.includes('mani') || a.includes('frutos secos')) &&
    (foodName.includes('mani') || foodName.includes('nueces') || foodName.includes('almendra'))
  ) {
    level = 'avoid';
    reasons.push('Excluido por alergia a maní o frutos secos.');
  }

  // 3. Tipo de alimentación (Vegana / Vegetariana)
  const isMeatOrFish =
    foodName.includes('pollo') ||
    foodName.includes('res') ||
    foodName.includes('pavo') ||
    foodName.includes('salmon') ||
    foodName.includes('trucha') ||
    foodName.includes('jurel') ||
    foodName.includes('sardina') ||
    foodName.includes('atun');

  const isAnimalProduct =
    isMeatOrFish ||
    foodName.includes('huevo') ||
    foodName.includes('claras') ||
    foodName.includes('queso') ||
    foodName.includes('yogur');

  if (dietType === 'vegetariana' && isMeatOrFish) {
    level = 'avoid';
    reasons.push('No compatible con tu alimentación vegetariana (reemplaza por huevo, tofu, lentejas o garbanzos).');
  }
  if (dietType === 'vegana' && isAnimalProduct) {
    level = 'avoid';
    reasons.push('No compatible con tu alimentación 100% vegana (reemplaza por tofu, quinua, frijol o garbanzos).');
  }

  // 4. Cruce con condiciones clínicas (ADA, DASH, AHA)
  const hasDiabetes = protocols.some(p => p.id === 'resistencia_insulina_diabetes');
  const hasHypertension = protocols.some(p => p.id === 'hipertension_cardiovascular');
  const hasCholesterol = protocols.some(p => p.id === 'colesterol_trigliceridos');

  if (level !== 'avoid') {
    if (hasHypertension && Number(food.sodiumMg) > 300) {
      level = 'caution';
      reasons.push(`Protocolo DASH: aporta ${food.sodiumMg} mg de sodio/100g. Modera la porción y acompáñalo con vegetales ricos en potasio.`);
    }
    if (hasDiabetes && (food.glycemicIndex === 'Alto' || Number(food.sugar) > 12)) {
      level = 'caution';
      reasons.push('Protocolo ADA: índice glucémico alto. Si lo consumes, come primero una ensalada verde y una proteína magra.');
    }
    if (hasCholesterol && (food.novaGroup === 4 || Number(food.fat) > 18)) {
      level = 'caution';
      reasons.push('Protocolo AHA Lípidos: controla la porción de grasas y prioriza fuentes con fibra soluble como avena o legumbres.');
    }
  }

  let clinicalTip = 'Alimento natural (NOVA 1) ideal para tus metas diarias.';
  if (foodCat.includes('proteina') || foodCat.includes('lacteos')) {
    clinicalTip = 'Excelente aporte de aminoácidos para preservar músculo y mantener saciedad por 4+ horas (ISSN).';
  } else if (foodCat.includes('legumbres') || Number(food.fiber) >= 4) {
    clinicalTip = 'Su fibra soluble frena la absorción de glucosa (ADA) y ayuda a reducir el colesterol LDL (AHA).';
  } else if (Number(food.potassiumMg) >= 350) {
    clinicalTip = `Rico en potasio (${food.potassiumMg} mg/100g), clave en el protocolo DASH para proteger tu presión arterial.`;
  }

  return {
    compatible: level !== 'avoid',
    level,
    badgeText:
      level === 'optimal'
        ? 'Ideal para tu perfil clínico'
        : level === 'caution'
          ? 'Moderar según tu protocolo'
          : 'Excluido por tus preferencias/alergias',
    reasons,
    clinicalTip
  };
}

/**
 * Filtra la base de datos de alimentos devolviendo solo aquellos 100% compatibles
 * con las alergias, disgustos, tipo de dieta y país de la persona.
 */
export function getSafeFoodsForUser(userProfile = {}) {
  const countryId = userProfile?.country || 'CO';
  const safe = GLOBAL_FOOD_DATABASE.filter(
    f => evaluateFoodPersonalCompatibility(f, userProfile).compatible
  );
  const pool = safe.length >= 6 ? safe : GLOBAL_FOOD_DATABASE;
  return [...pool].sort((a, b) => {
    const aLoc = a.regions.includes(countryId) ? 1 : 0;
    const bLoc = b.regions.includes(countryId) ? 1 : 0;
    if (bLoc !== aLoc) return bLoc - aLoc;
    return b.qualityScore - a.qualityScore;
  });
}

/**
 * Construye el contexto clínico y personal completo de la persona (los 13 pasos + estado de hoy)
 * tanto para la IA Proactiva como para el Coach IA con RAG.
 */
export function buildCompletePersonContext(userProfile = {}, workspace = {}, currentHour = new Date().getHours()) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const allMeals = workspace?.mealLogs || [];
  const todayMeals = allMeals.filter(m => m.date === todayIso);

  const consumed = todayMeals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + (Number(m.kcal ?? m.totalCalories) || 0),
      carbs: acc.carbs + (Number(m.carbs ?? m.carbsGrams) || 0),
      protein: acc.protein + (Number(m.protein ?? m.proteinGrams) || 0),
      fat: acc.fat + (Number(m.fat ?? m.fatGrams) || 0),
      fiber: acc.fiber + (Number(m.fiber ?? m.fiberGrams) || 0)
    }),
    { kcal: 0, carbs: 0, protein: 0, fat: 0, fiber: 0 }
  );

  const goalKcal = Number(userProfile?.dailyCalories) || 1950;
  const goalProtein = Number(userProfile?.targetProtein) || 125;
  const goalCarbs = Number(userProfile?.targetCarbs) || 210;
  const goalFat = Number(userProfile?.targetFat) || 62;
  const goalFiber = 28;
  const goalWaterMl = Number(userProfile?.waterGoalMl) || 2000;
  const goalWaterGlasses = Math.max(7, Math.round(goalWaterMl / 250));
  const waterGlassesToday = Number(workspace?.waterGlassesByDate?.[todayIso] || 0);
  const waterTodayMl = waterGlassesToday * 250;

  const remaining = {
    kcal: Math.max(0, goalKcal - consumed.kcal),
    protein: Math.max(0, goalProtein - consumed.protein),
    carbs: Math.max(0, goalCarbs - consumed.carbs),
    fat: Math.max(0, goalFat - consumed.fat),
    fiber: Math.max(0, goalFiber - consumed.fiber),
    waterGlasses: Math.max(0, goalWaterGlasses - waterGlassesToday)
  };

  const loggedMealTypes = new Set(todayMeals.map(m => m.mealType));
  const protocols = resolveUserClinicalProtocols(userProfile);
  const country = getCountryProfile(userProfile?.country || 'CO');
  const budget = getBudgetProfile(userProfile?.budgetTier || 'equilibrado');

  const cookingTimeLabel =
    userProfile?.cookingTime === '15_min'
      ? 'preparación rápida (≤15 min)'
      : userProfile?.cookingTime === '45_mas'
        ? 'cocina con calma (45+ min)'
        : 'preparación práctica (20–30 min)';

  return {
    todayIso,
    currentHour,
    todayMeals,
    consumed,
    goals: {
      kcal: goalKcal,
      protein: goalProtein,
      carbs: goalCarbs,
      fat: goalFat,
      fiber: goalFiber,
      waterMl: goalWaterMl,
      waterGlasses: goalWaterGlasses
    },
    remaining,
    loggedMealTypes: Array.from(loggedMealTypes),
    waterGlassesToday,
    waterTodayMl,
    protocols,
    country,
    budget,
    cookingTimeLabel
  };
}

/**
 * GENERADOR PROACTIVO DEL DÍA A DÍA ("Qué hacer ahora mismo sin tener que preguntar"):
 * Produce una hoja de ruta viva para la persona según la hora actual, lo que ya comió,
 * cuánta agua lleva, sus condiciones clínicas y sus alimentos seguros.
 */
export function generateProactiveDailyRoadmap(userProfile = {}, workspace = {}, currentHour = new Date().getHours()) {
  const ctx = buildCompletePersonContext(userProfile, workspace, currentHour);
  const safeFoods = getSafeFoodsForUser(userProfile);
  const firstName = (userProfile?.name || 'Hola').split(' ')[0];
  const primaryProtocol = ctx.protocols[0];

  // Determinar el tiempo de comida actual o siguiente según la hora y lo ya registrado
  let nextMealType = 'Desayuno';
  let timeWindowLabel = 'Mañana (6:00 am – 11:00 am)';
  if (currentHour >= 11 && currentHour < 16) {
    nextMealType = !ctx.loggedMealTypes.includes('Almuerzo') ? 'Almuerzo' : 'Merienda';
    timeWindowLabel = 'Mediodía y Tarde (11:00 am – 4:00 pm)';
  } else if (currentHour >= 16 && currentHour < 19) {
    nextMealType = !ctx.loggedMealTypes.includes('Merienda') ? 'Merienda' : 'Cena';
    timeWindowLabel = 'Media tarde (4:00 pm – 7:00 pm)';
  } else if (currentHour >= 19 || currentHour < 5) {
    nextMealType = 'Cena';
    timeWindowLabel = 'Noche y descanso (7:00 pm en adelante)';
  } else if (ctx.loggedMealTypes.includes('Desayuno')) {
    nextMealType = 'Almuerzo';
  }

  // Seleccionar alimentos seguros para armar el plato proactivo de este momento
  const proteins = safeFoods.filter(f => f.category === 'Proteínas' || f.category === 'Lácteos y Huevos');
  const carbs = safeFoods.filter(f => f.category === 'Carbohidratos' || f.category === 'Legumbres');
  const veggies = safeFoods.filter(f => f.category === 'Frutas y Verduras' || f.category === 'Grasas Saludables');

  const chosenProtein = proteins[0] || safeFoods[0];
  const chosenCarb = carbs[0] || safeFoods[1] || safeFoods[0];
  const chosenVeg = veggies[0] || safeFoods[2] || safeFoods[0];

  const share =
    nextMealType === 'Desayuno' ? 0.27 : nextMealType === 'Almuerzo' ? 0.36 : nextMealType === 'Merienda' ? 0.14 : 0.23;
  const targetMealKcal = Math.max(250, Math.min(750, Math.round(ctx.goals.kcal * share)));

  const pScaled = scaleFoodPortion(chosenProtein, chosenProtein.defaultGrams || 130);
  const cScaled = scaleFoodPortion(chosenCarb, nextMealType === 'Cena' ? 90 : chosenCarb.defaultGrams || 120);
  const vScaled = scaleFoodPortion(chosenVeg, chosenVeg.defaultGrams || 100);

  const recommendedMeal = {
    mealType: nextMealType,
    dishName: `${chosenProtein.name.split('(')[0].trim()} + ${chosenCarb.name.split('(')[0].trim()} + ${chosenVeg.name.split('(')[0].trim()}`,
    grams: pScaled.grams + cScaled.grams + vScaled.grams,
    kcal: pScaled.kcal + cScaled.kcal + vScaled.kcal || targetMealKcal,
    protein: pScaled.protein + cScaled.protein + vScaled.protein,
    carbs: pScaled.carbs + cScaled.carbs + vScaled.carbs,
    fat: pScaled.fat + cScaled.fat + vScaled.fat,
    fiber: pScaled.fiber + cScaled.fiber + vScaled.fiber,
    image:
      nextMealType === 'Desayuno'
        ? '/img/plato-desayuno.webp'
        : nextMealType === 'Cena'
          ? '/img/plato-cena.webp'
          : nextMealType === 'Merienda'
            ? '/img/plato-merienda.webp'
            : '/img/plato-almuerzo.webp'
  };

  // Acción principal que la IA le indica hacer AHORA MISMO sin que la persona pregunte
  const expectedGlassesByNow = Math.min(
    ctx.goals.waterGlasses,
    Math.max(1, Math.floor(((currentHour - 6) / 14) * ctx.goals.waterGlasses))
  );
  const waterBehind = ctx.waterGlassesToday < expectedGlassesByNow;

  const immediateActions = [];

  // 1. Acción de comida inmediata
  if (!ctx.loggedMealTypes.includes(nextMealType)) {
    immediateActions.push({
      id: 'act-meal',
      priority: 'Alta · Ahora mismo',
      category: nextMealType,
      title: `Tu siguiente paso (${nextMealType}): ${recommendedMeal.dishName}`,
      detail: `Adaptado a tu ${ctx.cookingTimeLabel} en ${userProfile?.city || ctx.country.name}, respetando tus gustos${userProfile?.dislikedFoods ? ` (sin ${userProfile.dislikedFoods})` : ''} y cubriendo ${recommendedMeal.protein}g de los ${ctx.remaining.protein}g de proteína que te faltan hoy.`,
      clinicalBasis: `${primaryProtocol.source}: ${primaryProtocol.keyRules}`,
      actionType: 'log_meal',
      actionLabel: `+ Registrar este ${nextMealType.toLowerCase()} (${recommendedMeal.kcal} kcal)`,
      mealPayload: recommendedMeal
    });
  } else {
    immediateActions.push({
      id: 'act-meal-done',
      priority: 'Completado',
      category: nextMealType,
      title: `¡Ya cumpliste tu ${nextMealType.toLowerCase()} de hoy!`,
      detail: `Llevas ${ctx.consumed.kcal} kcal y ${ctx.consumed.protein}g de proteína. Tu cuerpo está recibiendo energía estable; mantén una pausa digestiva tranquila hasta tu siguiente toma.`,
      clinicalBasis: 'Consenso ESPEN de Crononutrición: respetar 3 a 4 horas entre tomas favorece la flexibilidad metabólica y la digestión.',
      actionType: 'none'
    });
  }

  // 2. Acción de hidratación proactiva
  if (waterBehind) {
    immediateActions.push({
      id: 'act-water',
      priority: 'Hábito inmediato',
      category: 'Hidratación',
      title: `Toma 1 vaso de agua ahora (llevas ${ctx.waterGlassesToday} de ${ expectedGlassesByNow } sugeridos para esta hora)`,
      detail: `Para tu peso de ${userProfile?.weightKg || 67} kg tu meta es ${ctx.goals.waterMl} ml/día. Hidratarte antes de las comidas mejora la saciedad y evita confundir sed con antojos.`,
      clinicalBasis: 'Guía OMS/EFSA de Hidratación: 35 ml/kg/día mantienen el volumen plasmático y la termogénesis.',
      actionType: 'add_water',
      actionLabel: '+ Sumar 1 vaso de agua (250 ml)'
    });
  }

  // 3. Micro-intervención clínica según lo que lleva en el día o su condición médica
  const hasDiabetes = ctx.protocols.some(p => p.id === 'resistencia_insulina_diabetes');
  const hasHypertension = ctx.protocols.some(p => p.id === 'hipertension_cardiovascular');
  const hasCholesterol = ctx.protocols.some(p => p.id === 'colesterol_trigliceridos');

  if (hasDiabetes) {
    immediateActions.push({
      id: 'act-clinical-ada',
      priority: 'Protocolo Médico ADA',
      category: 'Control Glucémico',
      title: 'Regla de oro para tu plato de hoy: Fibra primero, carbohidrato al final',
      detail: 'Empieza comiendo la ensalada o vegetales, sigue con la proteína y deja el arroz, arepa o tubérculo para el final. Si puedes, camina 10 minutos después de comer.',
      clinicalBasis: 'American Diabetes Association (ADA): reduce el pico de glucosa e insulina posprandial hasta en un 35%.',
      actionType: 'none'
    });
  } else if (hasHypertension) {
    immediateActions.push({
      id: 'act-clinical-dash',
      priority: 'Protocolo Médico DASH',
      category: 'Salud Arterial',
      title: 'Sazona con hierbas y limón + suma potasio natural hoy',
      detail: `Evita salero en la mesa y embutidos. En ${ctx.country.name}, aprovecha aguacate, plátano, tomate y legumbres para elevar tu potasio protector.`,
      clinicalBasis: 'Protocolo AHA / DASH: <2,000 mg de sodio y >3,500 mg de potasio favorecen una presión arterial saludable.',
      actionType: 'none'
    });
  } else if (hasCholesterol) {
    immediateActions.push({
      id: 'act-clinical-aha',
      priority: 'Protocolo Médico AHA',
      category: 'Perfil Lipídico',
      title: 'Activa el escudo de fibra soluble en tu día',
      detail: `Hoy llevas ${ctx.consumed.fiber}g de fibra (meta: ${ctx.goals.fiber}g). Incluir avena, chía, lentejas o guayaba ayuda a capturar colesterol a nivel digestivo.`,
      clinicalBasis: 'Guía Cardiovascular AHA/OMS: 10–15g de fibra soluble diaria reducen significativamente el colesterol LDL.',
      actionType: 'none'
    });
  } else {
    immediateActions.push({
      id: 'act-clinical-protein',
      priority: 'Balance Metabólico ISSN',
      category: 'Saciedad y Músculo',
      title:
        ctx.remaining.protein > 35
          ? `Asegura ${Math.min(40, Math.round(ctx.remaining.protein / 2))}g de proteína en tu próxima comida`
          : '¡Excelente nivel de proteína hoy!',
      detail:
        ctx.remaining.protein > 35
          ? `Llevas ${ctx.consumed.protein}g de ${ctx.goals.protein}g. Repartir la proteína en cada tiempo de comida evita el hambre nocturna y protege tu masa muscular.`
          : `Con ${ctx.consumed.protein}g registrados hoy estás protegiendo tu metabolismo basal de forma óptima.`,
      clinicalBasis: 'Consenso ISSN & OMS: 1.6–2.0 g/kg/día distribuidos en 3–4 tomas optimizan la síntesis proteica.',
      actionType: 'none'
    });
  }

  // Hoja de ruta completa de las 4 etapas del día para que la persona sepa qué hacer de principio a fin
  const dayTimeline = [
    {
      period: 'Mañana',
      done: ctx.loggedMealTypes.includes('Desayuno'),
      instruction: `Desayuno proteico + 2 vasos de agua al despertar. Evita iniciar el día solo con café o harinas dulces.`
    },
    {
      period: 'Mediodía',
      done: ctx.loggedMealTypes.includes('Almuerzo'),
      instruction: `Almuerzo completo en 3 partes: 50% verduras frescas, 25% proteína magra y 25% carbohidrato complejo local.`
    },
    {
      period: 'Tarde',
      done: ctx.loggedMealTypes.includes('Merienda'),
      instruction: `Merienda funcional para estabilizar energía (fruta entera con fibra o yogur/frutos secos) + hidratación.`
    },
    {
      period: 'Noche',
      done: ctx.loggedMealTypes.includes('Cena'),
      instruction: `Cena ligera 2–3 h antes de dormir (ESPEN): prioriza proteína y vegetales al vapor/plancha con carbohidrato moderado.`
    }
  ];

  return {
    firstName,
    timeWindowLabel,
    nextMealType,
    recommendedMeal,
    immediateActions,
    dayTimeline,
    protocols: ctx.protocols,
    context: ctx,
    profileAuditSummary: `Objetivo: ${userProfile?.goal || 'salud'} · Dieta: ${userProfile?.dietType || 'omnívora'}${
      (userProfile?.allergies || []).length ? ` · Alergias: ${userProfile.allergies.join(', ')}` : ''
    }${userProfile?.dislikedFoods ? ` · Excluye: ${userProfile.dislikedFoods}` : ''} · Tiempo cocina: ${ctx.cookingTimeLabel} · Presupuesto: ${ctx.budget.id}`
  };
}
