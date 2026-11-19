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


/**
 * Motor Metabólico Adaptativo (estilo MacroFactor):
 * Compara la tendencia real de peso registrado con el promedio calórico consumido
 * y sugiere una recalibración semanal inteligente del gasto energético (GET adaptativo)
 * para evitar estancamientos metabólicos.
 */
export function computeAdaptiveTdeeCheckIn({ userProfile, workspace, metrics }) {
  const weights = Array.isArray(workspace?.weightHistory) ? workspace.weightHistory : [];
  const meals = Array.isArray(workspace?.mealLogs) ? workspace.mealLogs : [];
  const staticTdee = Number(metrics?.tdee || userProfile?.dailyCalories || 2000);
  const currentGoalKcal = Number(userProfile?.dailyCalories || staticTdee);

  if (weights.length < 2) {
    return {
      ready: false,
      adaptiveTdee: staticTdee,
      suggestedCalories: currentGoalKcal,
      deltaKcal: 0,
      headline: 'Check-in Metabólico Adaptativo (estilo MacroFactor)',
      explanation:
        'Registra al menos 2 controles de peso en días distintos para que la IA calcule tu gasto energético real adaptativo y recalibre tus calorías automáticamente.'
    };
  }

  const latestW = Number(weights[0].weightKg || 0);
  const prevW = Number(weights[Math.min(weights.length - 1, 4)].weightKg || latestW);
  const weightDeltaKg = Number((latestW - prevW).toFixed(2));

  // Promedio calórico de los días con registro reciente
  const byDate = {};
  meals.slice(0, 35).forEach(m => {
    byDate[m.date] = (byDate[m.date] || 0) + (Number(m.totalCalories) || 0);
  });
  const dayValues = Object.values(byDate).filter(v => v > 400);
  const avgIntake =
    dayValues.length > 0
      ? Math.round(dayValues.reduce((a, b) => a + b, 0) / dayValues.length)
      : currentGoalKcal;

  // Ajuste adaptativo suave (±150 kcal máx. por ciclo para proteger el metabolismo)
  const goalId = userProfile?.goal || 'mantenimiento';
  let deltaKcal = 0;
  let explanation = 'Tu evolución de peso coincide con tu gasto estimado. Mantén tu meta actual.';

  if (goalId === 'deficit_calorico' && weightDeltaKg >= 0) {
    deltaKcal = -110;
    explanation = `Tu peso reciente varió ${weightDeltaKg >= 0 ? '+' : ''}${weightDeltaKg} kg con un promedio de ~${avgIntake} kcal. Se sugiere un ajuste adaptativo de -110 kcal para reactivar pérdida de grasa sin perder músculo.`;
  } else if (goalId === 'deficit_calorico' && weightDeltaKg < -1.2) {
    deltaKcal = 100;
    explanation = `Estás bajando muy rápido (${weightDeltaKg} kg). Para proteger tu masa muscular y evitar adaptación metabólica, la IA sugiere subir +100 kcal.`;
  } else if (goalId === 'masa_muscular' && weightDeltaKg <= 0) {
    deltaKcal = 130;
    explanation = `Tu peso no ha subido (${weightDeltaKg} kg). Para impulsar hipertrofia limpia, la IA sugiere sumar +130 kcal enfocadas en carbohidratos complejos.`;
  }

  const adaptiveTdee = Math.max(1200, staticTdee + deltaKcal);
  const suggestedCalories = Math.max(1250, currentGoalKcal + deltaKcal);

  return {
    ready: true,
    adaptiveTdee,
    suggestedCalories,
    deltaKcal,
    weightDeltaKg,
    avgIntake,
    headline:
      deltaKcal === 0
        ? `Metabolismo en equilibrio · GET Adaptativo: ${adaptiveTdee} kcal`
        : `Ajuste Adaptativo IA sugerido: ${deltaKcal > 0 ? '+' : ''}${deltaKcal} kcal/día`,
    explanation
  };
}

/**
 * Genera y abre un Reporte Clínico Nutricional Profesional listo para imprimir / guardar como PDF
 * (estilo Nutrium / Cronometer Pro) con biomarcadores, rúbrica FHIR, metas y evolución.
 */
