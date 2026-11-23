import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNutriStore } from '../store/useNutriStore';
import {
  ONBOARDING_GOALS,
  ACTIVITY_LEVELS,
  buildPersonalizedNutritionSummary
} from '../lib/nutritionCalculator';
import { HandLeafIcon, HandUnderline } from '../assets/doodles/HandDrawnSvgs';

const TOTAL_STEPS = 13;

const COUNTRIES = [
  { id: 'CO', name: 'Colombia', defaultCity: 'Medellín' },
  { id: 'MX', name: 'México', defaultCity: 'Ciudad de México' },
  { id: 'PE', name: 'Perú', defaultCity: 'Lima' },
  { id: 'AR', name: 'Argentina', defaultCity: 'Buenos Aires' },
  { id: 'CL', name: 'Chile', defaultCity: 'Santiago' },
  { id: 'EC', name: 'Ecuador', defaultCity: 'Quito' },
  { id: 'ES', name: 'España', defaultCity: 'Madrid' },
  { id: 'US', name: 'Estados Unidos', defaultCity: 'Miami' }
];

const DIET_TYPES = [
  { id: 'omnivora', label: 'Omnívora (como de todo un poco)' },
  { id: 'vegetariana', label: 'Vegetariana (incluyo huevo y lácteos)' },
  { id: 'vegana', label: 'Vegana (100% origen vegetal)' },
  { id: 'sin_gluten', label: 'Sin gluten' },
  { id: 'sin_lactosa', label: 'Sin lactosa' },
  { id: 'otra', label: 'Otra / Flexible' }
];

const ALLERGY_OPTIONS = [
  'Ninguna',
  'Lactosa / Lácteos',
  'Gluten / Trigo',
  'Maní / Frutos secos',
  'Mariscos / Pescado',
  'Huevo',
  'Soya'
];

