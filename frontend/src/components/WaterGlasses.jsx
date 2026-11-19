import React from 'react';

export default function WaterGlasses({
  waterTodayMl,
  goalWater,
  onAdjustWater,
  mealsCount,
  countryName,
  onOpenFoodSearch,
  fastingState,
  onToggleFasting
}) {
  const filledGlasses = Math.min(8, Math.floor(waterTodayMl / 250));
  const fs = fastingState || { active: false, startedAt: null, targetHours: 14 };
  const elapsedHrs =
    fs.active && fs.startedAt
      ? Math.max(0, (Date.now() - new Date(fs.startedAt).getTime()) / (1000 * 60 * 60))
      : 0;
  const fastPct = fs.active ? Math.min(100, Math.round((elapsedHrs / (fs.targetHours || 14)) * 100)) : 0;

  return (
    <div className="hydration-visual-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <div>
          <strong style={{ fontSize: '0.9rem' }}>Hidratación visual (vasos de 250 ml)</strong>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {waterTodayMl} ml / {goalWater || 2000} ml · Toca un vaso para registrar
          </div>
        </div>
        <span className="tag-pill">{filledGlasses} / 8 vasos</span>
      </div>

      <div className="water-drops-grid" role="group" aria-label="Control de vasos de agua">
        {Array.from({ length: 8 }).map((_, idx) => {
          const isFilled = idx < filledGlasses;
          return (
            <button
              key={idx}
              type="button"
              className={`water-drop-btn ${isFilled ? 'filled' : ''}`}
              aria-label={`Registrar ${(idx + 1) * 250} mililitros de agua`}
              title={`${(idx + 1) * 250} ml`}
              onClick={() => {
                const targetMl = (idx + 1) * 250;
                const delta = targetMl === waterTodayMl ? -250 : targetMl - waterTodayMl;
                onAdjustWater(delta);
              }}
            >
              💧
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
          <strong>{mealsCount}</strong> plato(s) hoy · País: <strong>{countryName}</strong>
        </span>
        <button
          type="button"
          className="btn-solid"
          style={{ padding: '7px 12px', fontSize: '0.78rem' }}
          onClick={onOpenFoodSearch}
        >
          + Buscar alimento
        </button>
      </div>

      <div
        style={{
          paddingTop: '10px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ fontSize: '0.75rem' }}>
          <strong>Ventana alimentaria ({fs.targetHours || 14}h):</strong>{' '}
          <span style={{ color: 'var(--text-secondary)' }}>
            {fs.active
              ? `${elapsedHrs.toFixed(1)}h transcurridas (${fastPct}%)`
              : 'Inactiva (reposo nocturno sugerido 12–14h)'}
          </span>
        </div>
        <button
          type="button"
          className="copilot-chip"
          onClick={() => onToggleFasting(fs.targetHours || 14)}
        >
          {fs.active ? 'Finalizar ventana' : 'Iniciar ventana 14h'}
        </button>
      </div>
    </div>
  );
}
