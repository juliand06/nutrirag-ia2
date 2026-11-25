// Servicio de Recordatorios y Notificaciones Inteligentes de NutriStudio AI
// Maneja Web Notifications API, verificación de horarios (desayuno, almuerzo, merienda, cena),
// control de hidratación (agua) y alertas de inactividad con sugerencias contextuales.

export const DEFAULT_NOTIFICATION_SETTINGS = {
  enabled: false,
  webPushGranted: false,
  mealReminders: true,
  waterReminders: true,
  inactivityAlerts: true,
  medicationReminders: true,
  wellnessCheckInReminders: true,
  weeklyWeightReminders: true,
  proteinReminders: true,
  labsStaleReminders: true,
  schedules: {
    desayuno: '08:00',
    almuerzo: '13:00',
    merienda: '16:30',
    cena: '20:00',
    medicamento: '09:00',
    chequeo: '18:00'
  },
  waterIntervalHours: 2.5
};

const LAST_NOTIFICATION_TIMESTAMPS_KEY = 'nutristudio_last_notifs_v1';

function getSentTimestamps() {
  try {
    const raw = localStorage.getItem(LAST_NOTIFICATION_TIMESTAMPS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function recordSentTimestamp(key) {
  try {
    const data = getSentTimestamps();
    data[key] = Date.now();
    localStorage.setItem(LAST_NOTIFICATION_TIMESTAMPS_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

/**
 * Solicita permiso al navegador para notificaciones web del sistema.
 */
export async function requestWebNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { granted: false, reason: 'unsupported' };
  }

  try {
    const permission = await Notification.requestPermission();
    return {
      granted: permission === 'granted',
      permission,
      reason: permission === 'granted' ? 'ok' : 'denied'
    };
  } catch (err) {
    return { granted: false, reason: err.message };
  }
}

/**
 * Emite una notificación nativa del navegador o cae a un evento visual.
 */
export function sendBrowserNotification(title, options = {}) {
  if (typeof window === 'undefined') return null;

  const defaultOpts = {
    icon: '/nutristudio-logo.svg',
    badge: '/nutristudio-logo.svg',
    vibrate: [200, 100, 200],
    tag: options.tag || 'nutristudio-reminder',
    renotify: true,
    ...options
  };

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, defaultOpts);
      notif.onclick = () => {
        window.focus();
        if (options.url && window.location) {
          window.location.hash = '';
        }
        notif.close();
      };
      return notif;
    } catch {
      // En algunos navegadores móviles las notificaciones solo se permiten vía ServiceWorkerRegistration
      if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(title, defaultOpts);
        });
      }
    }
  }

  return null;
}

/**
 * Evalúa el estado del día y genera avisos inteligentes pertinentes:
 * - Horario de comidas (Desayuno, Almuerzo, Merienda, Cena)
 * - Recordatorio de agua si lleva horas sin tomar o le faltan vasos
 * - Resumen motivador si faltan nutrientes o comidas por registrar
 */
