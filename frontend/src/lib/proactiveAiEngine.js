// Motor de IA Proactiva y Clínica 360° (NutriStudio AI)
// Analiza TODA la información de la persona (los 13 pasos del onboarding + comidas del día +
// hidratación + evolución de peso + hora actual + alergias + alimentos que no le gustan +
// tiempo de cocina + presupuesto + país + condiciones clínicas) y genera guía proactiva
// paso a paso en toda la plataforma SIN necesidad de que la persona tenga que preguntar en el chat.
// Fundamentado en guías clínicas: OMS/FAO, ADA (Diabetes/Glucosa), AHA/DASH (Hipertensión/Colesterol),
// ISSN (Proteína/Músculo), ESPEN (Crononutrición) y KDIGO/EASL.

import { GLOBAL_FOOD_DATABASE, scaleFoodPortion } from '../services/foodDatabase';
import { getCountryProfile, getBudgetProfile } from '../services/countryNutritionData';
import { MEDICAL_CONDITIONS, CLINICAL_DRUG_NUTRIENT_INTERACTIONS } from '../services/clinicalKnowledgeBase';
import { getLocalTodayIso } from './nutritionCalculator';

function norm(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Matriz estructurada bilingüe de alérgenos y sinónimos clínicos (FDA / EFSA Big 8/9 + Taxonomía Open Food Facts)
export const ALLERGEN_SYNONYM_MATRIX = {
  lactosa: ['queso', 'leche', 'yogur', 'cottage', 'suero', 'whey', 'caseina', 'mantequilla', 'crema de leche', 'lactosa', 'kumis', 'requeson', 'ricotta', 'milk', 'dairy', 'lactose'],
  gluten: ['trigo', 'pan', 'masa madre', 'pasta', 'cebada', 'centeno', 'semola', 'cuscus', 'malta', 'galleta', 'wheat', 'gluten', 'barley', 'rye'],
  huevo: ['huevo', 'claras', 'yema', 'albumina', 'mayonesa', 'egg', 'eggs'],
  mariscos_pescado: ['salmon', 'trucha', 'atun', 'sardina', 'jurel', 'bonito', 'camaron', 'langostino', 'cangrejo', 'marisco', 'pescado', 'tilapia', 'merluza', 'pulpo', 'calamar', 'fish', 'crustaceans', 'shrimp', 'shellfish'],
  mani_frutos_secos: ['mani', 'cacahuate', 'nuez', 'nueces', 'almendra', 'pistacho', 'maranon', 'anacardo', 'avellana', 'pecana', 'macadamia', 'peanut', 'peanuts', 'nuts', 'tree-nuts', 'hazelnut', 'almond', 'walnut'],
  soya: ['soya', 'soja', 'tofu', 'edamame', 'tempeh', 'lecitina de soya', 'soy', 'soybeans']
};

function hasWord(cleanText, pattern) {
  return new RegExp(`(^|[^a-z0-9])(${pattern})([^a-z0-9]|$)`).test(cleanText);
}

/**
 * Normaliza valores de laboratorio a mg/dL (si el usuario los ingresó en mmol/L)
 * y evalúa vigencia (>180 días = vencido).
 */
export function normalizeVoluntaryLabValues(vh = null) {
  if (!vh || !vh.consentGranted) return null;
  const unit = vh.labUnit === 'mmol' ? 'mmol' : 'mgdl';
  const toMgDl = (val, factor) => {
    const n = Number(val);
    if (!Number.isFinite(n) || n <= 0) return null;
    return unit === 'mmol' ? Math.round(n * factor) : n;
  };

  let isStale = false;
  if (vh.examDate) {
    const parsed = new Date(`${vh.examDate}T12:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      const diffDays = (Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24);
      isStale = diffDays > 180;
    }
  }

  return {
    ...vh,
    labUnit: unit,
    fastingGlucoseMgDl: toMgDl(vh.fastingGlucose, 18.018),
    hba1cPct: Number(vh.hba1c) > 0 ? Number(vh.hba1c) : null,
    ldlMgDl: toMgDl(vh.ldlCholesterol, 38.67),
    triglyceridesMgDl: toMgDl(vh.triglycerides, 88.57),
    hemoglobinGDl: Number(vh.hemoglobin) > 0 ? Number(vh.hemoglobin) : null,
    isStale
  };
}

/**
 * Mapea tanto los IDs del onboarding ('diabetes', 'hipertension', 'colesterol', 'tiroides', 'sop', 'renal')
 * como los IDs clínicos extendidos a los protocolos médicos oficiales, aplicando jerarquía de precedencia clínica
 * y límites de palabra estrictos (evita que "depresión" active presión o "adrenal" active renal).
 */
export function resolveUserClinicalProtocols(userProfile = {}) {
  const raw = [
    ...(Array.isArray(userProfile?.healthConditions) ? userProfile.healthConditions : []),
    ...(Array.isArray(userProfile?.medicalConditions) ? userProfile.medicalConditions : [])
  ];
  const goal = userProfile?.goal || '';
  const dietType = norm(userProfile?.dietType || '');
  const allergies = (userProfile?.allergies || []).map(norm);
  const mappedIds = new Set();

  raw.forEach(id => {
    const clean = norm(id);
    if (hasWord(clean, 'diabetes|prediabetes|resistencia_insulina_diabetes|insulina|glucosa|hiperglucemia')) {
      mappedIds.add('resistencia_insulina_diabetes');
    }
    if (hasWord(clean, 'hipertension|hipertension_cardiovascular|presion\\s+alta|presion\\s+arterial|cardiovascular')) {
      mappedIds.add('hipertension_cardiovascular');
    }
    if (hasWord(clean, 'colesterol|trigliceridos|colesterol_trigliceridos|dislipidemia|hiperlipidemia')) {
      mappedIds.add('colesterol_trigliceridos');
    }
    if (hasWord(clean, 'gastritis|gastritis_digestion|colon\\s+irritable|sii|reflujo')) {
      mappedIds.add('gastritis_digestion');
    }
    if (hasWord(clean, 'anemia|anemia_fatiga|ferropenia|ferropenica') && !hasWord(clean, 'hemocromatosis')) {
      mappedIds.add('anemia_fatiga');
    }
    if (hasWord(clean, 'higado|higado_graso_metabolico|esteatosis|masld')) {
      mappedIds.add('higado_graso_metabolico');
    }
    if (hasWord(clean, 'renal|salud_renal_kdigo|rinon|erc|nefropatia') && !hasWord(clean, 'adrenal|suprarrenal')) {
      mappedIds.add('salud_renal_kdigo');
    }
    if (hasWord(clean, 'tiroides|hipotiroidismo|hipotiroidismo_metabolico')) {
      mappedIds.add('hipotiroidismo_metabolico');
    }
    if (hasWord(clean, 'sop|sop_endocrino|ovario\\s+poliquistico')) {
      mappedIds.add('sop_endocrino');
    }
    if (hasWord(clean, 'celiaca|celiaquia|enfermedad_celiaca_gluten|gluten')) {
      mappedIds.add('enfermedad_celiaca_gluten');
    }
  });

  if (dietType === 'sin_gluten' || allergies.some(a => hasWord(a, 'gluten|trigo|celiac\\w*'))) {
    mappedIds.add('enfermedad_celiaca_gluten');
  }

  // Cruce automático con el Historial Clínico Voluntario (respetando unidades mg/dL vs mmol/L y vigencia)
  const labs = normalizeVoluntaryLabValues(userProfile?.voluntaryClinicalHistory);
  if (labs && !labs.isStale) {
    if ((labs.fastingGlucoseMgDl && labs.fastingGlucoseMgDl >= 100) || (labs.hba1cPct && labs.hba1cPct >= 5.7)) {
      mappedIds.add('resistencia_insulina_diabetes');
    }
    if ((labs.ldlMgDl && labs.ldlMgDl >= 130) || (labs.triglyceridesMgDl && labs.triglyceridesMgDl >= 150)) {
      mappedIds.add('colesterol_trigliceridos');
    }
    if (labs.hemoglobinGDl && labs.hemoglobinGDl < 12.0) {
      mappedIds.add('anemia_fatiga');
    }
    const bpMatch = String(labs.bloodPressure || '').match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
    if (bpMatch && (Number(bpMatch[1]) >= 130 || Number(bpMatch[2]) >= 85)) {
      mappedIds.add('hipertension_cardiovascular');
    }
    const medsNorm = norm(`${labs.medications || ''} ${labs.clinicalNotes || ''}`);
    if (hasWord(medsNorm, 'levotiroxina|eutirox|synthroid|hipotiroidismo')) {
      mappedIds.add('hipotiroidismo_metabolico');
    }
    if (hasWord(medsNorm, 'metformina|insulina|glibenclamida|glimepirida')) {
      mappedIds.add('resistencia_insulina_diabetes');
    }
    if (hasWord(medsNorm, 'losartan|enalapril|valsartan|captopril|espironolactona')) {
      mappedIds.add('hipertension_cardiovascular');
    }
    if (hasWord(medsNorm, 'atorvastatina|rosuvastatina|simvastatina|lovastatina')) {
      mappedIds.add('colesterol_trigliceridos');
    }
  }

  // Jerarquía de precedencia clínica: Si hay enfermedad renal (KDIGO), NO se activa hipertrofia hiperproteica (ISSN)
  const hasRenalPrecedence = mappedIds.has('salud_renal_kdigo');
  if (goal === 'masa_muscular' && !hasRenalPrecedence) {
    mappedIds.add('rendimiento_deportivo');
  }

  let protocols = MEDICAL_CONDITIONS.filter(c => mappedIds.has(c.id));

  // Ordenar por prioridad clínica: KDIGO renal > ADA diabetes > DASH hipertensión > resto
  const priorityOrder = [
    'salud_renal_kdigo',
    'resistencia_insulina_diabetes',
    'hipertension_cardiovascular',
    'colesterol_trigliceridos',
    'higado_graso_metabolico',
    'hipotiroidismo_metabolico',
    'sop_endocrino',
    'enfermedad_celiaca_gluten',
    'anemia_fatiga',
    'gastritis_digestion',
    'rendimiento_deportivo'
  ];
  protocols = protocols.sort((a, b) => priorityOrder.indexOf(a.id) - priorityOrder.indexOf(b.id));

  // Si no tiene condición médica específica, activamos el protocolo preventivo OMS/FAO honesto
  if (protocols.length === 0) {
    return [
      {
        id: 'oms_prevencion_integral',
        label: 'Alimentación Saludable y Preventiva (OMS / FAO)',
        source: 'Guías Globales OMS/FAO de Alimentación Saludable',
        keyRules:
          'Prioriza alimentos naturales (NOVA 1), 25–35 g de fibra diaria, proteína repartida en tus comidas principales (0.8–1.2 g/kg base; mayor si entrenas fuerza o eres adulto mayor) y cenas ligeras 2–3 horas antes de dormir.',
        alertRule: 'Moderar azúcares añadidos, harinas refinadas y ultraprocesados altos en sodio.'
      }
    ];
  }

  return protocols;
}

/**
 * Obtiene las alertas de farmacovigilancia alimento-medicamento ACTIVADAS POR MEDICAMENTO REAL DECLARADO.
 * Nunca muestra advertencias de warfarina, levotiroxina o estatinas a quien no declaró esos fármacos.
 */
export function resolveDrugNutrientInteractions(_protocols = [], userProfile = null) {
  const vh = userProfile?.voluntaryClinicalHistory;
  const declaredText = norm(
    [
      vh?.consentGranted ? vh.medications : '',
      vh?.consentGranted ? vh.clinicalNotes : '',
      userProfile?.medications || ''
    ]
      .filter(Boolean)
      .join(' ')
  );

  if (!declaredText.trim()) return [];

  return CLINICAL_DRUG_NUTRIENT_INTERACTIONS.filter(item =>
    (item.medicationKeywords || []).some(kw => hasWord(declaredText, kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  );
}

/**
 * Evalúa si un alimento es compatible con las alergias, intolerancias, gustos (dislikedFoods),
 * tipo de dieta (vegana, vegetariana, sin_gluten, sin_lactosa) y condiciones médicas de la persona.
 */
export function evaluateFoodPersonalCompatibility(food, userProfile = {}) {
  if (!food) return { compatible: true, level: 'optimal', reasons: [], clinicalTip: '' };

  const foodName = norm(food.name);
  const foodCat = norm(food.category);
  const foodTags = [
    ...(Array.isArray(food.allergens) ? food.allergens : []),
    ...(Array.isArray(food.allergensTags) ? food.allergensTags : []),
    ...(Array.isArray(food.traces) ? food.traces : []),
    ...(Array.isArray(food.tracesTags) ? food.tracesTags : [])
  ].map(norm);
  const ingredientsNorm = norm(food.ingredientsText || '');
  const allergies = (userProfile?.allergies || []).map(norm);
  const customAllergy = norm(userProfile?.customAllergy || '');
  const dislikedRaw = norm(userProfile?.dislikedFoods || '');
  const dietType = norm(userProfile?.dietType || 'omnivora');
  const protocols = resolveUserClinicalProtocols(userProfile);

  const reasons = [];
  let level = 'optimal'; // 'optimal' | 'caution' | 'avoid'

  const matchesWordOrTag = (kw) => {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(`(^|[^a-z0-9])${escaped}(s|es)?([^a-z0-9]|$)`);
    return rx.test(foodName) || rx.test(ingredientsNorm) || foodTags.some(t => t.includes(kw));
  };
  const matchesAnyKeyword = (keywords) => keywords.some(matchesWordOrTag);

  // 1. Alimentos que no le gustan (dislikedFoods)
  const dislikedTokens = dislikedRaw
    .split(/[,;.\n]+/)
    .map(t => t.trim())
    .filter(t => t.length >= 2);
  for (const token of dislikedTokens) {
    if (matchesWordOrTag(token)) {
      level = 'avoid';
      reasons.push(`Indicaste que no te gusta "${token}". Tu IA lo excluye de tus sugerencias.`);
    }
  }

  // 2. Alergias e intolerancias estructuradas + texto personalizado
  const customAllergyTokens = customAllergy
    .split(/[,;.\n]+/)
    .map(t => t.trim())
    .filter(t => t.length >= 2);
  for (const token of customAllergyTokens) {
    if (matchesWordOrTag(token)) {
      level = 'avoid';
      reasons.push(`Coincide con tu alergia/intolerancia registrada ("${token}").`);
    }
  }

  if (
    (allergies.some(a => a.includes('lactosa') || a.includes('lacteo') || a.includes('leche')) || dietType === 'sin_lactosa') &&
    matchesAnyKeyword(ALLERGEN_SYNONYM_MATRIX.lactosa)
  ) {
    level = 'avoid';
    reasons.push('Contiene lácteos/lactosa o derivados (suero/caseína). Te sugerimos tofu, huevo o bebida vegetal sin azúcar.');
  }

  if (
    (allergies.some(a => a.includes('gluten') || a.includes('trigo') || a.includes('celiac')) || dietType === 'sin_gluten') &&
    matchesAnyKeyword(ALLERGEN_SYNONYM_MATRIX.gluten)
  ) {
    level = 'avoid';
    reasons.push('Contiene trigo/gluten (TACC). Cambia por arepa de maíz, quinua, amaranto, arroz integral, yuca o papa.');
  }

  if (
    allergies.some(a => a.includes('huevo')) &&
    matchesAnyKeyword(ALLERGEN_SYNONYM_MATRIX.huevo)
  ) {
    level = 'avoid';
    reasons.push('Excluido por tu alergia al huevo.');
  }

  if (
    allergies.some(a => a.includes('marisco') || a.includes('pescado') || a.includes('camaron')) &&
    matchesAnyKeyword(ALLERGEN_SYNONYM_MATRIX.mariscos_pescado)
  ) {
    level = 'avoid';
    reasons.push('Excluido por alergia a pescados o mariscos.');
  }

  if (
    allergies.some(a => a.includes('mani') || a.includes('cacahuate') || a.includes('frutos secos') || a.includes('nuez') || a.includes('almendra')) &&
    matchesAnyKeyword(ALLERGEN_SYNONYM_MATRIX.mani_frutos_secos)
  ) {
    level = 'avoid';
    reasons.push('Excluido por alergia a maní/cacahuate o frutos secos de árbol.');
  }

  if (
    allergies.some(a => a.includes('soya') || a.includes('soja')) &&
    matchesAnyKeyword(ALLERGEN_SYNONYM_MATRIX.soya)
  ) {
    level = 'avoid';
    reasons.push('Excluido por alergia o intolerancia a la soya.');
  }

  // Advertencia de seguridad para productos externos escaneados sin metadatos verificados de alérgenos
  const userHasAnyAllergy =
    allergies.some(a => a !== 'ninguna') || customAllergyTokens.length > 0 || dietType === 'sin_gluten' || dietType === 'sin_lactosa';
  if (level !== 'avoid' && food.isExternalScan && !food.allergensVerified && userHasAnyAllergy) {
    level = 'caution';
    reasons.push('Producto externo sin trazas verificadas en laboratorio: revisa siempre la declaración de alérgenos del empaque físico.');
  }

  // 3. Tipo de alimentación (Vegana / Vegetariana)
  const isMeatOrFish =
    foodName.includes('pollo') ||
    foodName.includes('res') ||
    foodName.includes('pavo') ||
    foodName.includes('jamon') ||
    foodName.includes('salchicha') ||
    foodName.includes('hamburguesa') ||
    matchesAnyKeyword(ALLERGEN_SYNONYM_MATRIX.mariscos_pescado);

  const isAnimalProduct =
    isMeatOrFish ||
    matchesAnyKeyword(ALLERGEN_SYNONYM_MATRIX.huevo) ||
    matchesAnyKeyword(ALLERGEN_SYNONYM_MATRIX.lactosa);

  if (dietType === 'vegetariana' && isMeatOrFish) {
    level = 'avoid';
    reasons.push('No compatible con tu alimentación vegetariana (reemplaza por huevo, tofu, lentejas o garbanzos).');
  }
  if (dietType === 'vegana' && isAnimalProduct) {
    level = 'avoid';
    reasons.push('No compatible con tu alimentación 100% vegana (reemplaza por tofu, chochos, quinua, frijol o garbanzos).');
  }

  // 4. Cruce clínico con condiciones médicas (ADA, DASH, AHA, KDIGO, EASL)
  const hasDiabetes = protocols.some(p => p.id === 'resistencia_insulina_diabetes' || p.id === 'sop_endocrino');
  const hasHypertension = protocols.some(p => p.id === 'hipertension_cardiovascular');
  const hasCholesterol = protocols.some(p => p.id === 'colesterol_trigliceridos' || p.id === 'higado_graso_metabolico');
  const hasRenal = protocols.some(p => p.id === 'salud_renal_kdigo');

  // Distinguir fruta entera fresca NOVA 1 con matriz de fibra intacta de azúcares añadidos/ultraprocesados (ADA)
  const isWholeFreshFruitNova1 =
    Number(food.novaGroup) === 1 &&
    foodCat.includes('frutas') &&
    Number(food.fiber) >= 1.8 &&
    food.glycemicIndex !== 'Alto';

  if (level !== 'avoid') {
    if (hasRenal && (Number(food.sodiumMg) > 280 || Number(food.novaGroup) === 4)) {
      level = 'caution';
      reasons.push(`Protocolo Renal KDIGO: vigila sodio (${food.sodiumMg} mg/100g) y aditivos fosfatados de procesados.`);
    }
    if (hasHypertension && Number(food.sodiumMg) > 300) {
      level = 'caution';
      reasons.push(`Protocolo DASH: aporta ${food.sodiumMg} mg de sodio/100g. Modera la porción y acompáñalo con vegetales frescos.`);
    }
    if (
      hasDiabetes &&
      !isWholeFreshFruitNova1 &&
      (food.glycemicIndex === 'Alto' || (Number(food.sugar) > 12 && Number(food.novaGroup) >= 3))
    ) {
      level = 'caution';
      reasons.push('Protocolo ADA: carga glucémica alta o azúcares rápidos. Si lo consumes, aplica primero ensalada verde y proteína magra.');
    }
    if (hasCholesterol && (Number(food.novaGroup) === 4 || (Number(food.fat) > 18 && !foodCat.includes('grasas saludables') && !foodName.includes('salmon')))) {
      level = 'caution';
      reasons.push('Protocolo AHA/EASL: controla grasas saturadas/ultraprocesados y prioriza fibra soluble (avena, legumbres) y Omega-3.');
    }
  }

  let clinicalTip = 'Alimento natural (NOVA 1) compatible con tus requerimientos metabólicos diarios.';
  if (isWholeFreshFruitNova1 && hasDiabetes) {
    clinicalTip = 'Guía ADA: Fruta entera natural (NOVA 1) con fibra intacta. Consúmela entera (nunca en jugo colado) y mejor junto a proteína o semillas.';
  } else if (foodCat.includes('proteina') || foodCat.includes('lacteos')) {
    clinicalTip = hasRenal
      ? 'Proteína de alto valor biológico; ajusta los gramos a la pauta de protección renal KDIGO.'
      : 'Excelente perfil de aminoácidos esenciales (leucina) para preservar masa muscular y saciedad por 4+ horas (ISSN/ESPEN).';
  } else if (foodCat.includes('legumbres') || Number(food.fiber) >= 4) {
    clinicalTip = 'Su matriz de fibra soluble y almidón resistente frena el pico de glucosa posprandial (ADA) y reduce colesterol LDL (AHA).';
  } else if (Number(food.potassiumMg) >= 350 && !hasRenal) {
    clinicalTip = `Rico en potasio biodisponible (${food.potassiumMg} mg/100g), clave en el protocolo DASH para regular la presión arterial.`;
  }

  return {
    compatible: level !== 'avoid',
    level,
    badgeText:
      level === 'optimal'
        ? 'Compatible con tu perfil clínico'
        : level === 'caution'
          ? 'Moderar según tu protocolo'
          : 'Excluido por tus alergias/preferencias',
    reasons,
    clinicalTip
  };
}

/**
 * Filtra la base de datos de alimentos devolviendo solo aquellos compatibles
 * con las alergias, disgustos, tipo de dieta y país de la persona (NUNCA hace fallback a alérgenos).
 */
export function getSafeFoodsForUser(userProfile = {}) {
  const countryId = userProfile?.country || 'CO';
  const evaluated = GLOBAL_FOOD_DATABASE.map(f => ({
    food: f,
    compat: evaluateFoodPersonalCompatibility(f, userProfile)
  })).filter(item => item.compat.compatible);

  return evaluated
    .sort((a, b) => {
      // Priorizar 'optimal' sobre 'caution'
      const aOpt = a.compat.level === 'optimal' ? 1 : 0;
      const bOpt = b.compat.level === 'optimal' ? 1 : 0;
      if (bOpt !== aOpt) return bOpt - aOpt;

      const aLoc = a.food.regions.includes(countryId) ? 1 : 0;
      const bLoc = b.food.regions.includes(countryId) ? 1 : 0;
      if (bLoc !== aLoc) return bLoc - aLoc;
      return b.food.qualityScore - a.food.qualityScore;
    })
    .map(item => item.food);
}

/**
 * Analiza médicamente todos los registros de comida de un día SIN INVENTAR MICRONUTRIENTES.
 * Si un registro carece de sodio, potasio, hierro o calcio, se contabiliza como null y se reporta
 * el porcentaje real de cobertura (`coverage`), emitiendo alertas solo con datos verificados.
 */
export function analyzeDayClinicalMetrics({ dayLogs = [], userProfile = {} }) {
  const protocols = resolveUserClinicalProtocols(userProfile);
  const targets = userProfile?.clinicalTargets || {
    fiberGrams: 28,
    sodiumMaxMg: 2000,
    potassiumTargetMg: 3500,
    omega3TargetMg: 1000,
    ironTargetMg: 14,
    calciumTargetMg: 1000,
    vitaminCTargetMg: 85,
    glycemicLoadMaxDaily: 100
  };

  let totalKcal = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFiber = 0;
  let totalSodiumMg = 0;
  let totalPotassiumMg = 0;
  let totalIronMg = 0;
  let totalCalciumMg = 0;
  let totalVitaminCMg = 0;
  let totalOmega3Mg = 0;
  let totalGlycemicLoad = 0;
  let anabolicMealsCount = 0;
  let dinnerKcal = 0;

  let sodiumKnownCount = 0;
  let potassiumKnownCount = 0;
  let ironKnownCount = 0;
  let calciumKnownCount = 0;
  let vitaminCKnownCount = 0;
  let omega3KnownCount = 0;

  const byMealType = { Desayuno: [], Almuerzo: [], Merienda: [], Cena: [] };

  const resolveOptionalNumber = (directVal, scaledVal) => {
    if (directVal !== undefined && directVal !== null && directVal !== '' && Number.isFinite(Number(directVal))) {
      return Number(directVal);
    }
    if (scaledVal !== undefined && scaledVal !== null && Number.isFinite(Number(scaledVal))) {
      return Number(scaledVal);
    }
    return null;
  };

  dayLogs.forEach(entry => {
    const refFood = entry.foodId
      ? GLOBAL_FOOD_DATABASE.find(f => f.id === entry.foodId)
      : null;
    const scaled = refFood ? scaleFoodPortion(refFood, entry.grams || 100) : null;

    const kcal = Number(entry.kcal ?? entry.totalCalories) || 0;
    const protein = Number(entry.protein ?? entry.proteinGrams) || 0;
    const carbs = Number(entry.carbs ?? entry.carbsGrams) || 0;
    const fat = Number(entry.fat ?? entry.fatGrams) || 0;
    const fiber = Number(entry.fiber ?? entry.fiberGrams ?? scaled?.fiber) || 0;

    // CERO valores inventados a partir de calorías: solo datos reales o null
    const sodiumMg = resolveOptionalNumber(entry.sodiumMg, scaled?.sodiumMg);
    const potassiumMg = resolveOptionalNumber(entry.potassiumMg, scaled?.potassiumMg);
    const ironMg = resolveOptionalNumber(entry.ironMg, scaled?.ironMg);
    const calciumMg = resolveOptionalNumber(entry.calciumMg, scaled?.calciumMg);
    const vitaminCMg = resolveOptionalNumber(entry.vitaminCMg, scaled?.vitaminCMg);
    const omega3Mg = resolveOptionalNumber(entry.omega3Mg, scaled?.omega3Mg);

    const netCarbs = Math.max(0, carbs - fiber);
    const glycemicLoad =
      resolveOptionalNumber(entry.glycemicLoad, scaled?.glycemicLoad) ??
      Number(((netCarbs * 48) / 100).toFixed(1));

    totalKcal += kcal;
    totalProtein += protein;
    totalCarbs += carbs;
    totalFat += fat;
    totalFiber += fiber;
    if (sodiumMg !== null) {
      totalSodiumMg += sodiumMg;
      sodiumKnownCount += 1;
    }
    if (potassiumMg !== null) {
      totalPotassiumMg += potassiumMg;
      potassiumKnownCount += 1;
    }
    if (ironMg !== null) {
      totalIronMg = Number((totalIronMg + ironMg).toFixed(1));
      ironKnownCount += 1;
    }
    if (calciumMg !== null) {
      totalCalciumMg += calciumMg;
      calciumKnownCount += 1;
    }
    if (vitaminCMg !== null) {
      totalVitaminCMg += vitaminCMg;
      vitaminCKnownCount += 1;
    }
    if (omega3Mg !== null) {
      totalOmega3Mg += omega3Mg;
      omega3KnownCount += 1;
    }
    totalGlycemicLoad = Number((totalGlycemicLoad + glycemicLoad).toFixed(1));

    if (entry.mealType === 'Cena') {
      dinnerKcal += kcal;
    }
    if (byMealType[entry.mealType]) {
      byMealType[entry.mealType].push({
        ...entry,
        protein,
        ironMg,
        vitaminCMg,
        sodiumMg,
        glycemicLoad
      });
    }
  });

  Object.values(byMealType).forEach(items => {
    const mealProt = items.reduce((s, i) => s + i.protein, 0);
    if (mealProt >= 24) anabolicMealsCount += 1;
  });

  const n = dayLogs.length;
  const pct = count => (n > 0 ? Math.round((count / n) * 100) : 0);
  const coverage = {
    totalEntries: n,
    sodiumPct: pct(sodiumKnownCount),
    potassiumPct: pct(potassiumKnownCount),
    ironPct: pct(ironKnownCount),
    calciumPct: pct(calciumKnownCount),
    vitaminCPct: pct(vitaminCKnownCount),
    omega3Pct: pct(omega3KnownCount)
  };

  const naKRatio =
    sodiumKnownCount > 0 && potassiumKnownCount > 0 && totalPotassiumMg > 0
      ? Number((totalSodiumMg / totalPotassiumMg).toFixed(2))
      : null;
  const glycemicLoadLevel =
    totalGlycemicLoad <= 75 ? 'Baja (Estable)' : totalGlycemicLoad <= 110 ? 'Moderada' : 'Alta (Vigilar picos)';
  const ironSynergyActive = ironKnownCount > 0 && totalIronMg >= 4 && totalVitaminCMg >= 25;

  const clinicalFindings = [];
  if (n > 0) {
    if (sodiumKnownCount > 0 && totalSodiumMg > targets.sodiumMaxMg) {
      clinicalFindings.push(
        `Alerta DASH/KDIGO: el sodio verificado (${totalSodiumMg} mg, cobertura ${coverage.sodiumPct}%) supera tu tope diario (${targets.sodiumMaxMg} mg). Hidrátate y prioriza vegetales frescos sin sal añadida.`
      );
    }
    if (coverage.ironPct >= 50 && totalIronMg >= 3.5 && vitaminCKnownCount > 0 && totalVitaminCMg < 20) {
      clinicalFindings.push(
        `Sinergia de Hierro OMS: llevas ${totalIronMg} mg de hierro pero poca Vitamina C (${totalVitaminCMg} mg). Agrega limón, guayaba, naranja o pimiento para mejorar su absorción.`
      );
    }
    if (totalGlycemicLoad > targets.glycemicLoadMaxDaily) {
      clinicalFindings.push(
        `Control Glucémico ADA: la carga glucémica acumulada (${totalGlycemicLoad}) es elevada. Acompaña tu próxima toma con fibra soluble y camina 10–15 min.`
      );
    }
    if (dinnerKcal > totalKcal * 0.42 && totalKcal > 900) {
      clinicalFindings.push(
        `Distribución energética: la cena concentra más del 40% de tus calorías del día. Repartir más energía en desayuno y almuerzo favorece la glucemia y el descanso.`
      );
    }
  }

  return {
    totals: {
      kcal: totalKcal,
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat,
      fiber: totalFiber,
      sodiumMg: sodiumKnownCount > 0 ? totalSodiumMg : null,
      potassiumMg: potassiumKnownCount > 0 ? totalPotassiumMg : null,
      ironMg: ironKnownCount > 0 ? totalIronMg : null,
      calciumMg: calciumKnownCount > 0 ? totalCalciumMg : null,
      vitaminCMg: vitaminCKnownCount > 0 ? totalVitaminCMg : null,
      omega3Mg: omega3KnownCount > 0 ? totalOmega3Mg : null,
      glycemicLoad: totalGlycemicLoad
    },
    coverage,
    targets,
    naKRatio,
    glycemicLoadLevel,
    ironSynergyActive,
    anabolicMealsCount,
    clinicalFindings,
    protocols
  };
}

/**
 * Construye el contexto clínico y personal completo de la persona (los 13 pasos + estado de hoy)
 * tanto para la IA Proactiva como para el Coach IA con RAG.
 */
export function buildCompletePersonContext(userProfile = {}, workspace = {}, currentHour = new Date().getHours()) {
  const todayIso = getLocalTodayIso();
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
    profileConfigured: Boolean(userProfile?.dailyCalories),
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

  // 2. Acción de hidratación proactiva (con precaución nefrológica KDIGO si aplica)
  const hasRenal = ctx.protocols.some(p => p.id === 'salud_renal_kdigo');
  if (waterBehind) {
    immediateActions.push({
      id: 'act-water',
      priority: 'Hábito inmediato',
      category: 'Hidratación',
      title: `Toma 1 vaso de agua ahora (llevas ${ctx.waterGlassesToday} de ${expectedGlassesByNow} sugeridos para esta hora)`,
      detail: hasRenal
        ? `Tu referencia orientativa es ${ctx.goals.waterMl} ml/día. Por tu protocolo renal (KDIGO), ajusta siempre el volumen total de líquidos a la pauta de tu nefrólogo.`
        : `Para tu peso de ${userProfile?.weightKg || 67} kg tu meta es ${ctx.goals.waterMl} ml/día. Hidratarte antes de las comidas mejora la saciedad y evita confundir sed con antojos.`,
      clinicalBasis: hasRenal
        ? 'Guía KDIGO: balance hídrico individualizado según función renal y diuresis.'
        : 'Guía OMS/EFSA de Hidratación: 35 ml/kg/día mantienen el volumen plasmático y la termogénesis.',
      actionType: 'add_water',
      actionLabel: '+ Sumar 1 vaso de agua (250 ml)'
    });
  }

  // 3. Micro-intervención clínica según lo que lleva en el día o su condición médica
  const hasDiabetes = ctx.protocols.some(p => p.id === 'resistencia_insulina_diabetes' || p.id === 'sop_endocrino');
  const hasHypertension = ctx.protocols.some(p => p.id === 'hipertension_cardiovascular');
  const hasCholesterol = ctx.protocols.some(p => p.id === 'colesterol_trigliceridos' || p.id === 'higado_graso_metabolico');
  const hasThyroid = ctx.protocols.some(p => p.id === 'hipotiroidismo_metabolico');
  const drugNutrientInteractions = resolveDrugNutrientInteractions(ctx.protocols, userProfile);

  if (hasRenal) {
    immediateActions.push({
      id: 'act-clinical-kdigo',
      priority: 'Protocolo Médico KDIGO',
      category: 'Protección Renal',
      title: 'Evita aditivos fosfatados y modera el sodio (<1,500–2,000 mg/día)',
      detail: 'Prioriza alimentos frescos preparados en casa sobre embutidos o bebidas oscuras, y mantén tu proteína en el rango seguro indicado por tu especialista.',
      clinicalBasis: 'Guía KDIGO: el fósforo inorgánico de ultraprocesados se absorbe >90% frente a <50% del fósforo natural.',
      actionType: 'none'
    });
  } else if (hasDiabetes) {
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
  } else if (hasThyroid) {
    immediateActions.push({
      id: 'act-clinical-ata',
      priority: 'Protocolo Endocrino ATA',
      category: 'Salud Tiroidea',
      title: 'Separa tu medicación tiroidea del café y asegura selenio + proteína',
      detail: 'Si tomas levotiroxina en ayunas, espera 45–60 min antes de tomar café o desayunar. Incluye huevo, pescado y semillas para aportar selenio y zinc.',
      clinicalBasis: 'American Thyroid Association (ATA): el café y el calcio/hierro simultáneos reducen hasta un 40% la absorción de levotiroxina.',
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
    drugNutrientInteractions,
    context: ctx,
    profileAuditSummary: `Objetivo: ${userProfile?.goal || 'salud'} · Dieta: ${userProfile?.dietType || 'omnívora'}${
      (userProfile?.allergies || []).length ? ` · Alergias: ${userProfile.allergies.join(', ')}` : ''
    }${userProfile?.dislikedFoods ? ` · Excluye: ${userProfile.dislikedFoods}` : ''} · Tiempo cocina: ${ctx.cookingTimeLabel} · Presupuesto: ${ctx.budget.id}`
  };
}
