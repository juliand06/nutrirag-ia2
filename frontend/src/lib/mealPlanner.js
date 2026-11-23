// Generador de Menú Semanal (7 días) con fotos reales, filtrado por los 13 puntos del perfil
// (alergias, disgustos, tipo de dieta, tiempo de cocina, condiciones clínicas y país)
// y Lista de Compras por Pasillo.
import { GLOBAL_FOOD_DATABASE, scaleFoodPortion } from '../services/foodDatabase';
import { getSafeFoodsForUser, resolveUserClinicalProtocols } from './proactiveAiEngine';

const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const MEAL_IMAGES = {
  Desayuno: '/img/plato-desayuno.webp',
  Almuerzo: '/img/plato-almuerzo.webp',
  Merienda: '/img/plato-merienda.webp',
  Cena: '/img/plato-cena.webp'
};

const COUNTRY_CURRENCY = {
  CO: { symbol: '$', code: 'COP', multiplier: 4200 },
  MX: { symbol: '$', code: 'MXN', multiplier: 18 },
  PE: { symbol: 'S/', code: 'PEN', multiplier: 3.7 },
  AR: { symbol: '$', code: 'ARS', multiplier: 980 },
  CL: { symbol: '$', code: 'CLP', multiplier: 940 },
  EC: { symbol: '$', code: 'USD', multiplier: 1 },
  US: { symbol: '$', code: 'USD', multiplier: 1.2 },
  ES: { symbol: '€', code: 'EUR', multiplier: 1.05 }
};

