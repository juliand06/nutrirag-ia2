// Integración Open Food Facts API (código de barras + búsqueda abierta)
// + Importación CSV (MyFitnessPal / Cronometer / Google Fit / Apple Health)

import { GLOBAL_FOOD_DATABASE } from './foodDatabase';

function computeYukaScore({ nutriGrade, novaGroup, sugar100g, sodiumMg100g, fiber100g, additivesCount }) {
  let score = 78;
  const gradeMap = { A: 16, B: 8, C: -4, D: -18, E: -30 };
  score += gradeMap[(nutriGrade || '').toUpperCase()] ?? 0;
  if (novaGroup === 1) score += 10;
  else if (novaGroup === 3) score -= 6;
  else if (novaGroup === 4) score -= 20;
  if (sugar100g > 15) score -= 12;
  if (sodiumMg100g > 500) score -= 10;
  if (fiber100g >= 4) score += 8;
  score -= Math.min(18, (additivesCount || 0) * 3);
  return Math.max(5, Math.min(100, Math.round(score)));
}

export async function lookupBarcodeOpenFoodFacts(barcode) {
  const clean = String(barcode || '').replace(/[^0-9]/g, '');
  if (clean.length < 6) {
    throw new Error('Ingresa un código de barras válido (mínimo 6 dígitos).');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(clean)}.json`,
    { headers: { Accept: 'application/json' }, signal: controller.signal }
  );
  clearTimeout(timer);
  if (!res.ok) {
    throw new Error('No se pudo consultar Open Food Facts en este momento.');
  }
  const data = await res.json();
  if (data.status !== 1 || !data.product) {
    throw new Error(`No encontramos el código ${clean} en Open Food Facts.`);
  }

  const p = data.product;
  const n = p.nutriments || {};
  const kcal = Math.round(
    Number(n['energy-kcal_100g'] || n['energy-kcal'] || (Number(n.energy_100g || 0) / 4.184) || 0)
  );
  const carbs = Math.round(Number(n.carbohydrates_100g || 0));
  const protein = Math.round(Number(n.proteins_100g || 0));
  const fat = Math.round(Number(n.fat_100g || 0));
  const fiber = Math.round(Number(n.fiber_100g || 0));
  const sugar = Math.round(Number(n.sugars_100g || 0));
  const sodiumMg =
    n.sodium_100g !== undefined
      ? Math.round(Number(n.sodium_100g || 0) * 1000)
      : Math.round(Number(n.salt_100g || 0) * 400);
  const nutriGrade = (p.nutriscore_grade || 'c').toUpperCase();
  const validGrade = ['A', 'B', 'C', 'D', 'E'].includes(nutriGrade) ? nutriGrade : 'C';
  const novaGroup = Number(p.nova_group) || 3;
  const additives = Array.isArray(p.additives_tags)
    ? p.additives_tags.map(t => t.replace(/^en:/, '').toUpperCase())
    : [];
  const allergensTags = Array.isArray(p.allergens_tags)
    ? p.allergens_tags.map(t => t.replace(/^[a-z]{2}:/, '').toLowerCase())
    : [];
  const tracesTags = Array.isArray(p.traces_tags)
    ? p.traces_tags.map(t => t.replace(/^[a-z]{2}:/, '').toLowerCase())
    : [];
  const ingredientsText = p.ingredients_text_es || p.ingredients_text || '';
  const allergensVerified = Boolean(allergensTags.length > 0 && ingredientsText.length > 3);

  const qualityScore = computeYukaScore({
    nutriGrade: validGrade,
    novaGroup,
    sugar100g: sugar,
    sodiumMg100g: sodiumMg,
    fiber100g: fiber,
    additivesCount: additives.length
  });

  // Alternativas más saludables de nuestra base local/USDA/ICBF
  const alternatives =
    qualityScore < 75
      ? GLOBAL_FOOD_DATABASE.filter(f => f.qualityScore >= 90).slice(0, 3)
      : [];

  return {
    barcode: clean,
    name: p.product_name_es || p.product_name || `Producto ${clean}`,
    brand: p.brands || 'Marca no especificada',
    imageUrl: p.image_front_small_url || p.image_url || null,
    kcal,
    carbs,
    protein,
    fat,
    fiber,
    sugar,
    sodiumMg,
    nutriGrade: validGrade,
    novaGroup,
    qualityScore,
    ingredientsText: ingredientsText || 'Ingredientes no especificados en etiqueta.',
    allergens: allergensTags,
    allergensTags,
    traces: tracesTags,
    tracesTags,
    isExternalScan: true,
    allergensVerified,
    additives,
    alternatives
  };
}

export async function searchOpenFoodFactsCatalog(query) {
  const q = (query || '').trim();
  if (q.length < 3) return [];
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=6`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.products || [])
      .filter(p => p.product_name || p.product_name_es)
      .map(p => {
        const n = p.nutriments || {};
        const gradeRaw = (p.nutriscore_grade || 'b').toUpperCase();
        const nutriGrade = ['A', 'B', 'C', 'D', 'E'].includes(gradeRaw) ? gradeRaw : 'B';
        const novaGroup = Number(p.nova_group) || 3;
        const sugar = Math.round(Number(n.sugars_100g || 0));
        const sodiumMg = Math.round(Number(n.sodium_100g || 0) * 1000);
        const fiber = Math.round(Number(n.fiber_100g || 0));
        const qualityScore = computeYukaScore({
          nutriGrade,
          novaGroup,
          sugar100g: sugar,
          sodiumMg100g: sodiumMg,
          fiber100g: fiber,
          additivesCount: (p.additives_tags || []).length
        });
        return {
          id: `off-${p.code || Math.random().toString(36).slice(2, 8)}`,
          name: `${p.product_name_es || p.product_name}${p.brands ? ` (${p.brands.split(',')[0]})` : ''}`,
          category: 'Open Food Facts',
          regions: ['GLOBAL'],
          defaultGrams: 100,
          kcal: Math.round(Number(n['energy-kcal_100g'] || 0)),
          carbs: Math.round(Number(n.carbohydrates_100g || 0)),
          protein: Math.round(Number(n.proteins_100g || 0)),
          fat: Math.round(Number(n.fat_100g || 0)),
          fiber,
          sugar,
          sodiumMg,
          potassiumMg: Math.round(Number(n.potassium_100g || 0) * 1000),
          ironMg: Number((Number(n.iron_100g || 0) * 1000).toFixed(1)),
          calciumMg: Math.round(Number(n.calcium_100g || 0) * 1000),
          vitaminCMg: Math.round(Number(n['vitamin-c_100g'] || 0) * 1000),
          omega3Mg: 0,
          qualityScore,
          nutriGrade,
          novaGroup,
          glycemicIndex: sugar > 15 ? 'Alto' : 'Medio',
          clinicalTag: `Open Food Facts · NOVA ${novaGroup}`
        };
      });
  } catch {
    return [];
  }
}

