import React, { useState } from 'react';
import { useNutriStore } from '../store/useNutriStore';
import {
  computeAiProgressIntelligence,
  computeAdaptiveTdeeCheckIn
} from '../services/aiWorkflowEngine';

export default function ProgressPage() {
  const currentUser = useNutriStore(s => s.currentUser);
  const workspace = useNutriStore(s => s.workspace);
  const addWeightLog = useNutriStore(s => s.addWeightLog);
  const updateUserProfile = useNutriStore(s => s.updateUserProfile);
  const showToast = useNutriStore(s => s.showToast);

  const [range, setRange] = useState('week'); // 'week' | 'month'
  const [newWeight, setNewWeight] = useState(currentUser?.weightKg || 67);

  const weightHistory = workspace?.weightHistory || [];
  const mealLogs = workspace?.mealLogs || [];

  // Normalizar logs para el motor adaptativo
  const normalizedWorkspace = {
    ...workspace,
    mealLogs: mealLogs.map(m => ({
      ...m,
      totalCalories: m.kcal ?? m.totalCalories ?? 0,
      proteinGrams: m.protein ?? m.proteinGrams ?? 0
    }))
  };

  const aiProgress = computeAiProgressIntelligence({
    userProfile: currentUser,
    workspace: normalizedWorkspace,
    dailyTracking: {}
  });

  const adaptiveCheckIn = computeAdaptiveTdeeCheckIn({
    userProfile: currentUser,
    workspace: normalizedWorkspace,
    metrics: { tdee: currentUser?.dailyCalories || 1950 }
  });

  // Serie de peso
  const displayedWeights =
    weightHistory.length >= 2
      ? weightHistory.slice(-7)
      : [
          { date: 'Inicio', weightKg: Number(currentUser?.weightKg) || 67 },
          { date: 'Hoy', weightKg: Number(currentUser?.weightKg) || 67 }
        ];

  const handleSaveWeight = (e) => {
    e.preventDefault();
    addWeightLog(newWeight, 'Actualización manual en Mi Progreso');
  };

  const handleApplyAdaptiveCalories = () => {
    if (!adaptiveCheckIn?.suggestedCalories) return;
    updateUserProfile({ dailyCalories: adaptiveCheckIn.suggestedCalories });
    showToast(`Recalibramos tu meta diaria a ${adaptiveCheckIn.suggestedCalories} kcal según tu evolución real.`, 'emerald');
  };

  const handleShareSummary = async () => {
    const summaryText = `Mi resumen en NutriStudio AI: Meta de ${currentUser?.dailyCalories || 1950} kcal/día, ${mealLogs.length} comidas registradas y peso actual de ${currentUser?.weightKg || 67} kg. ¡Comiendo rico con alimentos reales!`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(summaryText);
      }
      showToast('Resumen semanal copiado al portapapeles para compartir.', 'emerald');
    } catch {
      showToast(summaryText, 'emerald');
    }
  };

  const BADGES = [
    {
      title: 'Primer plato en la mesa',
      desc: 'Registraste tu primera comida real en el diario.',
      unlocked: mealLogs.length > 0
    },
    {
      title: 'Hidratación consciente',
      desc: 'Sumaste vasos de agua en tu seguimiento diario.',
      unlocked: Object.keys(workspace?.waterGlassesByDate || {}).length > 0
    },
    {
      title: 'Sabores de mi tierra',
      desc: `Plan personalizado con ingredientes locales de ${currentUser?.country || 'CO'}.`,
      unlocked: true
    },
    {
      title: 'Constancia de 7 días',
      desc: 'Una semana completa construyendo hábitos sin extremos.',
      unlocked: mealLogs.length >= 7
    }
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '22px'
        }}
      >
        <div>
          <h1 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', marginBottom: '4px' }}>
            Tu progreso y metabolismo adaptativo IA
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Tu IA proyecta tu evolución a 30 días y recalibra tus calorías según cómo responde tu cuerpo en la vida real.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setRange('week')}
            className={`ns-chip ${range === 'week' ? 'ns-chip-active' : ''}`}
          >
            Vista semanal
          </button>
          <button
            type="button"
            onClick={() => setRange('month')}
            className={`ns-chip ${range === 'month' ? 'ns-chip-active' : ''}`}
          >
            Vista mensual
          </button>
        </div>
      </div>

      {/* PRONÓSTICO IA A 30 DÍAS + CHECK-IN METABÓLICO ADAPTATIVO (MACROFACTOR STYLE) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '18px',
          marginBottom: '24px'
        }}
      >
        <section className="ns-card ns-card-sage">
          <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--brand-leaf)', textTransform: 'uppercase' }}>
            Pronóstico Corporal IA a 30 días
          </span>
          <h2 style={{ fontSize: '1.22rem', margin: '6px 0 8px' }}>{aiProgress.forecastTitle}</h2>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {aiProgress.forecastDetail}
          </p>
        </section>

        <section className="ns-card ns-card-warm" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--accent-earth)', textTransform: 'uppercase' }}>
              Motor Metabólico Adaptativo
            </span>
            <h2 style={{ fontSize: '1.22rem', margin: '6px 0 8px' }}>{adaptiveCheckIn.headline}</h2>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {adaptiveCheckIn.explanation}
            </p>
          </div>
          {adaptiveCheckIn.ready && adaptiveCheckIn.deltaKcal !== 0 && (
            <button
              type="button"
              onClick={handleApplyAdaptiveCalories}
              className="ns-btn ns-btn-leaf ns-btn-sm"
            >
              Aplicar ajuste sugerido ({adaptiveCheckIn.suggestedCalories} kcal/día)
            </button>
          )}
        </section>
      </div>

      {/* Gráficas de Peso y Calorías/Macros */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '22px',
          marginBottom: '28px'
        }}
      >
        {/* Evolución de peso */}
        <section className="ns-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Tendencia de peso</h2>
            <span style={{ fontWeight: 700, color: 'var(--brand-leaf)' }}>
              Actual: {currentUser?.weightKg || 67} kg · Meta: {currentUser?.targetWeightKg || 64} kg
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '14px',
              height: '150px',
              padding: '16px 12px',
              backgroundColor: 'var(--bg-warm)',
              borderRadius: '14px',
              marginBottom: '16px'
            }}
          >
            {displayedWeights.map((entry, idx) => (
              <div
                key={`${entry.date}-${idx}`}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{entry.weightKg} kg</span>
                <div
                  style={{
                    width: '100%',
                    maxWidth: '42px',
                    height: `${Math.max(36, Math.min(95, entry.weightKg))}px`,
                    backgroundColor: 'var(--brand-leaf)',
                    borderRadius: '10px 10px 4px 4px'
                  }}
                />
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  {entry.date.slice(-5)}
                </span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSaveWeight} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="number"
              step="0.1"
              min="30"
              max="260"
              className="ns-input"
              value={newWeight}
              onChange={e => setNewWeight(e.target.value)}
              aria-label="Registrar nuevo peso en kg"
            />
            <button type="submit" className="ns-btn ns-btn-leaf ns-btn-md" style={{ flexShrink: 0 }}>
              Registrar peso
            </button>
          </form>
        </section>

        {/* Calorías y Macros promedio */}
        <section className="ns-card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '10px' }}>
            Balance de calorías y macros ({range === 'week' ? 'Últimos 7 días' : 'Últimos 30 días'})
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Meta diaria configurada: <strong>{currentUser?.dailyCalories || 1950} kcal</strong> ({currentUser?.targetProtein || 125}g proteína · {currentUser?.targetCarbs || 210}g carbos · {currentUser?.targetFat || 62}g grasas).
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'Cumplimiento de proteína (Consenso ISSN)', pct: 86, color: 'var(--brand-leaf)' },
              { label: 'Equilibrio de carbohidratos complejos (ADA)', pct: 82, color: 'var(--accent-carrot)' },
              { label: 'Grasas cardioprotectoras (AHA / DASH)', pct: 90, color: 'var(--accent-earth)' }
            ].map(row => (
              <div key={row.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', fontWeight: 600, marginBottom: '4px' }}>
                  <span>{row.label}</span>
                  <span>{row.pct}%</span>
                </div>
                <div style={{ height: '10px', borderRadius: '999px', backgroundColor: 'var(--bg-warm)', overflow: 'hidden' }}>
                  <div style={{ width: `${row.pct}%`, height: '100%', backgroundColor: row.color }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Logros e Insignias + Resumen semanal compartible */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '22px'
        }}
      >
        <section className="ns-card">
          <h2 style={{ fontSize: '1.28rem', marginBottom: '14px' }}>Logros e insignias</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {BADGES.map(b => (
              <div
                key={b.title}
                className="ns-card"
                style={{
                  padding: '14px',
                  backgroundColor: b.unlocked ? 'var(--bg-sage)' : 'var(--bg-warm)',
                  opacity: b.unlocked ? 1 : 0.65
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--brand-leaf)', marginBottom: '4px' }}>
                  {b.unlocked ? '✓ ' : '○ '}
                  {b.title}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{b.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="ns-card ns-card-organic ns-card-warm" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-earth)' }}>
              Tarjeta de resumen semanal
            </span>
            <h2 style={{ fontSize: '1.45rem', margin: '6px 0 10px' }}>
              Semana de {currentUser?.name || 'NutriStudio'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.94rem' }}>
              • Comidas registradas en tu diario: <strong>{mealLogs.length}</strong><br />
              • Meta energética: <strong>{currentUser?.dailyCalories || 1950} kcal / día</strong><br />
              • Enfoque: <strong>Alimentación real en {currentUser?.city || 'Colombia'}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={handleShareSummary}
            className="ns-btn ns-btn-carrot ns-btn-md"
          >
            Compartir mi resumen semanal
          </button>
        </section>
      </div>
    </div>
  );
}
