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

  // Racha de días con registro
  const distinctDates = new Set((workspace?.mealLogs || []).map(m => m.date));
  const streakDays = Math.max(1, distinctDates.size);

  // Anillo SVG
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (kcalPct / 100) * circumference;

  const suggestedDish = roadmap.recommendedMeal;

  const handleActionClick = (action) => {
    if (action.actionType === 'log_meal' && action.mealPayload) {
      addMealEntry({
        date: today,
        ...action.mealPayload
      });
    } else if (action.actionType === 'add_water') {
      setWaterGlassesForDate(today, waterGlassesToday + 1);
    }
  };

  return (
    <div>
      {/* Encabezado cálido por nombre y hora */}
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
          <span
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: 'var(--accent-earth)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            {currentUser?.city || country.name} · Racha activa: {streakDays} {streakDays === 1 ? 'día' : 'días'}
          </span>
          <h1 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.35rem)', marginBottom: '4px', marginTop: '4px' }}>
            {getGreetingByHour()}, {firstName}!
            <HandUnderline color="#D95D24" style={{ maxWidth: '190px', marginTop: '2px' }} />
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1rem' }}>
            Tu IA analizó tus 13 datos clínicos y tu progreso de hoy para guiarte paso a paso sin que tengas que preguntar.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setQuickAddOpen(true)}
            className="ns-btn ns-btn-carrot ns-btn-md"
          >
            + Registrar comida
          </button>
          <Link to="/app/coach" className="ns-btn ns-btn-outline ns-btn-md">
            Preguntar al Coach IA
          </Link>
        </div>
      </div>

      {/* Si se activó regla de seguridad en el onboarding, recordatorio cálido */}
      {currentUser?.safetyAdvisoryActive && (
        <div
          className="ns-card ns-card-warm"
          style={{ marginBottom: '24px', borderColor: 'var(--accent-carrot)' }}
        >
          <strong style={{ color: 'var(--accent-carrot)' }}>Modo de cuidado y orientación educativa:</strong>{' '}
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.94rem' }}>
            {currentUser.safetyMessage}
          </span>
        </div>
      )}

      {/* NUEVO PANEL PRINCIPAL: TU RUTA CLÍNICA PROACTIVA DE HOY (SIN NECESIDAD DE PREGUNTAR) */}
      <section
        className="ns-card ns-card-organic ns-card-warm"
        style={{ padding: '24px', marginBottom: '26px', border: '1.5px solid var(--border-strong)' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px'
          }}
        >
          <div>
            <span
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '999px',
                backgroundColor: 'var(--brand-leaf)',
                color: '#FFFFFF',
                fontSize: '0.78rem',
                fontWeight: 700,
                marginBottom: '8px'
              }}
            >
              IA Clínica Proactiva · Qué hacer ahora ({roadmap.timeWindowLabel})
            </span>
            <h2 style={{ fontSize: '1.45rem', margin: 0 }}>
              Tu guía automática para hoy basada en evidencia médica
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              Perfil analizado: {roadmap.profileAuditSummary}
            </p>
          </div>
        </div>

        {/* Las 3 decisiones proactivas que la IA toma por la persona hoy */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
            gap: '16px',
            marginBottom: '18px'
          }}
        >
          {roadmap.immediateActions.map(action => (
            <div
              key={action.id}
              className="ns-card"
              style={{
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '999px',
                      backgroundColor: 'var(--brand-leaf-soft)',
                      color: 'var(--brand-leaf)'
                    }}
                  >
                    {action.priority}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {action.category}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.08rem', marginBottom: '6px', lineHeight: 1.35 }}>
                  {action.title}
                </h3>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  {action.detail}
                </p>
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--accent-earth)',
                    borderTop: '1px dashed var(--border-warm)',
                    paddingTop: '8px'
                  }}
                >
                  <strong>Respaldo clínico:</strong> {action.clinicalBasis}
                </div>
              </div>

              {action.actionType !== 'none' && (
                <button
                  type="button"
                  onClick={() => handleActionClick(action)}
                  className="ns-btn ns-btn-leaf ns-btn-sm"
                  style={{ width: '100%' }}
                >
                  {action.actionLabel}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Línea de tiempo de las 4 etapas del día */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '10px',
            paddingTop: '12px',
            borderTop: '1px solid var(--border-warm)'
          }}
        >
          {roadmap.dayTimeline.map(step => (
            <div
              key={step.period}
              style={{
                padding: '10px 12px',
                borderRadius: '12px',
                backgroundColor: step.done ? 'var(--bg-sage)' : 'var(--bg-surface)',
                border: '1px solid',
                borderColor: step.done ? 'var(--brand-leaf)' : 'var(--border-warm)',
                fontSize: '0.83rem'
              }}
            >
              <div style={{ fontWeight: 700, color: step.done ? 'var(--brand-leaf)' : 'var(--text-primary)', marginBottom: '2px' }}>
                {step.done ? '✓ ' : '• '}
                {step.period}
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>{step.instruction}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Fila principal: Anillo de calorías animado + Macros + Hidratación */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(295px, 1fr))',
          gap: '22px',
          marginBottom: '26px'
        }}
      >
        {/* Anillo de calorías */}
        <section className="ns-card ns-card-organic" style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
          <div style={{ position: 'relative', width: '160px', height: '160px', flexShrink: 0 }}>
            <svg width="160" height="160" viewBox="0 0 160 160">
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke="var(--bg-warm)"
                strokeWidth="13"
              />
              <motion.circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke="var(--brand-leaf)"
                strokeWidth="13"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                transform="rotate(-90 80 80)"
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
              <span style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                {consumed.kcal}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                de {goalKcal} kcal
              </span>
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: '1.22rem', marginBottom: '6px' }}>Energía de hoy</h2>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
              {consumed.kcal === 0
                ? 'Aún no has anotado comidas hoy. Usa el botón de tu Ruta Clínica arriba para registrar en 1 toque.'
                : `Te quedan cerca de ${remainingKcal} kcal para completar tu día con calma.`}
            </p>
            <Link to="/app/diario" style={{ fontWeight: 700, fontSize: '0.9rem' }}>
              Ver mi diario completo →
            </Link>
          </div>
        </section>

        {/* Macronutrientes */}
        <section className="ns-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.22rem', marginBottom: '12px' }}>Equilibrio de nutrientes</h2>
          {[
            { label: 'Proteínas (músculo y saciedad)', current: consumed.protein, goal: goalProtein, color: 'var(--brand-leaf)' },
            { label: 'Carbohidratos (energía diaria)', current: consumed.carbs, goal: goalCarbs, color: 'var(--accent-carrot)' },
            { label: 'Grasas buenas (hormonas y corazón)', current: consumed.fat, goal: goalFat, color: 'var(--accent-earth)' }
          ].map(macro => {
            const pct = Math.min(100, Math.round((macro.current / Math.max(1, macro.goal)) * 100));
            return (
              <div key={macro.label} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 600, marginBottom: '4px' }}>
                  <span>{macro.label}</span>
                  <span>{macro.current}g / {macro.goal}g</span>
                </div>
                <div style={{ height: '9px', borderRadius: '999px', backgroundColor: 'var(--bg-warm)', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      backgroundColor: macro.color,
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
              </div>
            );
          })}
        </section>

        {/* Vasos de agua interactivos */}
        <section className="ns-card ns-card-sage" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '1.22rem', margin: 0 }}>Agua de hoy</h2>
              <span style={{ fontWeight: 700, color: 'var(--brand-leaf)', fontSize: '0.92rem' }}>
                {waterGlassesToday} / {goalWaterGlasses} vasos ({waterGlassesToday * 250} ml)
              </span>
            </div>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: '0 0 14px 0' }}>
              Toca cada vaso de 250 ml a medida que vayas tomando agua en el día:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
              {Array.from({ length: goalWaterGlasses }).map((_, idx) => {
                const filled = idx < waterGlassesToday;
                const glassNumber = idx + 1;
                return (
                  <button
                    key={glassNumber}
                    type="button"
                    onClick={() =>
                      setWaterGlassesForDate(
                        today,
                        waterGlassesToday === glassNumber ? glassNumber - 1 : glassNumber
                      )
                    }
                    aria-label={`Vaso ${glassNumber} de ${goalWaterGlasses}`}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '12px',
                      border: '1.5px solid',
                      borderColor: filled ? 'var(--brand-leaf)' : 'var(--border-strong)',
                      backgroundColor: filled ? 'var(--brand-leaf)' : 'var(--bg-surface)',
                      color: filled ? '#FFFFFF' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    {glassNumber * 250} ml
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* Segunda fila: Protocolos Médicos Activos para tu Perfil + Plato Calculado para este momento */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '22px'
        }}
      >
        {/* Protocolos clínicos activos personalizados */}
        <article className="ns-card ns-card-warm" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '999px',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--accent-earth)',
                fontWeight: 700,
                fontSize: '0.78rem',
                marginBottom: '12px'
              }}
            >
              Base Médica y Clínica de tu Plan ({country.name})
            </span>
            <h2 style={{ fontSize: '1.35rem', marginBottom: '12px' }}>
              Protocolos clínicos activos en tu seguimiento
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {roadmap.protocols.map(proto => (
                <div key={proto.id} className="ns-card" style={{ padding: '14px' }}>
                  <div style={{ fontWeight: 700, color: 'var(--brand-leaf)', fontSize: '0.96rem' }}>
                    {proto.label}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Fuente: {proto.source}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {proto.keyRules}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/app/coach" className="ns-btn ns-btn-outline ns-btn-sm">
              Conversar con mi Coach →
            </Link>
            <Link to="/app/aprende" className="ns-btn ns-btn-ghost ns-btn-sm">
              Leer guías médicas en Aprende
            </Link>
          </div>
        </article>

        {/* Plato calculado por la IA para este momento del día (filtrado sin alergias ni disgustos) */}
        <article className="ns-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ position: 'relative', height: '190px' }}>
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
                  padding: '4px 12px',
                  borderRadius: '999px',
                  fontSize: '0.78rem',
                  fontWeight: 700
                }}
              >
                Plato IA para tu {suggestedDish.mealType} · {suggestedDish.kcal} kcal
              </span>
            </div>
            <div style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>{suggestedDish.dishName}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: '0 0 14px 0' }}>
                Seleccionado automáticamente entre los alimentos de {country.name} compatibles con tu dieta ({currentUser?.dietType || 'omnívora'}) y tu {ctx.cookingTimeLabel}.
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className="ns-chip">{suggestedDish.protein}g proteína</span>
                <span className="ns-chip">{suggestedDish.carbs}g carbos</span>
                <span className="ns-chip">{suggestedDish.fat}g grasas</span>
                <span className="ns-chip">{suggestedDish.fiber}g fibra</span>
              </div>
            </div>
          </div>

          <div style={{ padding: '0 20px 20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() =>
                addMealEntry({
                  date: today,
                  ...suggestedDish
                })
              }
              className="ns-btn ns-btn-leaf ns-btn-sm"
            >
              + Agregar a mi {suggestedDish.mealType.toLowerCase()} de hoy
            </button>
            <Link to="/app/planes" className="ns-btn ns-btn-ghost ns-btn-sm">
              Ver plan semanal
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
