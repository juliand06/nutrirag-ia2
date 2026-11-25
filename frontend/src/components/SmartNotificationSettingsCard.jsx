import React, { useState } from 'react';
import { useNutriStore } from '../store/useNutriStore';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  requestWebNotificationPermission,
  sendBrowserNotification
} from '../services/notificationService';

export default function SmartNotificationSettingsCard() {
  const currentUser = useNutriStore(s => s.currentUser);
  const workspace = useNutriStore(s => s.workspace);
  const updateNotificationSettings = useNutriStore(s => s.updateNotificationSettings);
  const showToast = useNutriStore(s => s.showToast);

  const settings = {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...(workspace?.notificationSettings || {}),
    schedules: {
      ...DEFAULT_NOTIFICATION_SETTINGS.schedules,
      ...(workspace?.notificationSettings?.schedules || {})
    }
  };

  const [testingNotif, setTestingNotif] = useState(false);

  const handleToggleMain = async (e) => {
    const nextVal = e.target.checked;
    if (nextVal) {
      const res = await requestWebNotificationPermission();
      if (res.granted) {
        updateNotificationSettings({ enabled: true, webPushGranted: true });
        showToast('¡Notificaciones activadas! Recibirás avisos a tus horas de comida y agua.', 'emerald');
      } else {
        // Permitir que funcione al menos en la app aunque el navegador bloquee
        updateNotificationSettings({ enabled: true, webPushGranted: false });
        showToast('Avisos activados en la app (permiso del navegador pendiente o bloqueado).', 'warm');
      }
    } else {
      updateNotificationSettings({ enabled: false });
      showToast('Recordatorios y notificaciones desactivados.', 'emerald');
    }
  };

  const handleTimeChange = (mealKey, timeValue) => {
    updateNotificationSettings({
      schedules: {
        [mealKey]: timeValue
      }
    });
  };

  const handleTestNotification = () => {
    setTestingNotif(true);
    const notif = sendBrowserNotification('🔔 Prueba de NutriStudio AI', {
      body: `¡Hola ${currentUser?.name?.split(' ')[0] || ''}! Tus recordatorios de comida y agua están sincronizados.`
    });

    if (notif) {
      showToast('Se envió una notificación de prueba a tu sistema.', 'emerald');
    } else {
      showToast('Aviso de prueba: ¡Hora de revisar tu hidratación y comida!', 'emerald');
    }
    setTimeout(() => setTestingNotif(false), 800);
  };

  return (
    <div className="ns-card ns-card-organic" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', margin: '0 0 4px 0' }}>
            Recordatorios y Notificaciones Inteligentes ⏰
          </h2>
          <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
            Avisos a la hora exacta de tus comidas, seguimiento de agua e ideas del Coach.
          </p>
        </div>

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={Boolean(settings.enabled)}
            onChange={handleToggleMain}
            style={{ width: '18px', height: '18px', accentColor: 'var(--brand-leaf)' }}
          />
          <span>{settings.enabled ? 'Activas' : 'Desactivadas'}</span>
        </label>
      </div>

      {settings.enabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
          {/* Horarios de comidas personalizables */}
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '8px', color: 'var(--brand-leaf)' }}>
              Tus Horarios de Comida Habituales
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
              <div>
                <label htmlFor="notif-time-desayuno" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                  🍳 Desayuno
                </label>
                <input
                  id="notif-time-desayuno"
                  type="time"
                  className="ns-input"
                  value={settings.schedules?.desayuno || '08:00'}
                  onChange={e => handleTimeChange('desayuno', e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="notif-time-almuerzo" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                  🍲 Almuerzo
                </label>
                <input
                  id="notif-time-almuerzo"
                  type="time"
                  className="ns-input"
                  value={settings.schedules?.almuerzo || '13:00'}
                  onChange={e => handleTimeChange('almuerzo', e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="notif-time-merienda" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                  🍎 Merienda
                </label>
                <input
                  id="notif-time-merienda"
                  type="time"
                  className="ns-input"
                  value={settings.schedules?.merienda || '16:30'}
                  onChange={e => handleTimeChange('merienda', e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="notif-time-cena" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                  🌙 Cena
                </label>
                <input
                  id="notif-time-cena"
                  type="time"
                  className="ns-input"
                  value={settings.schedules?.cena || '20:00'}
                  onChange={e => handleTimeChange('cena', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Opciones de tipo de avisos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.86rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={Boolean(settings.mealReminders)}
                onChange={e => updateNotificationSettings({ mealReminders: e.target.checked })}
              />
              <span>Avisarme cuando llegue la hora de almorzar o cenar para no saltarme comidas</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={Boolean(settings.waterReminders)}
                onChange={e => updateNotificationSettings({ waterReminders: e.target.checked })}
              />
              <span>Recordatorio de agua cada 2–3 horas con el conteo de vasos del día</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={Boolean(settings.inactivityAlerts)}
                onChange={e => updateNotificationSettings({ inactivityAlerts: e.target.checked })}
              />
              <span>Mensaje si paso más de 1 día sin registrar para retomar el ritmo fácilmente</span>
            </label>

            {[
              ['medicationReminders', 'Recordarme mis medicamentos (solo si los declaré en mi historial voluntario)'],
              ['wellnessCheckInReminders', 'Recordarme el chequeo rápido de bienestar de 10 segundos'],
              ['proteinReminders', 'Avisarme por la tarde si voy muy por debajo de mi meta de proteína'],
              ['weeklyWeightReminders', 'Recordarme mi pesaje semanal'],
              ['labsStaleReminders', 'Avisarme si mis exámenes de laboratorio tienen más de 6 meses']
            ].map(([key, label]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={Boolean(settings[key])}
                  onChange={e => updateNotificationSettings({ [key]: e.target.checked })}
                />
                <span>{label}</span>
              </label>
            ))}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
              <div>
                <label htmlFor="notif-time-medicamento" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                  💊 Hora de medicamentos
                </label>
                <input
                  id="notif-time-medicamento"
                  type="time"
                  className="ns-input"
                  value={settings.schedules.medicamento}
                  onChange={e => handleTimeChange('medicamento', e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="notif-time-chequeo" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                  🌿 Hora del chequeo de bienestar
                </label>
                <input
                  id="notif-time-chequeo"
                  type="time"
                  className="ns-input"
                  value={settings.schedules.chequeo}
                  onChange={e => handleTimeChange('chequeo', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', paddingTop: '4px' }}>
            <button
              type="button"
              onClick={handleTestNotification}
              disabled={testingNotif}
              className="ns-btn ns-btn-outline ns-btn-sm"
            >
              {testingNotif ? 'Enviando prueba…' : 'Probar notificación ahora'}
            </button>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {settings.webPushGranted
                ? '✓ Permiso del navegador concedido para avisos en tu pantalla o celular.'
                : 'Avisos en la aplicación.'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
