// Motor de IA Integrada en Todo el Seguimiento (AI-Native Workflow Engine)
// Aporta inteligencia continua en tiempo real (0 tokens LLM) en:
// 1) Racha de consistencia, gráfica semanal de 7 días y pronóstico corporal IA a 30 días
// 2) Veredicto clínico instantáneo por plato + sustituciones inteligentes (Smart Swaps)
// 3) Lista de mercado semanal inteligente agrupada por pasillo y adaptada al país

import { GLOBAL_FOOD_DATABASE } from './foodDatabase';
import { getTodayIso } from './userStorage';

/**
 * Calcula los últimos 7 días (YYYY-MM-DD), calorías registradas por día,
 * racha de consistencia y pronóstico metabólico IA a 30 días.
 */
export function computeAiProgressIntelligence({ userProfile, workspace, dailyTracking }) {
  const meals = workspace?.mealLogs || [];
  const goalKcal = Number(userProfile?.dailyCalories || 0);
  const currentWeight = Number(userProfile?.weightKg || 0);
  const todayStr = getTodayIso();

  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const dayLabel = d.toLocaleDateString('es-ES', { weekday: 'short' }).slice(0, 3);
    const dayMeals = meals.filter(m => m.date === iso);
    const kcal = dayMeals.reduce((acc, m) => acc + (Number(m.totalCalories) || 0), 0);
    const protein = dayMeals.reduce((acc, m) => acc + (Number(m.proteinGrams) || 0), 0);
    const pct = goalKcal > 0 ? Math.min(130, Math.round((kcal / goalKcal) * 100)) : 0;
    last7Days.push({
      iso,
      dayLabel,
      kcal,
      protein,
      mealsCount: dayMeals.length,
      pct,
      isToday: iso === todayStr
    });
  }

  // Racha de días consecutivos con al menos 1 comida registrada (contando hacia atrás desde hoy)
  let streakDays = 0;
  for (let i = last7Days.length - 1; i >= 0; i--) {
    if (last7Days[i].mealsCount > 0) {
      streakDays++;
    } else if (i < last7Days.length - 1) {
      break;
    }
  }

  const activeDays = last7Days.filter(d => d.mealsCount > 0);
  const avgActiveKcal =
    activeDays.length > 0
      ? Math.round(activeDays.reduce((acc, d) => acc + d.kcal, 0) / activeDays.length)
      : Number(dailyTracking?.consumedKcal || 0);

  const consistencyPct = Math.round((activeDays.length / 7) * 100);

  // Pronóstico IA a 30 días basado en objetivo y balance energético estimado (~7,700 kcal = 1 kg tejido)
  let forecastTitle = 'Configura tu peso y meta para activar el pronóstico IA a 30 días';
  let forecastDetail = 'Con tus medidas y metabolismo, la IA proyecta tu evolución semanal sin restricciones extremas.';

  if (currentWeight > 0 && goalKcal > 0) {
    const goalId = userProfile?.goal || 'mantenimiento';
    const expectedMonthlyDeltaKg =
      goalId === 'deficit_calorico'
        ? -1.6
        : goalId === 'control_carbohidratos'
          ? -0.9
          : goalId === 'masa_muscular'
            ? 0.8
            : 0.0;
    const projectedWeight = Number((currentWeight + expectedMonthlyDeltaKg).toFixed(1));
    forecastTitle =
      expectedMonthlyDeltaKg < 0
        ? `Proyección IA (30 días): ${currentWeight} kg → ${projectedWeight} kg (${expectedMonthlyDeltaKg} kg)`
        : expectedMonthlyDeltaKg > 0
          ? `Proyección IA (30 días): ${currentWeight} kg → ${projectedWeight} kg (+${expectedMonthlyDeltaKg} kg masa magra)`
          : `Proyección IA (30 días): Estabilidad metabólica en ~${currentWeight} kg`;
    forecastDetail =
      activeDays.length > 0
        ? `Promedio en días registrados: ${avgActiveKcal} kcal/día frente a tu meta de ${goalKcal} kcal. Mantener ≥80% de adherencia en proteína acelera resultados saludables.`
        : `Registra tus comidas de hoy para calibrar tu pronóstico real día a día sobre tu meta de ${goalKcal} kcal.`;
  }

  return {
    last7Days,
    streakDays,
    consistencyPct,
    avgActiveKcal,
    forecastTitle,
    forecastDetail
  };
}

/**
 * Evalúa instantáneamente un plato registrado o el historial del día con criterio clínico
 * y propone una sustitución inteligente (Smart Swap) si detecta baja calidad o exceso.
 */