const HEALTH_CONDITIONS = [
  { id: 'ninguna', label: 'Ninguna en particular' },
  { id: 'diabetes', label: 'Azúcar alta / Resistencia a la insulina o Diabetes tipo 2 (ADA)' },
  { id: 'hipertension', label: 'Presión arterial alta / Hipertensión (DASH)' },
  { id: 'colesterol', label: 'Colesterol LDL, triglicéridos o hígado graso (AHA / EASL)' },
  { id: 'tiroides', label: 'Hipotiroidismo / Salud tiroidea (ATA)' },
  { id: 'sop', label: 'Síndrome de Ovario Poliquístico — SOP (ESHRE)' },
  { id: 'gastritis', label: 'Gastritis, reflujo o colon irritable' },
  { id: 'anemia', label: 'Anemia por falta de hierro o fatiga frecuente (OMS)' },
  { id: 'renal', label: 'Cuidado renal / Control de sodio y proteína (KDIGO)' },
  { id: 'embarazo_lactancia', label: 'Estoy en embarazo o lactancia' },
  { id: 'tca', label: 'Tengo o he tenido una relación difícil con la comida (TCA)' },
  { id: 'prefiero_no_decir', label: 'Prefiero no decir' }
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const onboardingDraft = useNutriStore(s => s.onboardingDraft);
  const updateOnboardingDraft = useNutriStore(s => s.updateOnboardingDraft);

  const [step, setStep] = useState(onboardingDraft.step || 1);
  const [phase, setPhase] = useState(onboardingDraft.completed ? 'summary' : 'questions'); // 'questions' | 'building' | 'summary'
  const [buildingMessageIdx, setBuildingMessageIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const BUILDING_MESSAGES = [
    `Revisando ingredientes frescos y precios en ${onboardingDraft.city || 'tu ciudad'}…`,
    'Calculando tu energía diaria, proteína y vasos de agua sin dietas extremas…',
    'Listo: armamos una propuesta pensada para tu mesa.'
  ];

  useEffect(() => {
    if (phase !== 'building') return undefined;
    const msgTimer1 = setTimeout(() => setBuildingMessageIdx(1), 850);
    const msgTimer2 = setTimeout(() => setBuildingMessageIdx(2), 1700);
    const doneTimer = setTimeout(() => {
      updateOnboardingDraft({ completed: true, step: TOTAL_STEPS });
      setPhase('summary');
    }, 2400);
    return () => {
      clearTimeout(msgTimer1);
      clearTimeout(msgTimer2);
      clearTimeout(doneTimer);
    };
  }, [phase, updateOnboardingDraft]);

  const validateCurrentStep = () => {
    setErrorMsg('');
    if (step === 3) {
      const a = Number(onboardingDraft.age);
      if (!a || a < 10 || a > 105) {
        setErrorMsg('Por favor escribe una edad válida (entre 10 y 105 años).');
        return false;
      }
    }
    if (step === 4) {
      if (onboardingDraft.heightUnit === 'cm') {
        const h = Number(onboardingDraft.heightCm);
        if (!h || h < 110 || h > 230) {
          setErrorMsg('Ingresa una estatura entre 110 cm y 230 cm.');
          return false;
        }
      } else {
        const ft = Number(onboardingDraft.heightFeet);
        if (!ft || ft < 3 || ft > 7) {
          setErrorMsg('Ingresa los pies entre 3 y 7.');
          return false;
        }
      }
    }
    if (step === 5) {
      const w = Number(onboardingDraft.weightVal);
      const tw = Number(onboardingDraft.targetWeightVal);
      const minW = onboardingDraft.weightUnit === 'lb' ? 65 : 30;
      const maxW = onboardingDraft.weightUnit === 'lb' ? 550 : 250;
      if (!w || w < minW || w > maxW || !tw || tw < minW || tw > maxW) {
        setErrorMsg(`Revisa que ambos pesos estén entre ${minW} y ${maxW} ${onboardingDraft.weightUnit}.`);
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    if (step < TOTAL_STEPS) {
      const next = step + 1;
      setStep(next);
      updateOnboardingDraft({ step: next });
    } else {
      setBuildingMessageIdx(0);
      setPhase('building');
    }
  };

  const handleBack = () => {
    setErrorMsg('');
    if (phase === 'summary') {
      setPhase('questions');
      setStep(TOTAL_STEPS);
      return;
    }
    if (step > 1) {
      const prev = step - 1;
      setStep(prev);
      updateOnboardingDraft({ step: prev });
    } else {
      navigate('/');
    }
  };

  const toggleMultiItem = (field, value, exclusiveValues = []) => {
    const current = Array.isArray(onboardingDraft[field]) ? onboardingDraft[field] : [];
    if (exclusiveValues.includes(value)) {
      updateOnboardingDraft({ [field]: [value] });
      return;
    }
    const withoutExclusives = current.filter(v => !exclusiveValues.includes(v));
    if (withoutExclusives.includes(value)) {
      const next = withoutExclusives.filter(v => v !== value);
      updateOnboardingDraft({ [field]: next.length ? next : exclusiveValues.slice(0, 1) });
    } else {
      updateOnboardingDraft({ [field]: [...withoutExclusives, value] });
    }
  };

  const summary = buildPersonalizedNutritionSummary(onboardingDraft);
  const progressPct = Math.round((step / TOTAL_STEPS) * 100);

  if (phase === 'building') {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--bg-canvas)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}
      >
        <div
          className="ns-card ns-card-organic"
          style={{
            maxWidth: '520px',
            width: '100%',
            textAlign: 'center',
            padding: '44px 32px'
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--brand-leaf-soft)',
              color: 'var(--brand-leaf)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px'
            }}
          >
            <HandLeafIcon size={32} color="var(--brand-leaf)" />
          </div>
          <h1 style={{ fontSize: '1.85rem', marginBottom: '12px' }}>Estamos armando tu plan…</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', minHeight: '52px' }}>
            {BUILDING_MESSAGES[buildingMessageIdx]}
          </p>
          <div
            style={{
              height: '10px',
              borderRadius: '999px',
              backgroundColor: 'var(--bg-warm)',
              overflow: 'hidden',
              marginTop: '18px'
            }}
          >
            <motion.div
              initial={{ width: '15%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 2.2, ease: 'easeInOut' }}
              style={{ height: '100%', backgroundColor: 'var(--brand-leaf)' }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'summary') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-canvas)', padding: '32px 20px 72px' }}>
        <div style={{ maxWidth: '880px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <button type="button" onClick={handleBack} className="ns-btn ns-btn-outline ns-btn-sm">
              ← Ajustar mis respuestas
            </button>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Paso final · Resumen de tu plan
            </span>
          </div>

          <div className="ns-card ns-card-organic" style={{ padding: '32px' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '5px 14px',
                borderRadius: '999px',
                backgroundColor: 'var(--brand-leaf-soft)',
                color: 'var(--brand-leaf)',
                fontWeight: 700,
                fontSize: '0.84rem',
                marginBottom: '14px'
              }}
            >
              Personalizado para {onboardingDraft.city || summary.countryName} ({summary.countryName})
            </span>

            <h1 style={{ fontSize: 'clamp(1.85rem, 3.2vw, 2.55rem)', marginBottom: '10px' }}>
              Así se ve tu punto de partida
              <HandUnderline color="#D95D24" style={{ maxWidth: '240px', marginTop: '4px' }} />
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.04rem', marginBottom: '26px' }}>
              Tradujimos tus datos a porciones cotidianas, sin juicios ni metas extremas.
            </p>

            {/* AVISO DE REGLA DE SEGURIDAD SI APLICA (<18, embarazo/lactancia, TCA o <1200 kcal) */}
            {summary.safetyAdvisoryActive && (
              <div
                role="alert"
                style={{
                  backgroundColor: 'var(--accent-carrot-soft)',
                  border: '1.5px solid var(--accent-carrot)',
                  borderRadius: '18px',
                  padding: '20px',
                  marginBottom: '26px'
                }}
              >
                <h2 style={{ fontSize: '1.22rem', marginBottom: '8px', color: 'var(--accent-carrot)' }}>
                  Cuidamos tu salud antes que cualquier meta de peso
                </h2>
                <ul style={{ margin: '0 0 10px 18px', padding: 0, color: 'var(--text-primary)' }}>
                  {summary.safetyReasons.map(r => (
                    <li key={r} style={{ marginBottom: '4px' }}>{r}</li>
                  ))}
                </ul>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                  {summary.safetyMessage}
                </p>
              </div>
            )}

            {/* Tarjetas de métricas explicadas en lenguaje simple */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                gap: '16px',
                marginBottom: '26px'
              }}
            >
              <div className="ns-card ns-card-sage" style={{ padding: '18px' }}>
                <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Energía diaria recomendada
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--brand-leaf)', margin: '4px 0' }}>
                  {summary.dailyCalories} kcal
                </div>
                <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                  Repartidas en {onboardingDraft.mealsPerDay} comidas que te dejan satisfecho.
                </div>
              </div>

              <div className="ns-card" style={{ padding: '18px' }}>
                <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Tus 3 macronutrientes
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, margin: '8px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span>Proteína: {summary.targetProtein} g/día</span>
                  <span>Carbohidratos: {summary.targetCarbs} g/día</span>
                  <span>Grasas buenas: {summary.targetFat} g/día</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Para cuidar tu músculo y mantener energía pareja.
                </div>
              </div>

              <div className="ns-card" style={{ padding: '18px' }}>
                <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Agua para tu día
                </div>
                <div style={{ fontSize: '1.9rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--brand-leaf)', margin: '4px 0' }}>
                  {summary.waterGlasses} vasos
                </div>
                <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                  Aprox. {(summary.waterGoalMl / 1000).toFixed(1)} litros (vasos de 250 ml).
                </div>
              </div>

              <div className="ns-card ns-card-warm" style={{ padding: '18px' }}>
                <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Contexto corporal (IMC {summary.bmi})
                </div>
                <div style={{ fontSize: '0.86rem', color: 'var(--text-primary)', marginTop: '8px', lineHeight: 1.45 }}>
                  {summary.bmiExplanation}
                </div>
              </div>
            </div>

            {/* Metas clínicas de micronutrientes y biomarcadores */}
            {summary.clinicalTargets && (
              <div
                className="ns-card ns-card-sage"
                style={{ marginBottom: '20px', padding: '18px 20px' }}
              >
                <h3 style={{ fontSize: '1.08rem', marginBottom: '8px', color: 'var(--brand-leaf)' }}>
                  Parámetros Clínicos de Precisión (OMS · ADA · AHA/DASH)
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '0.86rem' }}>
                  <span className="ns-chip">Fibra meta: ≥{summary.clinicalTargets.fiberGrams} g/día</span>
                  <span className="ns-chip">Sodio máx: &lt;{summary.clinicalTargets.sodiumMaxMg} mg/día</span>
                  <span className="ns-chip">Potasio meta: {summary.clinicalTargets.potassiumTargetMg} mg/día</span>
                  <span className="ns-chip">Densidad proteica: {summary.clinicalTargets.proteinPerKg} g/kg/día</span>
                  <span className="ns-chip">Omega-3 meta: ≥{summary.clinicalTargets.omega3TargetMg} mg/día</span>
                </div>
              </div>
            )}

            {/* Alimentos locales recomendados según su país */}
            <div
              className="ns-card ns-card-warm"
              style={{ marginBottom: '28px', padding: '20px' }}
            >
              <h3 style={{ fontSize: '1.15rem', marginBottom: '8px' }}>
                Alimentos aliados en {summary.countryName} para tu presupuesto
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {summary.countryFoods.map(f => (
                  <span key={f.name} className="ns-chip">
                    {f.name.split('(')[0].trim()}
                  </span>
                ))}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-warm)'
              }}
            >
              <button
                type="button"
                onClick={() => navigate('/registro')}
                className="ns-btn ns-btn-carrot ns-btn-lg"
                style={{ width: '100%', maxWidth: '420px' }}
              >
                Guarda tu plan y créalo gratis →
              </button>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                NutriStudio AI ofrece orientación informativa sobre alimentación y no reemplaza la consulta con un profesional de la salud.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-canvas)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))'
      }}
    >
      {/* Columna principal: 1 pregunta por pantalla */}
      <div
        style={{
          padding: '28px 22px 48px',
          maxWidth: '640px',
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}
      >
        {/* Encabezado con botón Atrás y barra de progreso */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}
          >
            <button
              type="button"
              onClick={handleBack}
              className="ns-btn ns-btn-outline ns-btn-sm"
            >
              ← Atrás
            </button>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Pregunta {step} de {TOTAL_STEPS}
            </span>
          </div>

          <div
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{
              height: '8px',
              backgroundColor: 'var(--bg-warm)',
              borderRadius: '999px',
              overflow: 'hidden',
              marginBottom: '32px'
            }}
          >
            <div
              style={{
                width: `${progressPct}%`,
                height: '100%',
                backgroundColor: 'var(--brand-leaf)',
                transition: 'width 0.25s ease'
              }}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.22 }}
            >
              {/* PASO 1: OBJETIVO */}
              {step === 1 && (
                <div>
                  <h1 style={{ fontSize: '1.9rem', marginBottom: '8px' }}>
                    ¿Cuál es tu objetivo principal hoy?
                  </h1>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '22px' }}>
                    Elige el que mejor conecte con tu momento actual. Puedes cambiarlo después.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {ONBOARDING_GOALS.map(g => {
                      const active = onboardingDraft.goal === g.id;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => updateOnboardingDraft({ goal: g.id })}
                          className="ns-card"
                          style={{
                            textAlign: 'left',
                            cursor: 'pointer',
                            borderColor: active ? 'var(--brand-leaf)' : 'var(--border-warm)',
                            backgroundColor: active ? 'var(--brand-leaf-soft)' : 'var(--bg-surface)',
                            padding: '16px 20px'
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                            {g.title}
                          </div>
                          <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {g.subtitle}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PASO 2: SEXO */}
              {step === 2 && (
                <div>
                  <h1 style={{ fontSize: '1.9rem', marginBottom: '8px' }}>
                    ¿Cuál es tu sexo biológico?
                  </h1>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '22px' }}>
                    Nos ayuda a estimar tu gasto de energía en reposo con mayor precisión.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      { id: 'femenino', label: 'Femenino' },
                      { id: 'masculino', label: 'Masculino' },
                      { id: 'no_especificado', label: 'Prefiero no decir' }
                    ].map(opt => {
                      const active = onboardingDraft.sex === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => updateOnboardingDraft({ sex: opt.id })}
                          className="ns-card"
                          style={{
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: '1.05rem',
                            borderColor: active ? 'var(--brand-leaf)' : 'var(--border-warm)',
                            backgroundColor: active ? 'var(--brand-leaf-soft)' : 'var(--bg-surface)'
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PASO 3: EDAD */}
              {step === 3 && (
                <div>
                  <h1 style={{ fontSize: '1.9rem', marginBottom: '8px' }}>
                    ¿Cuántos años tienes?
                  </h1>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '22px' }}>
                    Tus necesidades nutricionales cambian en cada etapa de la vida.
                  </p>
                  <label htmlFor="onb-age" style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
                    Edad (en años)
                  </label>
                  <input
                    id="onb-age"
                    type="number"
                    min="10"
                    max="105"
                    className="ns-input"
                    value={onboardingDraft.age}
                    onChange={e => updateOnboardingDraft({ age: e.target.value })}
                    style={{ fontSize: '1.35rem', fontWeight: 700, maxWidth: '200px' }}
                  />
                  {Number(onboardingDraft.age) > 0 && Number(onboardingDraft.age) < 18 && (
                    <p style={{ marginTop: '14px', fontSize: '0.9rem', color: 'var(--accent-carrot)', fontWeight: 600 }}>
                      Nota amable: Al ser menor de 18 años, configuraremos la guía en modo educativo sin recortes calóricos.
                    </p>
                  )}
                </div>
              )}

              {/* PASO 4: ESTATURA (cm o pies/pulgadas) */}
              {step === 4 && (
                <div>
                  <h1 style={{ fontSize: '1.9rem', marginBottom: '8px' }}>
                    ¿Cuál es tu estatura?
                  </h1>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '18px' }}>
                    Puedes escribirla en centímetros o en pies y pulgadas.
                  </p>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
                    <button
                      type="button"
                      onClick={() => updateOnboardingDraft({ heightUnit: 'cm' })}
                      className={`ns-chip ${onboardingDraft.heightUnit === 'cm' ? 'ns-chip-active' : ''}`}
                    >
                      Centímetros (cm)
                    </button>
                    <button
                      type="button"
                      onClick={() => updateOnboardingDraft({ heightUnit: 'ft' })}
                      className={`ns-chip ${onboardingDraft.heightUnit === 'ft' ? 'ns-chip-active' : ''}`}
                    >
                      Pies y pulgadas (ft / in)
                    </button>
                  </div>

                  {onboardingDraft.heightUnit === 'cm' ? (
                    <div>
                      <label htmlFor="onb-height-cm" style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
                        Estatura en cm
                      </label>
                      <input
                        id="onb-height-cm"
                        type="number"
                        min="110"
                        max="230"
                        className="ns-input"
                        value={onboardingDraft.heightCm}
                        onChange={e => updateOnboardingDraft({ heightCm: e.target.value })}
                        style={{ fontSize: '1.3rem', fontWeight: 700, maxWidth: '220px' }}
                      />
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '14px' }}>
                      <div>
                        <label htmlFor="onb-ft" style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                          Pies (ft)
                        </label>
                        <input
                          id="onb-ft"
                          type="number"
                          min="3"
                          max="7"
                          className="ns-input"
                          value={onboardingDraft.heightFeet}
                          onChange={e => updateOnboardingDraft({ heightFeet: e.target.value })}
                          style={{ width: '110px', fontSize: '1.2rem', fontWeight: 700 }}
                        />
                      </div>
                      <div>
                        <label htmlFor="onb-in" style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                          Pulgadas (in)
                        </label>
                        <input
                          id="onb-in"
                          type="number"
                          min="0"
                          max="11"
                          className="ns-input"
                          value={onboardingDraft.heightInches}
                          onChange={e => updateOnboardingDraft({ heightInches: e.target.value })}
                          style={{ width: '110px', fontSize: '1.2rem', fontWeight: 700 }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PASO 5: PESO ACTUAL Y PESO META (kg o lb) */}
              {step === 5 && (
                <div>
                  <h1 style={{ fontSize: '1.9rem', marginBottom: '8px' }}>
                    ¿Cuál es tu peso actual y el peso en el que te gustaría sentirte?
                  </h1>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '18px' }}>
                    Si buscas mantenerte o solo comer más sano, puedes poner el mismo número en ambos.
                  </p>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
                    <button
                      type="button"
                      onClick={() => updateOnboardingDraft({ weightUnit: 'kg' })}
                      className={`ns-chip ${onboardingDraft.weightUnit === 'kg' ? 'ns-chip-active' : ''}`}
                    >
                      Kilogramos (kg)
                    </button>
                    <button
                      type="button"
                      onClick={() => updateOnboardingDraft({ weightUnit: 'lb' })}
                      className={`ns-chip ${onboardingDraft.weightUnit === 'lb' ? 'ns-chip-active' : ''}`}
                    >
                      Libras (lb)
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label htmlFor="onb-weight" style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                        Peso actual ({onboardingDraft.weightUnit})
                      </label>
                      <input
                        id="onb-weight"
                        type="number"
                        step="0.5"
                        className="ns-input"
                        value={onboardingDraft.weightVal}
                        onChange={e => updateOnboardingDraft({ weightVal: e.target.value })}
                        style={{ fontSize: '1.25rem', fontWeight: 700 }}
                      />
                    </div>
                    <div>
                      <label htmlFor="onb-target-weight" style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                        Peso meta ({onboardingDraft.weightUnit})
                      </label>
                      <input
                        id="onb-target-weight"
                        type="number"
                        step="0.5"
                        className="ns-input"
                        value={onboardingDraft.targetWeightVal}
                        onChange={e => updateOnboardingDraft({ targetWeightVal: e.target.value })}
                        style={{ fontSize: '1.25rem', fontWeight: 700 }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* PASO 6: NIVEL DE ACTIVIDAD */}
              {step === 6 && (
                <div>
                  <h1 style={{ fontSize: '1.9rem', marginBottom: '8px' }}>
                    ¿Cómo es tu movimiento en una semana normal?
                  </h1>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    Piensa en tu rutina real, no en la semana perfecta.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {ACTIVITY_LEVELS.map(act => {
                      const active = onboardingDraft.activityLevel === act.id;
                      return (
                        <button
                          key={act.id}
                          type="button"
                          onClick={() => updateOnboardingDraft({ activityLevel: act.id })}
                          className="ns-card"
                          style={{
                            textAlign: 'left',
                            cursor: 'pointer',
                            borderColor: active ? 'var(--brand-leaf)' : 'var(--border-warm)',
                            backgroundColor: active ? 'var(--brand-leaf-soft)' : 'var(--bg-surface)',
                            padding: '16px 20px'
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{act.title}</div>
                          <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                            {act.example}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PASO 7: PAÍS Y CIUDAD */}
              {step === 7 && (
                <div>
                  <h1 style={{ fontSize: '1.9rem', marginBottom: '8px' }}>
                    ¿En qué país y ciudad vives?
                  </h1>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    Con esto priorizamos alimentos de cosecha local, nombres de platos de tu región y moneda para el mercado.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '18px' }}>
                    {COUNTRIES.map(c => {
                      const active = onboardingDraft.country === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => updateOnboardingDraft({ country: c.id, city: c.defaultCity })}
                          className="ns-card"
                          style={{
                            padding: '12px 14px',
                            cursor: 'pointer',
                            fontWeight: 700,
                            borderColor: active ? 'var(--brand-leaf)' : 'var(--border-warm)',
                            backgroundColor: active ? 'var(--brand-leaf-soft)' : 'var(--bg-surface)'
                          }}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                  <label htmlFor="onb-city" style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                    Ciudad o región
                  </label>
                  <input
                    id="onb-city"
                    type="text"
                    className="ns-input"
                    value={onboardingDraft.city}
                    onChange={e => updateOnboardingDraft({ city: e.target.value })}
                    placeholder="Ej. Medellín, Bogotá, Cali, CDMX, Lima..."
                  />
                </div>
              )}

              {/* PASO 8: TIPO DE ALIMENTACIÓN */}
              {step === 8 && (
                <div>
                  <h1 style={{ fontSize: '1.9rem', marginBottom: '8px' }}>
                    ¿Qué estilo de alimentación prefieres llevar?
                  </h1>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    Adaptaremos todas las recetas y sugerencias a tu elección.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {DIET_TYPES.map(d => {
                      const active = onboardingDraft.dietType === d.id;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => updateOnboardingDraft({ dietType: d.id })}
                          className="ns-card"
                          style={{
                            textAlign: 'left',
                            cursor: 'pointer',
                            padding: '14px 18px',
                            fontWeight: 600,
                            borderColor: active ? 'var(--brand-leaf)' : 'var(--border-warm)',
                            backgroundColor: active ? 'var(--brand-leaf-soft)' : 'var(--bg-surface)'
                          }}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PASO 9: ALERGIAS E INTOLERANCIAS */}
              {step === 9 && (
                <div>
                  <h1 style={{ fontSize: '1.9rem', marginBottom: '8px' }}>
                    ¿Tienes alguna alergia o intolerancia alimentaria?
                  </h1>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '18px' }}>
                    Puedes marcar varias opciones o anotar alguna específica abajo.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
                    {ALLERGY_OPTIONS.map(al => {
                      const active = (onboardingDraft.allergies || []).includes(al);
                      return (
                        <button
                          key={al}
                          type="button"
                          onClick={() => toggleMultiItem('allergies', al, ['Ninguna'])}
                          className={`ns-chip ${active ? 'ns-chip-active' : ''}`}
                          style={{ padding: '10px 16px', fontSize: '0.95rem' }}
                        >
                          {al}
                        </button>
                      );
                    })}
                  </div>
                  <label htmlFor="onb-custom-allergy" style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                    Otra alergia o ingrediente que te caiga pesado (opcional)
                  </label>
                  <input
                    id="onb-custom-allergy"
                    type="text"
                    className="ns-input"
                    value={onboardingDraft.customAllergy}
                    onChange={e => updateOnboardingDraft({ customAllergy: e.target.value })}
                    placeholder="Ej. Fresas, pimentón, camarones..."
                  />
                </div>
              )}

              {/* PASO 10: CONDICIONES DE SALUD */}
              {step === 10 && (
                <div>
                  <h1 style={{ fontSize: '1.9rem', marginBottom: '8px' }}>
                    ¿Hay alguna condición de salud que quieras tener en cuenta?
                  </h1>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '18px' }}>
                    Es opcional y nos sirve para cuidar tu seguridad y priorizar alimentos adecuados.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {HEALTH_CONDITIONS.map(cond => {
                      const active = (onboardingDraft.healthConditions || []).includes(cond.id);
                      return (
                        <button
                          key={cond.id}
                          type="button"
                          onClick={() =>
                            toggleMultiItem('healthConditions', cond.id, ['ninguna', 'prefiero_no_decir'])
                          }
                          className="ns-card"
                          style={{
                            textAlign: 'left',
                            cursor: 'pointer',
                            padding: '13px 18px',
                            fontWeight: 600,
                            borderColor: active ? 'var(--brand-leaf)' : 'var(--border-warm)',
                            backgroundColor: active ? 'var(--brand-leaf-soft)' : 'var(--bg-surface)'
                          }}
                        >
                          {cond.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PASO 11: COMIDAS AL DÍA Y HORARIOS APROXIMADOS */}
              {step === 11 && (
                <div>
                  <h1 style={{ fontSize: '1.9rem', marginBottom: '8px' }}>
                    ¿Cuántas veces al día prefieres comer?
                  </h1>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '18px' }}>
                    Nos adaptamos a tus horarios habituales de trabajo o estudio.
                  </p>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    {[
                      { count: 3, label: '3 comidas (Desayuno, Almuerzo, Cena)' },
                      { count: 4, label: '4 comidas (+ Algo / Merienda en la tarde)' },
                      { count: 5, label: '5 comidas (+ Media mañana y merienda)' }
                    ].map(opt => {
                      const active = Number(onboardingDraft.mealsPerDay) === opt.count;
                      return (
                        <button
                          key={opt.count}
                          type="button"
                          onClick={() => updateOnboardingDraft({ mealsPerDay: opt.count })}
                          className="ns-card"
                          style={{
                            flex: '1 1 180px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            padding: '14px 18px',
                            fontWeight: 600,
                            borderColor: active ? 'var(--brand-leaf)' : 'var(--border-warm)',
                            backgroundColor: active ? 'var(--brand-leaf-soft)' : 'var(--bg-surface)'
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  <label htmlFor="onb-schedule" style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                    Horarios aproximados en los que sueles comer
                  </label>
                  <input
                    id="onb-schedule"
                    type="text"
                    className="ns-input"
                    value={onboardingDraft.mealSchedule}
                    onChange={e => updateOnboardingDraft({ mealSchedule: e.target.value })}
                    placeholder="Ej. 7:30 am · 1:00 pm · 4:30 pm · 8:00 pm"
                  />
                </div>
              )}

              {/* PASO 12: PRESUPUESTO SEMANAL Y TIEMPO PARA COCINAR */}
              {step === 12 && (
                <div>
                  <h1 style={{ fontSize: '1.9rem', marginBottom: '8px' }}>
                    ¿Cómo manejas tu presupuesto de mercado y tu tiempo en la cocina?
                  </h1>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '18px' }}>
                    Así no te sugerimos recetas de una hora cuando solo tienes 20 minutos.
                  </p>
                  <div style={{ fontWeight: 700, marginBottom: '8px' }}>Presupuesto semanal para comida</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                    {[
                      { id: 'economico', title: 'Bajo / Ahorrador', desc: 'Priorizar huevo, legumbres, arroz, plátano y frutas de cosecha.' },
                      { id: 'equilibrado', title: 'Medio / Canasta familiar', desc: 'Pollo, pescado local, aguacate, lácteos, granos y verduras variadas.' },
                      { id: 'amplio', title: 'Alto / Amplio', desc: 'Incluye salmón, frutos secos, quesos maduros y cortes especiales.' }
                    ].map(b => {
                      const active = onboardingDraft.budgetTier === b.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => updateOnboardingDraft({ budgetTier: b.id })}
                          className="ns-card"
                          style={{
                            textAlign: 'left',
                            cursor: 'pointer',
                            padding: '13px 18px',
                            borderColor: active ? 'var(--brand-leaf)' : 'var(--border-warm)',
                            backgroundColor: active ? 'var(--brand-leaf-soft)' : 'var(--bg-surface)'
                          }}
                        >
                          <div style={{ fontWeight: 700 }}>{b.title}</div>
                          <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>{b.desc}</div>
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ fontWeight: 700, marginBottom: '8px' }}>Tiempo disponible para cocinar</div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {[
                      { id: '15_min', label: 'Rápido (15 min o menos)' },
                      { id: '30_min', label: 'Normal (20 a 35 min)' },
                      { id: '45_mas', label: 'Me gusta cocinar con calma (45+ min)' }
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => updateOnboardingDraft({ cookingTime: t.id })}
                        className={`ns-chip ${onboardingDraft.cookingTime === t.id ? 'ns-chip-active' : ''}`}
                        style={{ padding: '10px 16px' }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* PASO 13: ALIMENTOS QUE NO TE GUSTAN */}
              {step === 13 && (
                <div>
                  <h1 style={{ fontSize: '1.9rem', marginBottom: '8px' }}>
                    Por último: ¿hay alimentos que NO te gusten para nada?
                  </h1>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '18px' }}>
                    La mejor alimentación es la que disfrutas. Si no soportas el brócoli, el atún o la papaya, anótalos aquí y no te los pondremos.
                  </p>
                  <label htmlFor="onb-disliked" style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
                    Alimentos que prefieres evitar (opcional)
                  </label>
                  <textarea
                    id="onb-disliked"
                    rows={3}
                    className="ns-input"
                    value={onboardingDraft.dislikedFoods}
                    onChange={e => updateOnboardingDraft({ dislikedFoods: e.target.value })}
                    placeholder="Ej. Hígado, coliflor, cilantro, sardinas..."
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {errorMsg && (
            <div
              role="alert"
              style={{
                marginTop: '16px',
                padding: '12px 16px',
                borderRadius: '12px',
                backgroundColor: 'var(--accent-carrot-soft)',
                border: '1px solid var(--accent-carrot)',
                color: 'var(--accent-carrot)',
                fontWeight: 600,
                fontSize: '0.92rem'
              }}
            >
              {errorMsg}
            </div>
          )}
        </div>

        {/* Botón de avanzar + opción de ir directo al resumen desde el paso 7 */}
        <div style={{ marginTop: '32px', paddingTop: '18px', borderTop: '1px solid var(--border-warm)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            onClick={handleNext}
            className="ns-btn ns-btn-leaf ns-btn-lg"
            style={{ width: '100%' }}
          >
            {step === TOTAL_STEPS ? 'Armar mi plan personalizado →' : 'Continuar →'}
          </button>
          {step >= 7 && step < TOTAL_STEPS && (
            <button
              type="button"
              onClick={() => {
                setBuildingMessageIdx(0);
                setPhase('building');
              }}
              className="ns-btn ns-btn-ghost ns-btn-sm"
              style={{ alignSelf: 'center' }}
            >
              Completar el resto después y ver mi resumen ahora →
            </button>
          )}
        </div>
      </div>

      {/* Columna lateral visual con fotografía de comida real (se oculta o apila en móvil) */}
      <aside
        style={{
          backgroundColor: 'var(--bg-warm)',
          borderLeft: '1px solid var(--border-warm)',
          padding: '36px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <div style={{ maxWidth: '420px', width: '100%' }}>
          <figure
            style={{
              margin: '0 0 20px 0',
              borderRadius: '28px 14px 26px 16px',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-hover)',
              border: '4px solid var(--bg-surface)'
            }}
          >
            <img
              src="/img/onboarding-comida.webp"
              alt="Mesa con ensalada fresca, aguacate, semillas y pan artesanal"
              style={{ width: '100%', height: '300px', objectFit: 'cover', display: 'block' }}
            />
          </figure>
          <blockquote
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: '1.22rem',
              color: 'var(--text-primary)'
            }}
          >
            “Comer bien no se trata de contar cada almendra, sino de entender qué le sienta bien a tu cuerpo y a tu mesa.”
          </blockquote>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '10px' }}>
            Tus respuestas se guardan temporalmente en tu navegador para armar tu resumen sin compromiso.
          </p>
        </div>
      </aside>
    </div>
  );
}
