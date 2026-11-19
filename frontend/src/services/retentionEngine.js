// Motor de Retención Fase 2:
// - Gamificación (niveles, XP, insignias, retos semanales, resumen semanal PNG compartible)
// - Seguimiento ampliado (sueño, pasos, ánimo, medidas, síntomas) + correlaciones IA
// - Recordatorios Web Push (Notification API)
// - Persistencia offline en IndexedDB

export const DEFAULT_REMINDERS = {
  breakfast: { label: 'Desayuno nutritivo', time: '08:00', enabled: true },
  water: { label: 'Hidratación (vasos de agua)', time: '11:00', enabled: true },
  dinner: { label: 'Registrar cena ligera', time: '20:00', enabled: false },
  weighIn: { label: 'Control de peso semanal', time: '07:30', enabled: false }
};

export function computeGamificationState({ workspace, aiProgress, waterTodayMl, goalWater }) {
  const meals = workspace?.mealLogs || [];
  const wellness = workspace?.wellnessLogs || [];
  const streak = aiProgress?.streakDays || 0;
  const scannedCount = meals.filter(m => String(m.id || '').startsWith('meal-barcode-')).length;
  const highQualityMeals = meals.filter(m => Number(m.qualityScore || 0) >= 85).length;

  const xp =
    meals.length * 25 +
    streak * 40 +
    wellness.length * 20 +
    highQualityMeals * 15 +
    (waterTodayMl >= (goalWater || 2000) * 0.75 ? 30 : 0);

  const level = Math.floor(xp / 150) + 1;
  const xpInLevel = xp % 150;
  const levelTitle =
    level >= 6
      ? 'Maestro del Bienestar'
      : level >= 4
        ? 'Atleta Metabólico'
        : level >= 2
          ? 'Explorador Nutricional'
          : 'Inicio Consciente';

  const badges = [
    { id: 'first-meal', icon: '🥗', title: 'Primer Plato', desc: 'Registra tu primera comida', unlocked: meals.length >= 1 },
    { id: 'streak-3', icon: '🔥', title: 'Constancia 3D', desc: 'Mantén racha de 3 días', unlocked: streak >= 3 },
    { id: 'hydration', icon: '💧', title: 'Hidratación Pro', desc: 'Alcanza ≥75% de tu meta de agua', unlocked: waterTodayMl >= (goalWater || 2000) * 0.75 },
    { id: 'yuka-pro', icon: '🏷️', title: 'Escáner Consciente', desc: 'Analiza un producto por código de barras', unlocked: scannedCount >= 1 },
    { id: 'quality-5', icon: '⭐', title: 'Calidad A+', desc: 'Registra 5 platos con calidad ≥85', unlocked: highQualityMeals >= 5 },
    { id: 'holistic', icon: '😴', title: 'Bienestar Integral', desc: 'Registra sueño, pasos o ánimo', unlocked: wellness.length >= 1 }
  ];

  const weeklyChallenges = [
    {
      title: 'Registrar al menos 10 comidas esta semana',
      current: Math.min(10, meals.length),
      target: 10,
      pct: Math.min(100, Math.round((meals.length / 10) * 100))
    },
    {
      title: 'Completar 5 registros de sueño y actividad',
      current: Math.min(5, wellness.length),
      target: 5,
      pct: Math.min(100, Math.round((wellness.length / 5) * 100))
    },
    {
      title: 'Lograr 3 platos con Nutri-Score A',
      current: Math.min(3, highQualityMeals),
      target: 3,
      pct: Math.min(100, Math.round((highQualityMeals / 3) * 100))
    }
  ];

  return { xp, level, xpInLevel, levelTitle, badges, weeklyChallenges };
}

/**
 * Genera una imagen PNG compartible con el resumen semanal del usuario.
 */