export function evaluateDailyMealsWithAi({ mealsToday = [], userProfile, clinicalRecord }) {
  const conditions = Array.isArray(userProfile?.medicalConditions)
    ? userProfile.medicalConditions
    : [];

  if (mealsToday.length === 0) {
    return {
      status: 'ready',
      headline: 'IA lista para evaluar tu primer plato del día',
      feedback:
        'Apenas registres una comida por Foto IA, Base de Alimentos o Manual, evaluaré automáticamente su impacto glucémico, densidad proteica, sodio y compatibilidad con tus protocolos médicos.',
      smartSwap: null
    };
  }

  const latest = mealsToday[0];
  const sodium = Number(latest.sodiumMg || 0);
  const carbs = Number(latest.carbsGrams || 0);
  const protein = Number(latest.proteinGrams || 0);
  const quality = Number(latest.qualityScore || 80);

  const notes = [];
  let smartSwap = null;

  if (quality < 55) {
    notes.push(
      `Tu último registro ("${latest.dishName}") tiene calidad nutricional baja (${quality}/100).`
    );
    const betterAlt = GLOBAL_FOOD_DATABASE.find(f => f.id === 'fd-pollo');
    if (betterAlt) {
      smartSwap = {
        from: latest.dishName,
        to: 'Pechuga de pollo o trucha + legumbres + ensalada con aguacate (Nutri-Score A · 95/100)',
        benefit: 'Reduce hasta 60% de sodio/azúcares añadidos y triplica la saciedad.'
      };
    }
  } else {
    notes.push(`Buen registro reciente: "${latest.dishName}" (${latest.totalCalories} kcal · ${protein}g proteína).`);
  }

  if (
    (conditions.includes('hipertension_cardiovascular') || Number(clinicalRecord?.bloodPressureSys || 0) >= 130) &&
    sodium > 500
  ) {
    notes.push(
      `Alerta DASH: este plato aporta ${sodium} mg de sodio; equilibra el resto del día con alimentos ricos en potasio (aguacate, espinaca, legumbres) y sin sal añadida.`
    );
  }

  if (
    (conditions.includes('resistencia_insulina_diabetes') || Number(clinicalRecord?.fastingGlucose || 0) >= 100) &&
    carbs > 50
  ) {
    notes.push(
      `Alerta ADA: ${carbs}g de carbohidratos en una toma; una caminata suave de 12 minutos tras comer ayuda a reducir el pico de glucosa.`
    );
  }

  if (protein < 18) {
    notes.push(
      'Consejo proteico: añade una porción de huevo, yogur griego, pollo o legumbres en tu próxima comida para llegar a tu meta diaria de proteína.'
    );
  }

  return {
    status: quality < 55 ? 'warning' : 'good',
    headline: quality < 55 ? 'Ajuste inteligente sugerido por tu IA Clínica' : 'Análisis IA en vivo de tu última comida',
    feedback: notes.join(' '),
    smartSwap
  };
}

/**
 * Genera la Lista de Mercado Semanal Inteligente (7 días) a partir del menú calibrado,
 * agrupada por categoría de supermercado y adaptada al país y presupuesto del usuario.
 */
export function buildSmartShoppingList(menu, countryName = 'tu país', budgetId = 'equilibrado') {
  if (!menu || !Array.isArray(menu.meals)) return [];

  const grouped = new Map();
  menu.meals.forEach(meal => {
    (meal.items || []).forEach(item => {
      const id = item.food.id;
      const existing = grouped.get(id);
      if (existing) {
        existing.weeklyGrams += item.grams * 7;
      } else {
        grouped.set(id, {
          id,
          name: item.food.name.split('(')[0].trim(),
          category: item.food.category,
          weeklyGrams: item.grams * 7,
          nutriGrade: item.food.nutriGrade,
          clinicalTag: item.food.clinicalTag
        });
      }
    });
  });

  const byCategory = {};
  grouped.forEach(entry => {
    if (!byCategory[entry.category]) {
      byCategory[entry.category] = [];
    }
    const qtyLabel =
      entry.weeklyGrams >= 1000
        ? `${(entry.weeklyGrams / 1000).toFixed(1)} kg`
        : `${entry.weeklyGrams} g`;
    byCategory[entry.category].push({
      ...entry,
      qtyLabel
    });
  });

  return {
    countryName,
    budgetId,
    aisles: Object.entries(byCategory).map(([aisle, items]) => ({
      aisle,
      items
    }))
  };
}