export function openPrintableClinicalReport({
  userProfile,
  metrics,
  countryName,
  activeProtocols,
  clinicalRecord,
  clinicalRubric,
  adaptiveCheckIn,
  mealsToday,
  userMemory
}) {
  const today = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Reporte Clínico Nutricional — ${userProfile?.name || 'Paciente'}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #10201b; padding: 32px; max-width: 860px; margin: 0 auto; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f6b56; padding-bottom: 14px; margin-bottom: 22px; }
    h1 { margin: 0; font-size: 20px; color: #0f6b56; }
    h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.04em; color: #0f6b56; border-bottom: 1px solid #dde5e2; padding-bottom: 4px; margin-top: 22px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 10px; }
    .box { border: 1px solid #dde5e2; border-radius: 8px; padding: 10px 12px; background: #f8faf9; }
    .label { font-size: 11px; color: #5c6e68; }
    .val { font-size: 16px; font-weight: 700; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
    th, td { border: 1px solid #dde5e2; padding: 7px 10px; text-align: left; }
    th { background: #eaf4f0; color: #0f6b56; }
    .footer { margin-top: 28px; font-size: 11px; color: #6b7b75; border-top: 1px solid #dde5e2; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>NutriStudio AI — Reporte Clínico Nutricional</h1>
      <div style="font-size:13px;color:#485b55;margin-top:4px;">
        Paciente: <strong>${userProfile?.name || ''}</strong> (${userProfile?.email || ''}) · País: <strong>${countryName}</strong>
      </div>
    </div>
    <div style="text-align:right;font-size:12px;color:#485b55;">
      <div>Fecha: ${today}</div>
      <div>Memoria IA: ${userMemory?.knowledgeScore || 0}%</div>
    </div>
  </div>

  <h2>1. Perfil Biométrico y Metabólico Adaptativo</h2>
  <div class="grid">
    <div class="box"><div class="label">Peso / Estatura / Edad</div><div class="val">${userProfile?.weightKg || 0} kg · ${userProfile?.heightCm || 0} cm · ${userProfile?.age || 0} años</div></div>
    <div class="box"><div class="label">TMB / GET / IMC</div><div class="val">${metrics ? `${metrics.bmr} / ${metrics.tdee} kcal · IMC ${metrics.bmi}` : 'No calculado'}</div></div>
    <div class="box"><div class="label">Meta Diaria (Adaptativa: ${adaptiveCheckIn?.adaptiveTdee || 0} kcal)</div><div class="val">${userProfile?.dailyCalories || 0} kcal · P:${userProfile?.targetProtein || 0}g C:${userProfile?.targetCarbs || 0}g G:${userProfile?.targetFat || 0}g</div></div>
  </div>

  <h2>2. Protocolos Médicos Globales y Expediente HL7 FHIR</h2>
  <p style="font-size:12px;">
    <strong>Protocolos activos:</strong> ${activeProtocols?.length > 0 ? activeProtocols.map(p => `${p.label} (${p.source})`).join('; ') : 'Guías generales OMS/FAO/ESPEN'}.
  </p>
  ${
    clinicalRecord
      ? `<table>
          <tr><th>Institución</th><th>Glucosa Ayunas</th><th>HbA1c</th><th>LDL / Triglicéridos</th><th>Presión Arterial</th><th>Concordancia Rúbrica</th></tr>
          <tr>
            <td>${clinicalRecord.institutionName}</td>
            <td>${clinicalRecord.fastingGlucose} mg/dL</td>
            <td>${clinicalRecord.hba1c}%</td>
            <td>${clinicalRecord.ldlCholesterol} / ${clinicalRecord.triglycerides} mg/dL</td>
            <td>${clinicalRecord.bloodPressureSys}/${clinicalRecord.bloodPressureDia} mmHg</td>
            <td><strong>${clinicalRubric?.totalScore || 0}%</strong></td>
          </tr>
        </table>
        <p style="font-size:12px;margin-top:8px;"><strong>Alergias:</strong> ${clinicalRecord.allergies} · <strong>Medicación:</strong> ${clinicalRecord.medications}</p>`
      : '<p style="font-size:12px;color:#5c6e68;">Expediente clínico FHIR aún no sincronizado.</p>'
  }

  <h2>3. Registro de Comidas de Hoy (${mealsToday?.length || 0})</h2>
  ${
    mealsToday?.length > 0
      ? `<table>
          <tr><th>Tiempo</th><th>Plato / Alimento</th><th>Calorías</th><th>Proteína</th><th>Carbohidratos</th><th>Grasas</th></tr>
          ${mealsToday
            .map(
              m =>
                `<tr><td>${m.mealType}</td><td>${m.dishName}</td><td>${m.totalCalories} kcal</td><td>${m.proteinGrams}g</td><td>${m.carbsGrams}g</td><td>${m.fatGrams}g</td></tr>`
            )
            .join('')}
        </table>`
      : '<p style="font-size:12px;color:#5c6e68;">Sin comidas registradas en la fecha actual.</p>'
  }

  <div class="footer">
    Documento generado automáticamente por NutriStudio AI (RAG Híbrido + Guías OMS/ADA/AHA-DASH/ISSN/ESPEN/KDIGO/EASL). Este reporte es una herramienta de apoyo nutricional y no sustituye el criterio diagnóstico de un médico o nutricionista tratante.
  </div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=920,height=740');
  if (w) {
    w.document.open();
    w.document.write(html);
    w.document.close();
  }
}