export function buildMealFromFoods(mealType, foodObjects, targetMealKcal = 500) {
  const validFoods = foodObjects.filter(Boolean);
  const rawFoods = validFoods.map(f => ({ food: f, grams: f.defaultGrams || 120 }));
  const baseKcal = rawFoods.reduce((acc, it) => acc + scaleFoodPortion(it.food, it.grams).kcal, 0);
  const factor = Math.max(0.7, Math.min(1.45, targetMealKcal / Math.max(1, baseKcal)));

  const items = rawFoods.map(it => {
    const grams = Math.max(15, Math.round((it.grams * factor) / 5) * 5);
    const scaled = scaleFoodPortion(it.food, grams);
    return { food: it.food, ...scaled };
  });

  const totals = items.reduce(
    (acc, it) => ({
      kcal: acc.kcal + it.kcal,
      carbs: acc.carbs + it.carbs,
      protein: acc.protein + it.protein,
      fat: acc.fat + it.fat,
      fiber: acc.fiber + it.fiber
    }),
    { kcal: 0, carbs: 0, protein: 0, fat: 0, fiber: 0 }
  );

  return {
    id: `meal-${mealType}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    mealType,
    image: MEAL_IMAGES[mealType] || '/img/plato-almuerzo.webp',
    dishName: items.map(i => `${i.food.name.split('(')[0].trim()} (${i.grams}g)`).join(' + '),
    items,
    ...totals
  };
}

export function generateWeeklyPlan({
  targetCalories = 2000,
  dietStyle = 'equilibrada',
  countryId = 'CO',
  userProfile = null
}) {
  const effectiveProfile = userProfile || { country: countryId, dietType: dietStyle };
  const safePool = getSafeFoodsForUser(effectiveProfile);

  const proteins = safePool.filter(f => f.category === 'Proteínas' || f.category === 'Lácteos y Huevos');
  const carbs = safePool.filter(f => f.category === 'Carbohidratos' || f.category === 'Legumbres');
  const produce = safePool.filter(f => f.category === 'Frutas y Verduras' || f.category === 'Grasas Saludables');

  const pick = (arr, idx) => (arr.length > 0 ? arr[idx % arr.length] : safePool[idx % safePool.length]);

  return DAYS_OF_WEEK.map((dayName, dayIdx) => {
    const mealConfigs = [
      {
        mealType: 'Desayuno',
        share: 0.26,
        foods: [pick(proteins, dayIdx), pick(carbs, dayIdx + 1), pick(produce, dayIdx)]
      },
      {
        mealType: 'Almuerzo',
        share: 0.36,
        foods: [pick(proteins, dayIdx + 1), pick(carbs, dayIdx + 2), pick(produce, dayIdx + 1)]
      },
      {
        mealType: 'Merienda',
        share: 0.13,
        foods: [pick(produce, dayIdx + 2), pick(proteins, dayIdx + 2)]
      },
      {
        mealType: 'Cena',
        share: 0.25,
        foods: [pick(proteins, dayIdx + 3), pick(produce, dayIdx + 3), pick(carbs, dayIdx)]
      }
    ];

    const meals = mealConfigs.map(cfg =>
      buildMealFromFoods(cfg.mealType, cfg.foods, Math.round(targetCalories * cfg.share))
    );

    const dayTotals = meals.reduce(
      (acc, m) => ({
        kcal: acc.kcal + m.kcal,
        carbs: acc.carbs + m.carbs,
        protein: acc.protein + m.protein,
        fat: acc.fat + m.fat
      }),
      { kcal: 0, carbs: 0, protein: 0, fat: 0 }
    );

    return {
      dayIndex: dayIdx,
      dayName,
      meals,
      dayTotals
    };
  });
}

export function regenerateMealInDay(weeklyPlan, dayIndex, mealType, targetCalories = 2000, userProfile = null) {
  const safePool = getSafeFoodsForUser(userProfile || { country: 'CO' });
  const proteins = safePool.filter(f => f.category === 'Proteínas' || f.category === 'Lácteos y Huevos');
  const carbs = safePool.filter(f => f.category === 'Carbohidratos' || f.category === 'Legumbres');
  const produce = safePool.filter(f => f.category === 'Frutas y Verduras' || f.category === 'Grasas Saludables');

  const rand = arr => (arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : GLOBAL_FOOD_DATABASE[0]);
  const chosenFoods =
    mealType === 'Merienda' ? [rand(produce), rand(proteins)] : [rand(proteins), rand(carbs), rand(produce)];

  const share =
    mealType === 'Desayuno' ? 0.26 : mealType === 'Almuerzo' ? 0.36 : mealType === 'Merienda' ? 0.13 : 0.25;
  const newMeal = buildMealFromFoods(mealType, chosenFoods, Math.round(targetCalories * share));

  return weeklyPlan.map((day, idx) => {
    if (idx !== dayIndex) return day;
    const meals = day.meals.map(m => (m.mealType === mealType ? newMeal : m));
    const dayTotals = meals.reduce(
      (acc, m) => ({
        kcal: acc.kcal + m.kcal,
        carbs: acc.carbs + m.carbs,
        protein: acc.protein + m.protein,
        fat: acc.fat + m.fat
      }),
      { kcal: 0, carbs: 0, protein: 0, fat: 0 }
    );
    return { ...day, meals, dayTotals };
  });
}

export function explainWeeklyPlanClinicalRationale(userProfile = {}) {
  const protocols = resolveUserClinicalProtocols(userProfile);
  return {
    protocols,
    exclusionsText:
      userProfile?.dislikedFoods || (userProfile?.allergies || []).length
        ? `Excluimos automáticamente: ${[...(userProfile?.allergies || []), userProfile?.customAllergy, userProfile?.dislikedFoods].filter(Boolean).join(', ')}.`
        : 'Sin alergias ni exclusiones activas; priorizamos alimentos frescos NOVA 1 de temporada.',
    cookingText:
      userProfile?.cookingTime === '15_min'
        ? 'Priorizamos preparaciones rápidas de 15 minutos o menos (plancha, huevos, ensaladas y porciones listas).'
        : 'Adaptado a tus tiempos de cocina y horarios habituales.'
  };
}

export function buildGroceryListFromWeeklyPlan(weeklyPlan = [], countryId = 'CO', budgetTier = 'equilibrado') {
  const map = new Map();
  weeklyPlan.forEach(day => {
    (day.meals || []).forEach(meal => {
      (meal.items || []).forEach(item => {
        const f = item.food;
        if (!f) return;
        const prev = map.get(f.id) || {
          id: f.id,
          name: f.name.split('(')[0].trim(),
          category: f.category,
          totalGrams: 0
        };
        prev.totalGrams += Number(item.grams) || 100;
        map.set(f.id, prev);
      });
    });
  });

  const curr = COUNTRY_CURRENCY[countryId] || COUNTRY_CURRENCY.CO;
  const tierFactor = budgetTier === 'economico' ? 0.82 : budgetTier === 'amplio' ? 1.25 : 1.0;

  const aisleMap = {
    'Frutas y Verduras': 'Plaza y Fruver (Frutas y verduras)',
    'Proteínas': 'Carnicería, Pescadería y Proteínas',
    'Lácteos y Huevos': 'Huevos y Lácteos frescos',
    'Carbohidratos': 'Despensa, Granos y Tubérculos',
    'Legumbres': 'Despensa, Granos y Tubérculos',
    'Grasas Saludables': 'Aceites, Semillas y Grasas buenas'
  };

  const aisles = {};
  let totalUsdBase = 0;

  Array.from(map.values()).forEach(entry => {
    const aisleName = aisleMap[entry.category] || 'Despensa general';
    if (!aisles[aisleName]) aisles[aisleName] = [];

    const usdPerKg =
      entry.category === 'Proteínas'
        ? 6.8
        : entry.category === 'Lácteos y Huevos'
          ? 4.2
          : entry.category === 'Grasas Saludables'
            ? 5.5
            : 2.4;

    const itemUsd = (entry.totalGrams / 1000) * usdPerKg * tierFactor;
    totalUsdBase += itemUsd;
    const localPrice = Math.round(itemUsd * curr.multiplier);

    aisles[aisleName].push({
      id: entry.id,
      name: entry.name,
      totalGrams: Math.round(entry.totalGrams),
      displayAmount:
        entry.totalGrams >= 1000
          ? `${(entry.totalGrams / 1000).toFixed(1)} kg`
          : `${Math.round(entry.totalGrams)} g`,
      estimatedPriceFormatted: `${curr.symbol}${localPrice.toLocaleString('es-CO')} ${curr.code}`
    });
  });

  const totalLocal = Math.round(totalUsdBase * curr.multiplier);
  return {
    aisles,
    totalEstimatedFormatted: `${curr.symbol}${totalLocal.toLocaleString('es-CO')} ${curr.code}`
  };
}
