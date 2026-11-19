import React, { useState } from 'react';
import {
  DEFAULT_REMINDERS,
  computeGamificationState,
  computeWellnessCorrelations,
  downloadWeeklyShareCard,
  triggerTestWebNotification
} from '../services/retentionEngine';
import { parseNutritionCsvImport } from '../services/openFoodFactsService';
import HealthDisclaimer from './HealthDisclaimer';

export default function RetentionHubSection({
  currentUser,
  workspace,
  countryName,
  aiProgress,
  waterTodayMl,
  goalWater,
  onSaveWellnessLog,
  onSaveReminders,
  onImportCsvData
}) {
  const [hubTab, setHubTab] = useState('gamification'); // 'gamification' | 'wellness' | 'integrations'

  // Estado de Bienestar Ampliado
  const [sleepHours, setSleepHours] = useState('7.5');
  const [steps, setSteps] = useState('7500');
  const [mood, setMood] = useState('4');
  const [waistCm, setWaistCm] = useState('');
  const [digestiveNote, setDigestiveNote] = useState('Digestión normal');
  const [progressPhoto, setProgressPhoto] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  const gamification = computeGamificationState({
    workspace,
    aiProgress,
    waterTodayMl,
    goalWater
  });
  const correlations = computeWellnessCorrelations({
    wellnessLogs: workspace.wellnessLogs || [],
    mealLogs: workspace.mealLogs || []
  });
  const reminders = workspace.reminders || DEFAULT_REMINDERS;

  const handleWellnessSubmit = (e) => {
    e.preventDefault();
    onSaveWellnessLog({
      id: `well-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      sleepHours: Number(sleepHours) || 0,
      steps: Number(steps) || 0,
      mood: Number(mood) || 3,
      waistCm: Number(waistCm) || 0,
      digestiveNote: digestiveNote.trim() || 'Normal',
      progressPhoto
    });
    setProgressPhoto(null);
    setStatusMsg('Registro de bienestar guardado y correlacionado con tu alimentación.');
    setTimeout(() => setStatusMsg(''), 3500);
  };

  const handleCsvFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseNutritionCsvImport(text);
      onImportCsvData(parsed);
      setStatusMsg(
        `Importación exitosa: ${parsed.importedMeals.length} comida(s) y ${parsed.importedWellness.length} registro(s) de actividad/peso.`
      );
      setTimeout(() => setStatusMsg(''), 4500);
    } catch (err) {
      setStatusMsg(err.message);
    }
  };

  return (
    <div className="card" style={{ marginTop: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
        <div>
          <span className="tag-pill">Nivel {gamification.level} · {gamification.levelTitle} ({gamification.xp} XP)</span>
          <div className="card-title" style={{ marginTop: '6px' }}>
            Logros, Bienestar Integral, Recordatorios e Integraciones
          </div>
        </div>
        <button
          type="button"
          className="btn-solid"
          style={{ padding: '8px 14px', fontSize: '0.78rem' }}
          onClick={() =>
            downloadWeeklyShareCard({
              userName: currentUser.name,
              countryName,
              gamification,
              aiProgress,
              avgKcal: aiProgress.avgActiveKcal || 0
            })
          }
        >
          📸 Compartir Resumen Semanal (PNG)
        </button>
      </div>

      <div className="subtab-bar">
        <button
          type="button"
          className={`subtab-btn ${hubTab === 'gamification' ? 'active' : ''}`}
          onClick={() => setHubTab('gamification')}
        >
          🏆 Logros y Retos
        </button>
        <button
          type="button"
          className={`subtab-btn ${hubTab === 'wellness' ? 'active' : ''}`}
          onClick={() => setHubTab('wellness')}
        >
          🧘 Sueño, Pasos y Correlaciones
        </button>
        <button
          type="button"
          className={`subtab-btn ${hubTab === 'integrations' ? 'active' : ''}`}
          onClick={() => setHubTab('integrations')}
        >
          🔔 Recordatorios e Importar CSV
        </button>
      </div>

      {statusMsg && (
        <div style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, marginBottom: '10px' }}>
          {statusMsg}
        </div>
      )}

      {hubTab === 'gamification' && (
        <div className="split-grid">
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.84rem', marginBottom: '8px' }}>
              Insignias desbloqueadas ({gamification.badges.filter(b => b.unlocked).length}/{gamification.badges.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {gamification.badges.map(b => (
                <div
                  key={b.id}
                  className="list-item-card"
                  style={{
                    opacity: b.unlocked ? 1 : 0.55,
                    borderColor: b.unlocked ? 'var(--accent)' : 'var(--border)',
                    padding: '10px'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>
                      {b.icon} {b.title}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{b.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 600, fontSize: '0.84rem', marginBottom: '8px' }}>
              Retos semanales activos
            </div>
            <div className="list-stack">
              {gamification.weeklyChallenges.map(ch => (
                <div key={ch.title} className="list-item-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span>{ch.title}</span>
                    <strong>
                      {ch.current}/{ch.target}
                    </strong>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${ch.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {hubTab === 'wellness' && (
        <div className="split-grid">
          <form onSubmit={handleWellnessSubmit} className="form-stack">
            <div className="field-row">
              <div className="field-group">
                <label className="field-label">Sueño anoche (horas)</label>
                <input
                  type="number"
                  step="0.5"
                  min="2"
                  max="14"
                  className="input-clean"
                  value={sleepHours}
                  onChange={e => setSleepHours(e.target.value)}
                />
              </div>
              <div className="field-group">
                <label className="field-label">Pasos / actividad hoy</label>
                <input
                  type="number"
                  min="0"
                  max="50000"
                  className="input-clean"
                  value={steps}
                  onChange={e => setSteps(e.target.value)}
                />
              </div>
            </div>
            <div className="field-row">
              <div className="field-group">
                <label className="field-label">Ánimo (1 bajo – 5 excelente)</label>
                <select className="input-clean" value={mood} onChange={e => setMood(e.target.value)}>
                  <option value="5">5 · Excelente energía</option>
                  <option value="4">4 · Bien</option>
                  <option value="3">3 · Neutral</option>
                  <option value="2">2 · Cansado</option>
                  <option value="1">1 · Estrés / fatiga</option>
                </select>
              </div>
              <div className="field-group">
                <label className="field-label">Cintura (cm, opcional)</label>
                <input
                  type="number"
                  step="0.5"
                  className="input-clean"
                  placeholder="Ej. 78"
                  value={waistCm}
                  onChange={e => setWaistCm(e.target.value)}
                />
              </div>
            </div>
            <div className="field-group">
              <label className="field-label">Síntomas digestivos</label>
              <input
                type="text"
                className="input-clean"
                value={digestiveNote}
                onChange={e => setDigestiveNote(e.target.value)}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Foto de progreso corporal (privada, opcional)</label>
              <input
                type="file"
                accept="image/*"
                className="input-clean"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const r = new FileReader();
                  r.onload = () => setProgressPhoto(r.result);
                  r.readAsDataURL(f);
                }}
              />
            </div>
            <button type="submit" className="btn-solid">
              Guardar registro de bienestar
            </button>
          </form>

          <div>
            <div style={{ fontWeight: 600, fontSize: '0.84rem', marginBottom: '8px' }}>
              Correlaciones detectadas en tu proceso
            </div>
            <div className="list-stack">
              {correlations.map((c, idx) => (
                <div key={idx} className="list-item-card" style={{ fontSize: '0.79rem', color: 'var(--text-secondary)' }}>
                  • {c}
                </div>
              ))}
            </div>
            <HealthDisclaimer />
          </div>
        </div>
      )}

      {hubTab === 'integrations' && (
        <div className="split-grid">
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.84rem', marginBottom: '8px' }}>
              Recordatorios diarios (Notificaciones Web / PWA)
            </div>
            <div className="list-stack">
              {Object.entries(reminders).map(([key, rem]) => (
                <div key={key} className="list-item-card">
                  <div>
                    <strong style={{ fontSize: '0.82rem' }}>{rem.label}</strong>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Hora sugerida: {rem.time}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(rem.enabled)}
                    onChange={() =>
                      onSaveReminders({
                        ...reminders,
                        [key]: { ...rem, enabled: !rem.enabled }
                      })
                    }
                  />
                </div>
              ))}
              <button
                type="button"
                className="btn-outline"
                onClick={async () => {
                  const res = await triggerTestWebNotification(
                    'NutriStudio AI · Recordatorio',
                    '¡Hora de tomar un vaso de agua y revisar tu siguiente comida saludable!'
                  );
                  setStatusMsg(res);
                }}
              >
                🔔 Probar notificación en este navegador
              </button>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 600, fontSize: '0.84rem', marginBottom: '8px' }}>
              Importar datos (MyFitnessPal · Cronometer · Google Fit · Apple Health)
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
              Sube un archivo <strong>.csv</strong> exportado de MyFitnessPal, Cronometer, Google Fit o Apple Health (columnas de fecha, alimento/plato, calorías, macros, pasos o peso).
            </p>
            <input
              type="file"
              accept=".csv,text/csv"
              className="input-clean"
              onChange={handleCsvFileUpload}
            />
            <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              📱 Esta app es una <strong>PWA instalable</strong> con respaldo offline en IndexedDB: puedes instalarla en tu celular o PC desde el ícono de la barra del navegador.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
