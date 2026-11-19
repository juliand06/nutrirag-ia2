import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GOAL_OPTIONS, calculateRecommendedTargets } from '../services/userStorage';
import {
  COUNTRY_OPTIONS,
  BUDGET_OPTIONS,
  METABOLISM_OPTIONS,
  SEX_OPTIONS
} from '../services/countryNutritionData';
import { MEDICAL_CONDITIONS } from '../services/clinicalKnowledgeBase';
import { useNutriStore } from '../store/useNutriStore';
import { formatWeight, formatHeight } from '../i18n';
import HealthDisclaimer from './HealthDisclaimer';

const STEP_META = {
  1: { icon: '👋', title: '¡Hola! ¿Cómo te llamas y desde dónde nos acompañas?' },
  2: { icon: '🎯', title: '¿Cuál es tu objetivo principal hoy?' },
  3: { icon: '🧬', title: 'Cuéntanos sobre tu perfil biológico' },
  4: { icon: '📏', title: 'Tus medidas corporales actuales' },
  5: { icon: '⚡', title: 'Tu ritmo diario, metabolismo y presupuesto' },
  6: { icon: '🎉', title: '¡Tu plan personalizado está listo!' }
};

export default function AuthOnboarding({
  authMode,
  setAuthMode,
  authError,
  setAuthError,
  onBackToLanding,
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  onLoginSubmit,
  regStep,
  setRegStep,
  regName,
  setRegName,
  regEmail,
  setRegEmail,
  regPassword,
  setRegPassword,
  regCountry,
  setRegCountry,
  regBudget,
  setRegBudget,
  regSex,
  setRegSex,
  regAge,
  setRegAge,
  regWeight,
  setRegWeight,
  regHeight,
  setRegHeight,
  regActivity,
  setRegActivity,
  regMetabolism,
  setRegMetabolism,
  regGoal,
  setRegGoal,
  regConditions,
  setRegConditions,
  onRegisterSubmit,
  existingUsers,
  onQuickLogin
}) {
  const unitSystem = useNutriStore(s => s.unitSystem);
  const regPreview = calculateRecommendedTargets({
    weightKg: regWeight,
    heightCm: regHeight,
    age: regAge,
    sex: regSex,
    metabolismType: regMetabolism,
    activityLevel: regActivity,
    goal: regGoal
  });

  const safeStep = Math.max(1, Math.min(6, Number(regStep) || 1));
  const regPct = Math.round((safeStep / 6) * 100);
  const currentMeta = STEP_META[safeStep];

  return (
    <div className="auth-split-wrapper">
      <section
        className="auth-hero-panel"
        style={{ backgroundImage: "url('/hero-nutrition.webp')" }}
        aria-label="Bienvenida NutriStudio AI"
      >
        <div className="auth-hero-overlay" />
        <div className="auth-hero-content">
          <div className="auth-brand" style={{ marginBottom: 0 }}>
            <img
              src="/nutristudio-logo.svg"
              alt="Logo NutriStudio AI"
              style={{ width: '34px', height: '34px', borderRadius: '9px' }}
            />
            <span className="auth-brand-name" style={{ color: '#ffffff', fontSize: '1.15rem' }}>
              NutriStudio AI
            </span>
          </div>

          <div>
            <span
              className="tag-pill"
              style={{
                background: 'rgba(255,255,255,0.16)',
                color: '#ffffff',
                borderColor: 'rgba(255,255,255,0.3)',
                marginBottom: '14px'
              }}
            >
              Onboarding Conversacional · 6 Pasos Rápidos
            </span>
            <h1 className="auth-hero-title">
              Tu nutrición inteligente, diseñada para tu cuerpo y tu país.
            </h1>
            <p className="auth-hero-subtitle">
              En menos de 60 segundos calibramos tus calorías, macronutrientes, hidratación y alimentos locales favoritos.
            </p>

            <div className="auth-hero-pills">
              <div className="auth-hero-feature">
                <span aria-hidden="true">🎯</span>
                <span>Anillo calórico animado, macros y pronóstico corporal a 30 días.</span>
              </div>
              <div className="auth-hero-feature">
                <span aria-hidden="true">🩺</span>
                <span>Seguimiento preventivo con protocolos OMS · ADA · DASH · ESPEN.</span>
              </div>
              <div className="auth-hero-feature">
                <span aria-hidden="true">🥗</span>
                <span>Escáner de códigos de barras, menús locales y lista de mercado.</span>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.76rem', opacity: 0.85 }}>
            NutriStudio AI · Orientación informativa; no reemplaza a un profesional.
          </div>
        </div>
      </section>

      <main className="auth-form-panel">
        <div className="auth-card-wide">
          <button
            type="button"
            className="btn-ghost"
            style={{ padding: '4px 0', marginBottom: '10px', fontSize: '0.78rem' }}
            onClick={onBackToLanding}
          >
            ← Volver a la portada
          </button>
          <h2 className="auth-title">
            {authMode === 'login' ? 'Bienvenido de nuevo' : 'Construyamos tu plan nutricional'}
          </h2>
          <p className="auth-subtitle">
            {authMode === 'login'
              ? 'Inicia sesión para continuar tu seguimiento y tu acompañamiento diario.'
              : 'Responde paso a paso para adaptar cada comida y meta a tu metabolismo.'}
          </p>

          <div className="auth-switcher">
            <button
              type="button"
              className={`auth-switch-btn ${authMode === 'login' ? 'active' : ''}`}
              onClick={() => {
                setAuthMode('login');
                setAuthError('');
              }}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              className={`auth-switch-btn ${authMode === 'register' ? 'active' : ''}`}
              onClick={() => {
                setAuthMode('register');
                setRegStep(1);
                setAuthError('');
              }}
            >
              Crear cuenta (6 pasos)
            </button>
          </div>

          {authError && (
            <div className="error-banner" role="alert">
              {authError}
            </div>
          )}

          {authMode === 'login' ? (
            <form onSubmit={onLoginSubmit} className="form-stack">
              <div className="field-group">
                <label className="field-label" htmlFor="login-email">
                  Correo electrónico
                </label>
                <input
                  id="login-email"
                  type="email"
                  className="input-clean"
                  placeholder="nombre@gmail.com"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  required
                />
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="login-password">
                  Contraseña
                </label>
                <input
                  id="login-password"
                  type="password"
                  className="input-clean"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn-solid" style={{ marginTop: '6px' }}>
                Entrar a mi espacio nutricional
              </button>
            </form>
          ) : (
            <form onSubmit={onRegisterSubmit} className="form-stack">
              <div className="onboarding-progress-wrap">
                <div className="onboarding-progress-head">
                  <span>
                    {currentMeta.icon} Paso {safeStep} de 6
                  </span>
                  <span>{regPct}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${regPct}%` }} />
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', marginTop: '8px', color: 'var(--text-primary)' }}>
                  {currentMeta.title}
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={safeStep}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                  className="form-stack"
                >
                  {safeStep === 1 && (
                    <>
                      <div className="field-group">
                        <label className="field-label">¿Cómo te llamas?</label>
                        <input
                          type="text"
                          className="input-clean"
                          placeholder="Ej. Camilo Restrepo"
                          value={regName}
                          onChange={e => setRegName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="field-group">
                        <label className="field-label">País (para sugerirte alimentos reales y económicos)</label>
                        <select
                          className="input-clean"
                          value={regCountry}
                          onChange={e => setRegCountry(e.target.value)}
                        >
                          {COUNTRY_OPTIONS.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        className="btn-solid"
                        onClick={() => {
                          setAuthError('');
                          if (regName.trim().length < 2) {
                            setAuthError('Cuéntanos tu nombre para personalizar tu bienvenida.');
                            return;
                          }
                          setRegStep(2);
                        }}
                      >
                        Continuar →
                      </button>
                    </>
                  )}

                  {safeStep === 2 && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                        {GOAL_OPTIONS.map(g => {
                          const selected = regGoal === g.id;
                          return (
                            <button
                              key={g.id}
                              type="button"
                              className="list-item-card"
                              style={{
                                width: '100%',
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                borderColor: selected ? 'var(--accent)' : 'var(--border)',
                                background: selected ? 'var(--accent-soft)' : 'var(--bg-surface)'
                              }}
                              onClick={() => setRegGoal(g.id)}
                            >
                              <strong style={{ fontSize: '0.84rem', color: selected ? 'var(--accent)' : 'var(--text-primary)' }}>
                                {selected ? '✓ ' : ''}
                                {g.label}
                              </strong>
                            </button>
                          );
                        })}
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                        <button type="button" className="btn-outline" onClick={() => setRegStep(1)}>
                          ← Volver
                        </button>
                        <button type="button" className="btn-solid" style={{ flex: 1 }} onClick={() => setRegStep(3)}>
                          Continuar →
                        </button>
                      </div>
                    </>
                  )}

                  {safeStep === 3 && (
                    <>
                      <div className="field-group">
                        <label className="field-label">Sexo biológico (para fórmula clínica TMB)</label>
                        <select className="input-clean" value={regSex} onChange={e => setRegSex(e.target.value)}>
                          {SEX_OPTIONS.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field-group">
                        <label className="field-label">Edad (años)</label>
                        <input
                          type="number"
                          min="12"
                          max="110"
                          className="input-clean"
                          placeholder="Ej. 25"
                          value={regAge}
                          onChange={e => setRegAge(e.target.value)}
                          required
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                        <button type="button" className="btn-outline" onClick={() => setRegStep(2)}>
                          ← Volver
                        </button>
                        <button
                          type="button"
                          className="btn-solid"
                          style={{ flex: 1 }}
                          onClick={() => {
                            setAuthError('');
                            if (Number(regAge) < 12) {
                              setAuthError('Ingresa tu edad en años para calcular tu requerimiento energético.');
                              return;
                            }
                            setRegStep(4);
                          }}
                        >
                          Continuar →
                        </button>
                      </div>
                    </>
                  )}

                  {safeStep === 4 && (
                    <>
                      <div className="field-row">
                        <div className="field-group">
                          <label className="field-label">Peso actual (kg)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="30"
                            max="260"
                            className="input-clean"
                            placeholder="Ej. 68"
                            value={regWeight}
                            onChange={e => setRegWeight(e.target.value)}
                            required
                          />
                          {Number(regWeight) > 0 && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Equivale a {formatWeight(regWeight, unitSystem === 'metric' ? 'imperial' : 'metric')}
                            </span>
                          )}
                        </div>
                        <div className="field-group">
                          <label className="field-label">Estatura (cm)</label>
                          <input
                            type="number"
                            min="110"
                            max="230"
                            className="input-clean"
                            placeholder="Ej. 170"
                            value={regHeight}
                            onChange={e => setRegHeight(e.target.value)}
                            required
                          />
                          {Number(regHeight) > 0 && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Equivale a {formatHeight(regHeight, unitSystem === 'metric' ? 'imperial' : 'metric')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                        <button type="button" className="btn-outline" onClick={() => setRegStep(3)}>
                          ← Volver
                        </button>
                        <button
                          type="button"
                          className="btn-solid"
                          style={{ flex: 1 }}
                          onClick={() => {
                            setAuthError('');
                            if (Number(regWeight) <= 0 || Number(regHeight) <= 0) {
                              setAuthError('Ingresa tu peso y estatura para calibrar tu plan.');
                              return;
                            }
                            setRegStep(5);
                          }}
                        >
                          Continuar →
                        </button>
                      </div>
                    </>
                  )}

                  {safeStep === 5 && (
                    <>
                      <div className="field-row">
                        <div className="field-group">
                          <label className="field-label">Actividad física</label>
                          <select className="input-clean" value={regActivity} onChange={e => setRegActivity(e.target.value)}>
                            <option value="sedentario">Sedentario</option>
                            <option value="ligero">Ligero (1-3 días/sem)</option>
                            <option value="moderado">Moderado (3-5 días/sem)</option>
                            <option value="intenso">Intenso (6-7 días/sem)</option>
                          </select>
                        </div>
                        <div className="field-group">
                          <label className="field-label">Metabolismo</label>
                          <select className="input-clean" value={regMetabolism} onChange={e => setRegMetabolism(e.target.value)}>
                            {METABOLISM_OPTIONS.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.label.split('(')[0].trim()}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="field-group">
                        <label className="field-label">Presupuesto alimenticio</label>
                        <select className="input-clean" value={regBudget} onChange={e => setRegBudget(e.target.value)}>
                          {BUDGET_OPTIONS.map(b => (
                            <option key={b.id} value={b.id}>
                              {b.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                        <button type="button" className="btn-outline" onClick={() => setRegStep(4)}>
                          ← Volver
                        </button>
                        <button type="button" className="btn-solid" style={{ flex: 1 }} onClick={() => setRegStep(6)}>
                          Ver mi plan listo →
                        </button>
                      </div>
                    </>
                  )}

                  {safeStep === 6 && (
                    <>
                      {regPreview && (
                        <motion.div
                          initial={{ scale: 0.96, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.3 }}
                          className="onboarding-preview-box"
                        >
                          <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: '4px' }}>
                            🎉 ¡Tu plan está listo, {regName.split(' ')[0]}!
                          </div>
                          <div>
                            Meta diaria: <strong>{regPreview.dailyCalories} kcal</strong> · Proteína:{' '}
                            <strong>{regPreview.targetProtein}g</strong> · Carbs:{' '}
                            <strong>{regPreview.targetCarbs}g</strong> · Grasas:{' '}
                            <strong>{regPreview.targetFat}g</strong> · Agua:{' '}
                            <strong>{regPreview.waterGoalMl} ml</strong>
                          </div>
                          <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                            TMB: {regPreview.bmr} kcal · Gasto Diario (GET): {regPreview.tdee} kcal
                          </div>
                        </motion.div>
                      )}

                      <div className="field-group">
                        <label className="field-label">Enfoque preventivo (opcional)</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                          {MEDICAL_CONDITIONS.slice(0, 6).map(cond => {
                            const active = regConditions.includes(cond.id);
                            return (
                              <button
                                key={cond.id}
                                type="button"
                                className={`copilot-chip ${active ? 'ds-chip-active' : ''}`}
                                onClick={() =>
                                  setRegConditions(prev =>
                                    prev.includes(cond.id)
                                      ? prev.filter(id => id !== cond.id)
                                      : [...prev, cond.id]
                                  )
                                }
                              >
                                {active ? '✓ ' : '+ '}
                                {cond.label.split('/')[0].trim()}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="field-row">
                        <div className="field-group">
                          <label className="field-label">Correo electrónico</label>
                          <input
                            type="email"
                            className="input-clean"
                            placeholder="tu@gmail.com"
                            value={regEmail}
                            onChange={e => setRegEmail(e.target.value)}
                            required
                          />
                        </div>
                        <div className="field-group">
                          <label className="field-label">Contraseña</label>
                          <input
                            type="password"
                            className="input-clean"
                            placeholder="Mín. 4 caracteres"
                            value={regPassword}
                            onChange={e => setRegPassword(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <HealthDisclaimer compact />

                      <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                        <button type="button" className="btn-outline" onClick={() => setRegStep(5)}>
                          ← Volver
                        </button>
                        <button type="submit" className="ds-btn-warm" style={{ flex: 1 }}>
                          Crear cuenta y comenzar ahora
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </form>
          )}

          {existingUsers.length > 0 && (
            <div className="quick-accounts">
              <div className="quick-accounts-label">
                Cuentas guardadas en este navegador (acceso rápido):
              </div>
              <div className="quick-account-list">
                {existingUsers.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    className="quick-account-item"
                    style={{ width: '100%', textAlign: 'left', fontFamily: 'inherit' }}
                    onClick={() => onQuickLogin(u.id)}
                  >
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>{u.name}</strong>
                      <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>({u.email})</span>
                    </div>
                    <span className="tag-pill">
                      {u.dailyCalories > 0 ? `${u.dailyCalories} kcal` : 'En 0 (Nueva)'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
