// Servicio de Visión IA Multimodal para Fotos de Comida Reales
// Comprime fotos de cámara en cliente, consulta /api/analyze-meal-photo (Netlify AI Gateway + Gemini Vision)
// sin exponer claves ni PII, y recalcula en tiempo real calorías, macros, micronutrientes y carga glucémica.

import {
  resolveUserClinicalProtocols,
  evaluateFoodPersonalCompatibility
} from '../lib/proactiveAiEngine';

/**
 * Comprime una imagen (File o Blob) en el navegador usando <canvas>
 * para enviarla rápido a Visión IA (máx. 1024px) y genera una miniatura ligera para el Diario.
 */
export function compressMealImageFile(file, maxDimension = 1024, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file || !String(file.type || '').startsWith('image/')) {
      reject(new Error('Por favor selecciona un archivo de imagen válido (JPG, PNG o WebP).'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No pudimos leer la imagen seleccionada.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('El archivo no es una fotografía válida.'));
      img.onload = () => {
        // 1. Versión optimizada para Visión IA (máx. 1024px)
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const targetW = Math.max(1, Math.round(img.width * scale));
        const targetH = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.split(',')[1] || '';

        // 2. Miniatura ligera para guardar en el Diario sin saturar localStorage (máx. 320px)
        const thumbScale = Math.min(1, 320 / Math.max(img.width, img.height));
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = Math.max(1, Math.round(img.width * thumbScale));
        thumbCanvas.height = Math.max(1, Math.round(img.height * thumbScale));
        const thumbCtx = thumbCanvas.getContext('2d');
        thumbCtx.drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);
        const thumbnailDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.72);

        resolve({
          base64,
          mimeType: 'image/jpeg',
          previewDataUrl: dataUrl,
          thumbnailDataUrl,
          width: targetW,
          height: targetH
        });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Recalcula totales nutricionales, carga glucémica y alertas de alergia/protocolos
 * cada vez que el usuario ajusta los gramos o elimina un ingrediente detectado.
 */
export function recalculateVisionAnalysis(analysis, userProfile = {}) {
  if (!analysis || !analysis.isFoodValid) {
    return {
      ...analysis,
      totals: {
        grams: 0,
        kcal: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sodiumMg: 0,
        potassiumMg: 0,
        ironMg: 0,
        calciumMg: 0,
        vitaminCMg: 0,
        omega3Mg: 0,
        glycemicLoad: 0
      },
      safetyAlerts: []
    };
  }

  const ingredients = Array.isArray(analysis.ingredients) ? analysis.ingredients : [];

  let sodiumKnown = false;
  let potassiumKnown = false;
  let ironKnown = false;
  let calciumKnown = false;
  let vitaminCKnown = false;
  let omega3Known = false;

  const totals = ingredients.reduce(
    (acc, ing) => {
      const g = Math.max(0, Number(ing.estimatedGrams) || 0);
      const baseG = Math.max(1, Number(ing.baseGrams ?? ing.estimatedGrams) || 100);
      const ratio = g / baseG;

      const kcal = Math.round((Number(ing.baseKcal ?? ing.kcal) || 0) * ratio);
      const protein = Math.round((Number(ing.baseProtein ?? ing.protein) || 0) * ratio);
      const carbs = Math.round((Number(ing.baseCarbs ?? ing.carbs) || 0) * ratio);
      const fat = Math.round((Number(ing.baseFat ?? ing.fat) || 0) * ratio);
      const fiber = Math.round((Number(ing.baseFiber ?? ing.fiber) || 0) * ratio);

      const rawNa = ing.baseSodiumMg !== undefined ? ing.baseSodiumMg : ing.sodiumMg;
      const rawK = ing.basePotassiumMg !== undefined ? ing.basePotassiumMg : ing.potassiumMg;
      const rawFe = ing.baseIronMg !== undefined ? ing.baseIronMg : ing.ironMg;
      const rawCa = ing.baseCalciumMg !== undefined ? ing.baseCalciumMg : ing.calciumMg;
      const rawVitC = ing.baseVitaminCMg !== undefined ? ing.baseVitaminCMg : ing.vitaminCMg;
      const rawOm3 = ing.baseOmega3Mg !== undefined ? ing.baseOmega3Mg : ing.omega3Mg;

      if (rawNa !== null && rawNa !== undefined) sodiumKnown = true;
      if (rawK !== null && rawK !== undefined) potassiumKnown = true;
      if (rawFe !== null && rawFe !== undefined) ironKnown = true;
      if (rawCa !== null && rawCa !== undefined) calciumKnown = true;
      if (rawVitC !== null && rawVitC !== undefined) vitaminCKnown = true;
      if (rawOm3 !== null && rawOm3 !== undefined) omega3Known = true;

      const sodiumMg = rawNa !== null && rawNa !== undefined ? Math.round((Number(rawNa) || 0) * ratio) : 0;
      const potassiumMg = rawK !== null && rawK !== undefined ? Math.round((Number(rawK) || 0) * ratio) : 0;
      const ironMg = rawFe !== null && rawFe !== undefined ? Number(((Number(rawFe) || 0) * ratio).toFixed(1)) : 0;
      const calciumMg = rawCa !== null && rawCa !== undefined ? Math.round((Number(rawCa) || 0) * ratio) : 0;
      const vitaminCMg = rawVitC !== null && rawVitC !== undefined ? Math.round((Number(rawVitC) || 0) * ratio) : 0;
      const omega3Mg = rawOm3 !== null && rawOm3 !== undefined ? Math.round((Number(rawOm3) || 0) * ratio) : 0;

      const netCarbs = Math.max(0, carbs - fiber);
      const giNum = ing.glycemicIndex === 'Alto' ? 74 : ing.glycemicIndex === 'Medio' ? 56 : 36;
      const gl = Number(((giNum * netCarbs) / 100).toFixed(1));

      return {
        grams: acc.grams + g,
        kcal: acc.kcal + kcal,
        protein: acc.protein + protein,
        carbs: acc.carbs + carbs,
        fat: acc.fat + fat,
        fiber: acc.fiber + fiber,
        sodiumMg: acc.sodiumMg + sodiumMg,
        potassiumMg: acc.potassiumMg + potassiumMg,
        ironMg: Number((acc.ironMg + ironMg).toFixed(1)),
        calciumMg: acc.calciumMg + calciumMg,
        vitaminCMg: acc.vitaminCMg + vitaminCMg,
        omega3Mg: acc.omega3Mg + omega3Mg,
        glycemicLoad: Number((acc.glycemicLoad + gl).toFixed(1))
      };
    },
    {
      grams: 0,
      kcal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sodiumMg: 0,
      potassiumMg: 0,
      ironMg: 0,
      calciumMg: 0,
      vitaminCMg: 0,
      omega3Mg: 0,
      glycemicLoad: 0
    }
  );

  const finalTotals = {
    ...totals,
    sodiumMg: sodiumKnown ? totals.sodiumMg : null,
    potassiumMg: potassiumKnown ? totals.potassiumMg : null,
    ironMg: ironKnown ? totals.ironMg : null,
    calciumMg: calciumKnown ? totals.calciumMg : null,
    vitaminCMg: vitaminCKnown ? totals.vitaminCMg : null,
    omega3Mg: omega3Known ? totals.omega3Mg : null
  };

  // Cruce determinista con alergias, disgustos y condiciones clínicas del usuario
  const syntheticFood = {
    name: `${analysis.dishName || ''} ${ingredients.map(i => i.name).join(' ')}`,
    category: 'Foto analizada',
    allergens: Array.isArray(analysis.detectedAllergens) ? analysis.detectedAllergens : [],
    sodiumMg: finalTotals.sodiumMg !== null && finalTotals.grams > 0 ? Math.round((finalTotals.sodiumMg / finalTotals.grams) * 100) : 0,
    sugar: 0,
    fat: finalTotals.grams > 0 ? Math.round((finalTotals.fat / finalTotals.grams) * 100) : 0,
    fiber: finalTotals.grams > 0 ? Math.round((finalTotals.fiber / finalTotals.grams) * 100) : 0,
    novaGroup: 2,
    glycemicIndex: finalTotals.glycemicLoad >= 20 ? 'Alto' : finalTotals.glycemicLoad >= 11 ? 'Medio' : 'Bajo'
  };

  const compat = evaluateFoodPersonalCompatibility(syntheticFood, userProfile);

  return {
    ...analysis,
    totals: finalTotals,
    compatibility: compat,
    safetyAlerts: compat.reasons || []
  };
}

/**
 * Envía la fotografía comprimida a la Netlify Function /api/analyze-meal-photo (Gemini Vision).
 * Nunca envía nombre ni correo del paciente (minimización PII).
 */
export async function analyzeMealPhotoWithAI({
  base64Image,
  mimeType = 'image/jpeg',
  mealType = 'Desayuno',
  userHint = '',
  userProfile = {}
}) {
  const protocols = resolveUserClinicalProtocols(userProfile);

  const payload = {
    imageBase64: base64Image,
    mimeType,
    mealType,
    userHint: String(userHint || '').trim().slice(0, 240),
    clinicalContext: {
      country: userProfile?.country || 'CO',
      dietType: userProfile?.dietType || 'omnivora',
      allergies: Array.isArray(userProfile?.allergies) ? userProfile.allergies : [],
      protocols: protocols.map(p => `${p.label} (${p.source})`)
    }
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35000);

  let response;
  try {
    response = await fetch('/api/analyze-meal-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } catch (err) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') {
      throw new Error('El análisis tardó demasiado. Intenta con una foto más nítida o buena conexión.');
    }
    throw new Error('No se pudo conectar con el servicio de Visión IA.');
  }
  clearTimeout(timer);

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 404 || data?.error === 'VISION_GATEWAY_INACTIVE') {
      throw new Error(
        'El escáner con Visión IA real corre en la versión publicada en Netlify (https://nutristudio-ai-app.netlify.app) o ejecutando localmente "netlify dev".'
      );
    }
    throw new Error(data?.message || data?.error || 'No pudimos analizar esta fotografía. Intenta de nuevo.');
  }

  // Normalizar ingredientes guardando valores base para escalar al editar gramos
  const optNum = (val, decimals = 0) => {
    if (val === null || val === undefined || val === '') return null;
    const n = Number(val);
    if (!Number.isFinite(n)) return null;
    return decimals > 0 ? Number(Math.max(0, n).toFixed(decimals)) : Math.max(0, Math.round(n));
  };

  const normalizedIngredients = (Array.isArray(data?.ingredients) ? data.ingredients : []).map((ing, idx) => {
    const g = Math.max(5, Math.round(Number(ing.estimatedGrams) || 100));
    return {
      id: `ing-${idx}-${Date.now()}`,
      name: ing.name || `Ingrediente ${idx + 1}`,
      estimatedGrams: g,
      baseGrams: g,
      baseKcal: Math.max(0, Math.round(Number(ing.kcal) || 0)),
      baseProtein: Math.max(0, Math.round(Number(ing.protein) || 0)),
      baseCarbs: Math.max(0, Math.round(Number(ing.carbs) || 0)),
      baseFat: Math.max(0, Math.round(Number(ing.fat) || 0)),
      baseFiber: Math.max(0, Math.round(Number(ing.fiber) || 0)),
      baseSodiumMg: optNum(ing.sodiumMg),
      basePotassiumMg: optNum(ing.potassiumMg),
      baseIronMg: optNum(ing.ironMg, 1),
      baseCalciumMg: optNum(ing.calciumMg),
      baseVitaminCMg: optNum(ing.vitaminCMg),
      baseOmega3Mg: optNum(ing.omega3Mg),
      glycemicIndex: ing.glycemicIndex || 'Bajo'
    };
  });

  const normalized = {
    isFoodValid: Boolean(data?.isFoodValid),
    rejectionReason: data?.rejectionReason || null,
    dishName: data?.dishName || 'Plato analizado con IA',
    confidence: data?.confidence || 'Media',
    detectedAllergens: Array.isArray(data?.detectedAllergens) ? data.detectedAllergens : [],
    ingredients: normalizedIngredients,
    clinicalObservation: data?.clinicalObservation || '',
    practicalUpgradeTip: data?.practicalUpgradeTip || '',
    modelUsed: data?.modelUsed || 'gemini-vision'
  };

  return recalculateVisionAnalysis(normalized, userProfile);
}