export function downloadWeeklyShareCard({ userName, countryName, gamification, aiProgress, avgKcal }) {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 500;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const grad = ctx.createLinearGradient(0, 0, 900, 500);
  grad.addColorStop(0, '#083d32');
  grad.addColorStop(0.55, '#0d8a68');
  grad.addColorStop(1, '#06b6d4');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 900, 500);

  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(42, 42, 816, 416);

  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('NUTRISTUDIO AI · RESUMEN SEMANAL', 76, 100);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 42px sans-serif';
  ctx.fillText(`${userName} — Nivel ${gamification.level}`, 76, 160);

  ctx.font = '24px sans-serif';
  ctx.fillStyle = '#d9f5ea';
  ctx.fillText(`${gamification.levelTitle} · ${gamification.xp} XP · ${countryName}`, 76, 202);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(`🔥 Racha: ${aiProgress.streakDays} día(s)    📊 Consistencia: ${aiProgress.consistencyPct}%`, 76, 280);
  ctx.fillText(`🥗 Promedio: ${avgKcal} kcal/día    🏅 Insignias: ${gamification.badges.filter(b => b.unlocked).length}/${gamification.badges.length}`, 76, 336);

  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.font = '18px sans-serif';
  ctx.fillText('Orientación informativa; no reemplaza a un profesional.', 76, 422);

  const link = document.createElement('a');
  link.download = `nutristudio-resumen-semanal-${new Date().toISOString().slice(0, 10)}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/**
 * Correlaciones conductuales entre sueño, pasos, ánimo, digestión e ingesta diaria.
 */
export function computeWellnessCorrelations({ wellnessLogs = [], mealLogs = [] }) {
  if (wellnessLogs.length === 0) {
    return [
      'Registra tus horas de sueño, pasos, ánimo y digestión para descubrir correlaciones automáticas con tu alimentación.'
    ];
  }

  const insights = [];
  const lowSleepDays = wellnessLogs.filter(w => Number(w.sleepHours) > 0 && Number(w.sleepHours) < 6.5);
  const goodSleepDays = wellnessLogs.filter(w => Number(w.sleepHours) >= 7);

  if (lowSleepDays.length > 0) {
    const lowSleepDates = new Set(lowSleepDays.map(d => d.date));
    const carbsOnLowSleep = mealLogs
      .filter(m => lowSleepDates.has(m.date))
      .reduce((acc, m) => acc + (Number(m.carbsGrams) || 0), 0);
    insights.push(
      `Sueño vs. Apetito: Tienes ${lowSleepDays.length} día(s) con menos de 6.5h de sueño${carbsOnLowSleep > 0 ? ` (${carbsOnLowSleep}g de carbohidratos registrados)` : ''}. Dormir poco eleva la grelina y los antojos de azúcar; prioriza ≥7h y proteína en el desayuno.`
    );
  } else if (goodSleepDays.length > 0) {
    insights.push(
      `¡Excelente descanso! Promedias ≥7h de sueño en tus registros recientes, lo cual mejora la sensibilidad a la insulina y el control del apetito.`
    );
  }

  const activeStepDays = wellnessLogs.filter(w => Number(w.steps) >= 7000);
  if (activeStepDays.length > 0) {
    insights.push(
      `Actividad física: Alcanzaste ≥7,000 pasos en ${activeStepDays.length} jornada(s), favoreciendo tu gasto energético diario y salud cardiovascular.`
    );
  }

  const digestiveAlerts = wellnessLogs.filter(
    w => w.digestiveNote && !w.digestiveNote.toLowerCase().includes('normal') && !w.digestiveNote.toLowerCase().includes('ningun')
  );
  if (digestiveAlerts.length > 0) {
    insights.push(
      `Digestión: Reportaste "${digestiveAlerts[0].digestiveNote}". Mantén porciones moderadas, buena hidratación y prioriza fibra soluble y cocciones suaves.`
    );
  }

  return insights;
}

export async function triggerTestWebNotification(title, body) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'Tu navegador no soporta notificaciones Web Push.';
  }
  let perm = Notification.permission;
  if (perm === 'default') {
    perm = await Notification.requestPermission();
  }
  if (perm === 'granted') {
    new Notification(title, { body, icon: '/nutristudio-logo.svg' });
    return 'Notificación enviada correctamente.';
  }
  return 'Permiso de notificaciones bloqueado en el navegador.';
}

/**
 * Espejo offline en IndexedDB (complemento al Service Worker PWA).
 */
export function saveWorkspaceToIndexedDb(userId, workspace) {
  if (typeof indexedDB === 'undefined' || !userId || !workspace) return;
  try {
    const req = indexedDB.open('NutriStudioOfflineDB', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('workspaces')) {
        db.createObjectStore('workspaces', { keyPath: 'userId' });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('workspaces', 'readwrite');
      tx.objectStore('workspaces').put({ userId, updatedAt: Date.now(), workspace });
    };
  } catch {
    // Silencioso en entornos sin IndexedDB
  }
}
