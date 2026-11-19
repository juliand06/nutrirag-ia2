import React from 'react';

export default function CalorieRing({
  goalKcal,
  consumedKcal,
  pctKcal,
  consumedCarbs,
  goalCarbs,
  pctCarbs,
  consumedProtein,
  goalProtein,
  pctProtein,
  consumedFat,
  goalFat,
  pctFat,
  streakDays,
  consistencyPct
}) {
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference * (1 - Math.min(100, pctKcal) / 100);
  const remainingToday = Math.max(0, goalKcal - consumedKcal);

  return (
    <div className="calorie-ring-card">
      <div className="ring-wrapper" aria-label={`Calorías restantes: ${remainingToday}`}>
        <svg className="ring-svg" viewBox="0 0 156 156" role="img" aria-label="Progreso calórico diario">
          <defs>
            <linearGradient id="nutriRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f6b56" />
              <stop offset="100%" stopColor="#14b8a6" />
            </linearGradient>
          </defs>
          <circle cx="78" cy="78" r={radius} fill="none" stroke="#eaf0ee" strokeWidth="12" />
          <circle
            cx="78"
            cy="78"
            r={radius}
            fill="none"
            stroke="url(#nutriRingGrad)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            style={{ transition: 'stroke-dashoffset 0.4s ease' }}
          />
        </svg>
        <div className="ring-center">
          <span className="ring-kcal-big">
            {goalKcal > 0 ? remainingToday.toLocaleString() : consumedKcal}
          </span>
          <span className="ring-kcal-label">{goalKcal > 0 ? 'kcal restantes' : 'kcal hoy'}</span>
          <span style={{ fontSize: '0.68rem', color: 'var(--accent)', fontWeight: 600, marginTop: '2px' }}>
            {consumedKcal} / {goalKcal}
          </span>
        </div>
      </div>

      <div className="macro-bars-stack">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <strong style={{ fontSize: '0.88rem' }}>Macronutrientes hoy</strong>
          <span className="streak-pill">
            Racha: {streakDays}d · {consistencyPct}%
          </span>
        </div>

        <div className="macro-bar-row">
          <div className="macro-bar-head">
            <span>Carbohidratos</span>
            <strong>
              {consumedCarbs}g / {goalCarbs}g
            </strong>
          </div>
          <div className="macro-track">
            <div className="macro-fill-carbs" style={{ width: `${pctCarbs}%` }} />
          </div>
        </div>

        <div className="macro-bar-row">
          <div className="macro-bar-head">
            <span>Proteínas</span>
            <strong>
              {consumedProtein}g / {goalProtein}g
            </strong>
          </div>
          <div className="macro-track">
            <div className="macro-fill-protein" style={{ width: `${pctProtein}%` }} />
          </div>
        </div>

        <div className="macro-bar-row">
          <div className="macro-bar-head">
            <span>Grasas saludables</span>
            <strong>
              {consumedFat}g / {goalFat}g
            </strong>
          </div>
          <div className="macro-track">
            <div className="macro-fill-fat" style={{ width: `${pctFat}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
