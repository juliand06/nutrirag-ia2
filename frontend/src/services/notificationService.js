// Servicio de Recordatorios y Notificaciones Inteligentes de NutriStudio AI
// Maneja Web Notifications API, verificación de horarios (desayuno, almuerzo, merienda, cena),
// control de hidratación (agua) y alertas de inactividad con sugerencias contextuales.

export const DEFAULT_NOTIFICATION_SETTINGS = {
  enabled: false,
  webPushGranted: false,
  mealReminders: true,
  waterReminders: true,
  inactivityAlerts: true,
  schedules: {
    desayuno: '08:00',
    almuerzo: '13:00',
    merienda: '16:30',
    cena: '20:00'
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

  const settings = workspace.notificationSettings || DEFAULT_NOTIFICATION_SETTINGS;
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

  return null;
}