export function evaluateSmartReminders({ currentUser, workspace, now = new Date() }) {
  if (!workspace || !currentUser) return null;

  const settings = {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...(workspace.notificationSettings || {}),
    schedules: {
      ...DEFAULT_NOTIFICATION_SETTINGS.schedules,
      ...(workspace.notificationSettings?.schedules || {})
    }
  };
  if (!settings.enabled) return null;

  const sent = getSentTimestamps();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const parseTime = (timeStr) => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
  };

  const dayMeals = Array.isArray(workspace.mealLogs)
    ? workspace.mealLogs.filter(m => !m.date || m.date === todayStr)
    : [];

  const recordedTypes = new Set(dayMeals.map(m => String(m.mealType || '').toLowerCase()));
  const totalKcal = dayMeals.reduce((acc, m) => acc + (Number(m.kcal ?? m.totalCalories) || 0), 0);
  const targetKcal = Number(currentUser.dailyCalories) || 2000;

  const waterDateKey = todayStr;
  const waterCount = Number(workspace.waterGlassesByDate?.[waterDateKey]) || 0;
  const targetWater = Number(currentUser.waterGlassesTarget) || 8;

  // 1. Revisión de horarios de comida (tolerancia de 45 minutos tras la hora configurada)
  if (settings.mealReminders && settings.schedules) {
    const mealOrder = [
      { key: 'desayuno', label: 'Desayuno', prompt: '¿Qué desayunarás hoy? Tómale foto o anota tu comida.' },
      { key: 'almuerzo', label: 'Almuerzo', prompt: '¡Hora de tu almuerzo! Recuerda incluir buena proteína y vegetales.' },
      { key: 'merienda', label: 'Merienda / Algo', prompt: 'Una fruta, yogur o frutos secos te mantendrán con buena energía.' },
      { key: 'cena', label: 'Cena', prompt: 'Hora de cenar algo ligero y nutritivo para descansar bien.' }
    ];

    for (const item of mealOrder) {
      const schedMin = parseTime(settings.schedules[item.key]);
      if (schedMin !== null) {
        // Ventana: desde la hora de comida hasta 45 minutos después
        if (currentMinutes >= schedMin && currentMinutes <= schedMin + 50) {
          const sentKey = `meal_${item.key}_${todayStr}`;
          const isAlreadyLogged = recordedTypes.has(item.key) || recordedTypes.has(item.label.toLowerCase());

          if (!isAlreadyLogged && !sent[sentKey]) {
            recordSentTimestamp(sentKey);
            return {
              id: `meal-${item.key}`,
              type: 'meal',
              title: `⏰ Recordatorio de ${item.label}`,
              body: `${item.prompt} Llevas ${Math.round(totalKcal)} de ${targetKcal} kcal hoy.`,
              actionUrl: '/app/diario'
            };
          }
        }
      }
    }
  }

  // 2. Recordatorio de Hidratación (Agua)
  if (settings.waterReminders && waterCount < targetWater) {
    // Si han pasado más de 2.5 horas entre 8am y 9pm
    if (now.getHours() >= 8 && now.getHours() <= 21) {
      const waterSentKey = `water_${todayStr}_slot_${Math.floor(now.getHours() / 3)}`;
      if (!sent[waterSentKey]) {
        recordSentTimestamp(waterSentKey);
        const remaining = targetWater - waterCount;
        return {
          id: `water-${Date.now()}`,
          type: 'water',
          title: '💧 Momento de hidratarte',
          body: `Llevas ${waterCount} de ${targetWater} vasos hoy (${remaining} restantes). Un vaso de agua te sentará genial.`,
          actionUrl: '/app'
        };
      }
    }
  }

  // 3. Medicamentos declarados (solo si el usuario los declaró voluntariamente)
  const vh = currentUser.voluntaryClinicalHistory;
  const meds = vh?.consentGranted ? String(vh.medications || '').trim() : '';
  const medMin = parseTime(settings.schedules.medicamento);
  if (settings.medicationReminders && meds && medMin !== null && currentMinutes >= medMin && currentMinutes <= medMin + 90) {
    const key = `med_${todayStr}`;
    if (!sent[key]) {
      recordSentTimestamp(key);
      return {
        id: `med-${todayStr}`,
        type: 'medication',
        title: '💊 Recordatorio de tus medicamentos',
        body: `Declaraste: ${meds}. Tómalos como te indicó tu médico; tu Coach ya tiene en cuenta sus interacciones con los alimentos.`,
        actionUrl: '/app/perfil'
      };
    }
  }

  // 4. Chequeo rápido de bienestar (10 s) si no lo ha hecho hoy
  const checkMin = parseTime(settings.schedules.chequeo);
  const hasCheckInToday = (workspace.wellnessCheckIns || []).some(c => c.date === todayStr);
  if (settings.wellnessCheckInReminders && !hasCheckInToday && checkMin !== null && currentMinutes >= checkMin && currentMinutes <= checkMin + 120) {
    const key = `checkin_${todayStr}`;
    if (!sent[key]) {
      recordSentTimestamp(key);
      return {
        id: `checkin-${todayStr}`,
        type: 'wellness',
        title: '🌿 Chequeo rápido de 10 segundos',
        body: 'Cuéntale a tu Coach cómo van tu energía, hambre, digestión y sueño para afinar tus recomendaciones.',
        actionUrl: '/app/coach'
      };
    }
  }

  // 5. Proteína: aviso por la tarde si va muy por debajo de su meta
  const targetProtein = Number(currentUser.dailyProteinG ?? currentUser.proteinGrams) || 0;
  const eatenProtein = dayMeals.reduce((acc, m) => acc + (Number(m.protein ?? m.proteinGrams) || 0), 0);
  if (settings.proteinReminders && targetProtein > 0 && now.getHours() >= 17 && now.getHours() <= 20 && eatenProtein < targetProtein * 0.5) {
    const key = `protein_${todayStr}`;
    if (!sent[key]) {
      recordSentTimestamp(key);
      return {
        id: `protein-${todayStr}`,
        type: 'protein',
        title: '🥚 Te falta proteína hoy',
        body: `Llevas ${Math.round(eatenProtein)} g de ${Math.round(targetProtein)} g. Una cena con huevo, pescado, pollo o legumbres te ayuda a completarla.`,
        actionUrl: '/app/coach'
      };
    }
  }

  // 6. Peso semanal (cada 7 días o más sin registrar, una vez por semana)
  const weights = Array.isArray(workspace.weightHistory) ? workspace.weightHistory : [];
  const lastWeightDate = weights.length ? weights[weights.length - 1].date : null;
  if (settings.weeklyWeightReminders && lastWeightDate) {
    const days = Math.floor((new Date(`${todayStr}T12:00:00`) - new Date(`${lastWeightDate}T12:00:00`)) / 86400000);
    const key = `weight_${todayStr.slice(0, 7)}_w${Math.floor(now.getDate() / 7)}`;
    if (days >= 7 && now.getHours() >= 8 && now.getHours() <= 11 && !sent[key]) {
      recordSentTimestamp(key);
      return {
        id: `weight-${key}`,
        type: 'weight',
        title: '⚖️ Es hora de tu pesaje semanal',
        body: `Hace ${days} días que no registras tu peso. Un registro semanal en ayunas basta para ver tu tendencia.`,
        actionUrl: '/app/progreso'
      };
    }
  }

  // 7. Exámenes de laboratorio desactualizados (>180 días)
  if (settings.labsStaleReminders && vh?.consentGranted && vh?.examDate) {
    const examDays = Math.floor((new Date(`${todayStr}T12:00:00`) - new Date(`${vh.examDate}T12:00:00`)) / 86400000);
    const key = `labs_${todayStr.slice(0, 7)}`;
    if (examDays > 180 && !sent[key]) {
      recordSentTimestamp(key);
      return {
        id: `labs-${key}`,
        type: 'labs',
        title: '🩺 Tus exámenes tienen más de 6 meses',
        body: 'Si te hiciste controles nuevos, actualízalos para que tu Coach no use datos viejos. Si no, consulta con tu médico.',
        actionUrl: '/app/perfil'
      };
    }
  }

  // 8. Inactividad: más de 1 día sin registrar comidas
  if (settings.inactivityAlerts) {
    const dates = (workspace.mealLogs || []).map(m => m.date).filter(Boolean).sort();
    const lastMealDate = dates.length ? dates[dates.length - 1] : null;
    if (lastMealDate) {
      const idle = Math.floor((new Date(`${todayStr}T12:00:00`) - new Date(`${lastMealDate}T12:00:00`)) / 86400000);
      const key = `idle_${todayStr}`;
      if (idle >= 1 && now.getHours() >= 10 && now.getHours() <= 20 && !sent[key]) {
        recordSentTimestamp(key);
        return {
          id: `idle-${todayStr}`,
          type: 'inactivity',
          title: '👋 Te extrañamos en NutriStudio',
          body: `Hace ${idle} día(s) que no registras comidas. Retomar es fácil: tómale foto a tu próximo plato.`,
          actionUrl: '/app/alimentos'
        };
      }
    }
  }

  return null;
}
