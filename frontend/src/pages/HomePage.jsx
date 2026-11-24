import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useNutriStore } from '../store/useNutriStore';
import { getCountryProfile } from '../lib/countryNutritionData';
import { generateProactiveDailyRoadmap } from '../lib/proactiveAiEngine';
import { HandUnderline } from '../assets/doodles/HandDrawnSvgs';

function getGreetingByHour() {
  const hour = new Date().getHours();
  if (hour < 12) return '¡Buenos días';
  if (hour < 19) return '¡Buenas tardes';
  return '¡Buenas noches';
}

export default function HomePage() {
  const currentUser = useNutriStore(s => s.currentUser);
  const workspace = useNutriStore(s => s.workspace);
  const setWaterGlassesForDate = useNutriStore(s => s.setWaterGlassesForDate);
  const setQuickAddOpen = useNutriStore(s => s.setQuickAddOpen);
  const addMealEntry = useNutriStore(s => s.addMealEntry);

  const roadmap = generateProactiveDailyRoadmap(currentUser || {}, workspace || {});
  const ctx = roadmap.context;
  const today = ctx.todayIso;
  const firstName = roadmap.firstName;
  const country = getCountryProfile(currentUser?.country || 'CO');

  const consumed = ctx.consumed;
  const goalKcal = ctx.goals.kcal;
  const goalCarbs = ctx.goals.carbs;
  const goalProtein = ctx.goals.protein;
  const goalFat = ctx.goals.fat;
  const goalWaterGlasses = ctx.goals.waterGlasses;
  const waterGlassesToday = ctx.waterGlassesToday;

  const kcalPct = Math.min(100, Math.round((consumed.kcal / Math.max(1, goalKcal)) * 100));
  const remainingKcal = ctx.remaining.kcal;

  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (kcalPct / 100) * circumference;

  const suggestedDish = roadmap.recommendedMeal;
  const hideNumbers = Boolean(currentUser?.hideCalorieNumbersMode);

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto' }}>
      {/* Encabezado limpio y sereno */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '26px'
        }}
      >
        <div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.3rem)', marginBottom: '4px' }}>
            {getGreetingByHour()}, {firstName}!
            <HandUnderline color="#B84714" style={{ maxWidth: '180px', marginTop: '2px' }} />
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.98rem' }}>
            ¿Cómo quieres cuidar tu alimentación hoy?
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setQuickAddOpen(true)}
            className="ns-btn ns-btn-carrot ns-btn-md"
          >
            + Registrar o tomar foto
          </button>
          <Link to="/app/coach" className="ns-btn ns-btn-leaf ns-btn-md">
            Hablar con mi Coach IA
          </Link>
        </div>
      </div>

      {/* Aviso cálido solo si hay alerta de seguridad clínica */}
      {currentUser?.safetyAdvisoryActive && (
        <div
          className="ns-card ns-card-warm"
          style={{ marginBottom: '22px', borderColor: 'var(--accent-carrot)', padding: '16px 20px' }}
        >
          <strong style={{ color: 'var(--accent-carrot)' }}>Modo de cuidado educativo:</strong>{' '}
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            {currentUser.safetyMessage}
          </span>
        </div>
      )}

      {/* Bloque principal enfocado: 2 tarjetas serenas (Resumen de hoy + Tu próxima comida) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
          gap: '22px',
          marginBottom: '24px'
        }}
      >
        {/* Tarjeta 1: Tu día de un vistazo (Energía + Macros + Agua compacta) */}
        <section className="ns-card ns-card-organic" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {!hideNumbers && (
              <div
                role="progressbar"
                aria-valuenow={kcalPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Energía de hoy: ${consumed.kcal} de ${goalKcal} kcal`}
                style={{ position: 'relative', width: '136px', height: '136px', flexShrink: 0 }}
              >
                <svg width="136" height="136" viewBox="0 0 136 136" aria-hidden="true">
                  <circle cx="68" cy="68" r={radius} fill="none" stroke="var(--bg-warm)" strokeWidth="11" />
                  <motion.circle
                    cx="68"
                    cy="68"
                    r={radius}
                    fill="none"
                    stroke="var(--brand-leaf)"
                    strokeWidth="11"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    transform="rotate(-90 68 68)"
                  />
                </svg>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center'
                  }}
                >
                  <span style={{ fontSize: '1.35rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                    {consumed.kcal}
                  </span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>de {goalKcal} kcal</span>
                </div>
              </div>
            )}

            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '1.22rem', marginBottom: '6px' }}>
                {hideNumbers ? 'Tu balance de hoy' : 'Energía de hoy'}
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0 0 10px 0' }}>
                {consumed.kcal === 0
                  ? 'Aún no has anotado comidas hoy. Puedes tomarle foto a tu plato o elegir una opción sugerida.'
                  : hideNumbers
                    ? `Has registrado ${ctx.todayMeals.length} comida(s) nutritiva(s) hoy.`
                    : `Te quedan aprox. ${remainingKcal} kcal para completar tu jornada.`}
              </p>
              <Link to="/app/diario" style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                Abrir mi diario →
              </Link>
            </div>
          </div>

          {/* 4 barras limpias de macros y fibra */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'Proteína', current: consumed.protein, goal: goalProtein, color: 'var(--brand-leaf)' },
              { label: 'Carbohidratos', current: consumed.carbs, goal: goalCarbs, color: 'var(--accent-carrot)' },
              { label: 'Grasas buenas', current: consumed.fat, goal: goalFat, color: 'var(--accent-earth)' },
              { label: 'Fibra', current: consumed.fiber, goal: currentUser?.clinicalTargets?.fiberGrams || 28, color: 'var(--brand-leaf)' }
            ].map(macro => {
              const pct = Math.min(100, Math.round((macro.current / Math.max(1, macro.goal)) * 100));
              return (
                <div key={macro.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', fontWeight: 600, marginBottom: '3px' }}>
                    <span>{macro.label}</span>
                    <span>{macro.current}g / {macro.goal}g</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${macro.label}: ${macro.current} de ${macro.goal} gramos`}
                    style={{ height: '7px', borderRadius: '999px', backgroundColor: 'var(--bg-warm)', overflow: 'hidden' }}
                  >
                    <div style={{ width: `${pct}%`, height: '100%', backgroundColor: macro.color, transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Control simple y limpio de agua */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '14px',
              backgroundColor: 'var(--bg-sage)'
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--brand-leaf)' }}>
                Agua: {waterGlassesToday} / {goalWaterGlasses} vasos
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {waterGlassesToday * 250} ml de {ctx.goals.waterMl} ml
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setWaterGlassesForDate(today, Math.max(0, waterGlassesToday - 1))}
                className="ns-btn ns-btn-outline ns-btn-sm"
                aria-label="Restar 1 vaso de agua"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => setWaterGlassesForDate(today, waterGlassesToday + 1)}
                className="ns-btn ns-btn-leaf ns-btn-sm"
              >
                + 1 vaso
              </button>
            </div>
          </div>
        </section>

        {/* Tarjeta 2: Siguiente comida recomendada (1 sola decisión clara) */}
        <article className="ns-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ position: 'relative', height: '185px' }}>
              <img
                src={suggestedDish.image}
                alt={suggestedDish.dishName}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              <span
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--brand-leaf)',
                  padding: '5px 12px',
                  borderRadius: '999px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.12)'
                }}
              >
                Sugerido para tu {suggestedDish.mealType} · {suggestedDish.kcal} kcal
              </span>
            </div>
            <div style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '1.28rem', marginBottom: '8px' }}>{suggestedDish.dishName}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 14px 0' }}>
                Elegido según tu perfil en {country.name}, tus gustos y el protocolo {roadmap.protocols[0]?.source}.
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className="ns-chip">{suggestedDish.protein}g proteína</span>
                <span className="ns-chip">{suggestedDish.carbs}g carbos</span>
                <span className="ns-chip">{suggestedDish.fiber}g fibra</span>
              </div>
            </div>
          </div>

          <div style={{ padding: '0 20px 20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => addMealEntry({ date: today, ...suggestedDish })}
              className="ns-btn ns-btn-leaf ns-btn-sm"
              style={{ flex: 1 }}
            >
              + Registrar en mi diario
            </button>
            <Link to="/app/planes" className="ns-btn ns-btn-outline ns-btn-sm">
              Ver plan semanal
            </Link>
          </div>
        </article>
      </div>

      {/* Detalles clínicos profundos guardados de forma limpia y desplegable (sin contaminación visual) */}
      <details className="ns-card ns-card-warm" style={{ padding: '16px 20px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: '0.96rem', color: 'var(--brand-leaf)' }}>
          Ver mis protocolos médicos activos, farmacovigilancia y guía del día
        </summary>

        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {roadmap.protocols.map(proto => (
            <div key={proto.id} className="ns-card" style={{ padding: '14px' }}>
              <div style={{ fontWeight: 700, color: 'var(--brand-leaf)', fontSize: '0.94rem' }}>
                {proto.label}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                {proto.source}
              </div>
              <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                {proto.keyRules}
              </p>
            </div>
          ))}

          {roadmap.drugNutrientInteractions?.map(drug => (
            <div
              key={drug.conditionId}
              className="ns-card"
              style={{ padding: '12px 14px', borderLeft: '3px solid var(--accent-carrot)' }}
            >
              <div style={{ fontWeight: 700, color: 'var(--accent-carrot)', fontSize: '0.84rem' }}>
                Farmacovigilancia ({drug.medications})
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                {drug.interactionRule}
              </p>
            </div>
          ))}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '8px' }}>
            {roadmap.dayTimeline.map(step => (
              <div
                key={step.period}
                style={{
                  padding: '10px 12px',
                  borderRadius: '12px',
                  backgroundColor: step.done ? 'var(--bg-sage)' : 'var(--bg-surface)',
                  border: '1px solid var(--border-warm)',
                  fontSize: '0.82rem'
                }}
              >
                <div style={{ fontWeight: 700, color: step.done ? 'var(--brand-leaf)' : 'var(--text-primary)' }}>
                  {step.done ? '✓ ' : '• '}
                  {step.period}
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>{step.instruction}</div>
              </div>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}