/**
 * Importador CSV universal (MyFitnessPal / Cronometer / Google Fit / Apple Health exports).
 * Detecta columnas por nombre y devuelve comidas y/o registros de bienestar listos para guardar.
 */
export function parseNutritionCsvImport(csvText) {
  const lines = String(csvText || '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    throw new Error('El archivo CSV debe contener encabezados y al menos una fila de datos.');
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const findCol = (candidates) =>
    headers.findIndex(h => candidates.some(c => h.includes(c)));

  const colDate = findCol(['date', 'fecha', 'day']);
  const colName = findCol(['food', 'dish', 'meal', 'alimento', 'plato', 'name', 'nombre']);
  const colKcal = findCol(['calor', 'kcal', 'energy']);
  const colCarbs = findCol(['carb']);
  const colProtein = findCol(['prot']);
  const colFat = findCol(['fat', 'grasa']);
  const colSteps = findCol(['step', 'paso']);
  const colWeight = findCol(['weight', 'peso']);

  const importedMeals = [];
  const importedWellness = [];
  const today = new Date().toISOString().slice(0, 10);

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const dateVal = colDate >= 0 && cols[colDate] ? cols[colDate].slice(0, 10) : today;

    if (colKcal >= 0 && Number(cols[colKcal]) > 0) {
      importedMeals.push({
        id: `csv-meal-${Date.now()}-${i}`,
        date: /^\d{4}-\d{2}-\d{2}$/.test(dateVal) ? dateVal : today,
        time: '12:00',
        mealType: 'Importado CSV',
        dishName: colName >= 0 && cols[colName] ? cols[colName] : `Registro importado #${i}`,
        totalCalories: Math.round(Number(cols[colKcal]) || 0),
        carbsGrams: Math.round(Number(colCarbs >= 0 ? cols[colCarbs] : 0) || 0),
        proteinGrams: Math.round(Number(colProtein >= 0 ? cols[colProtein] : 0) || 0),
        fatGrams: Math.round(Number(colFat >= 0 ? cols[colFat] : 0) || 0),
        fiberGrams: 0,
        qualityScore: 80,
        nutriGrade: 'B',
        glycemicLoad: 'Importado CSV',
        nutritionalAdvice: 'Importado desde archivo externo (MyFitnessPal / Cronometer / Health).'
      });
    }

    if ((colSteps >= 0 && Number(cols[colSteps]) > 0) || (colWeight >= 0 && Number(cols[colWeight]) > 20)) {
      importedWellness.push({
        id: `csv-well-${Date.now()}-${i}`,
        date: /^\d{4}-\d{2}-\d{2}$/.test(dateVal) ? dateVal : today,
        steps: colSteps >= 0 ? Math.round(Number(cols[colSteps]) || 0) : 0,
        weightKg: colWeight >= 0 ? Number(cols[colWeight]) || 0 : 0,
        sleepHours: 7.5,
        mood: 4,
        digestiveNote: 'Importado desde Google Fit / Apple Health CSV'
      });
    }
  }

  return { importedMeals, importedWellness };
}
