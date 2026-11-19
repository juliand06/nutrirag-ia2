import React from 'react';
import { GOAL_OPTIONS, calculateRecommendedTargets } from '../services/userStorage';
import {
  COUNTRY_OPTIONS,
  BUDGET_OPTIONS,
  METABOLISM_OPTIONS,
  SEX_OPTIONS
} from '../services/countryNutritionData';
import { MEDICAL_CONDITIONS } from '../services/clinicalKnowledgeBase';
import HealthDisclaimer from './HealthDisclaimer';

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
  const regPreview = calculateRecommendedTargets({
    weightKg: regWeight,
    heightCm: regHeight,
    age: regAge,
    sex: regSex,
    metabolismType: regMetabolism,
    activityLevel: regActivity,
    goal: regGoal
  });
  const regPct = regStep === 1 ? 33 : regStep === 2 ? 66 : 100;

  return (
    <div className="auth-split-wrapper">
      <section
        className="auth-hero-panel"
        style={{ backgroundImage: "url('/hero-nutrition.jpg')" }}
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
              Nutrición Personalizada y Bienestar Diario
            </span>
            <h1 className="auth-hero-title">
              Tu nutrición inteligente, diseñada para tu cuerpo y tu país.
            </h1>
            <p className="auth-hero-subtitle">
              Combina seguimiento visual de calorías, micronutrientes y calidad nutricional con un asistente que conoce tu metabolismo, tus metas y los alimentos accesibles de tu país.
            </p>

            <div className="auth-hero-pills">
              <div className="auth-hero-feature">
                <span aria-hidden="true">🎯</span>
                <span>Anillo calórico, macros, hidratación visual y pronóstico corporal a 30 días.</span>
              </div>
              <div className="auth-hero-feature">
                <span aria-hidden="true">🩺</span>
                <span>Seguimiento de exámenes médicos y protocolos preventivos de salud.</span>
              </div>
              <div className="auth-hero-feature">
                <span aria-hidden="true">🥗</span>
                <span>Base de 40+ alimentos con Nutri-Score A–E, Menú Automático y Lista de Mercado.</span>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.76rem', opacity: 0.85 }}>
            NutriStudio AI · Tu bienestar nutricional, claro, cercano y personalizado cada día.
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
            {authMode === 'login' ? 'Bienvenido de nuevo' : 'Personalicemos tu plan nutricional'}
          </h2>
          <p className="auth-subtitle">
            {authMode === 'login'
              ? 'Inicia sesión para continuar tu seguimiento y tu acompañamiento nutricional.'
              : 'Cuéntanos sobre tu cuerpo, edad, país y objetivo para guiarte desde el primer día.'}
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
              Crear cuenta (3 pasos)
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
                    Paso {regStep} de 3 ·{' '}
                    {regStep === 1
                      ? 'Tu cuenta y país'
                      : regStep === 2
                        ? 'Tu cuerpo, edad y metabolismo'
                        : 'Objetivo y enfoque de salud'}
                  </span>
                  <span>{regPct}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${regPct}%` }} />
                </div>
              </div>

              {regStep === 1 && (
                <>
                  <div className="field-group">
                    <label className="field-label">Nombre completo</label>
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
                    <label className="field-label">Correo electrónico</label>
                    <input
                      type="email"
                      className="input-clean"
                      placeholder="camilo@gmail.com"
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
                      placeholder="Mínimo 4 caracteres"
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field-row">
                    <div className="field-group">
                      <label className="field-label">País (alimentos locales)</label>
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
                    <div className="field-group">
                      <label className="field-label">Presupuesto alimenticio</label>
                      <select
                        className="input-clean"
                        value={regBudget}
                        onChange={e => setRegBudget(e.target.value)}
                      >
                        {BUDGET_OPTIONS.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.id.charAt(0).toUpperCase() + b.id.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-solid"
                    style={{ marginTop: '6px' }}
                    onClick={() => {
                      setAuthError('');
                      if (regName.trim().length < 2 || !regEmail.includes('@') || regPassword.length < 4) {
                        setAuthError(
                          'Completa tu nombre, correo válido y contraseña (mínimo 4 caracteres) para continuar.'
                        );
                        return;
                      }
                      setRegStep(2);
                    }}
                  >
                    Siguiente: Datos de mi cuerpo →
                  </button>
                </>
              )}

              {regStep === 2 && (
                <>
                  <div className="field-row">
                    <div className="field-group">
                      <label className="field-label">Sexo biológico (TMB)</label>
                      <select
                        className="input-clean"
                        value={regSex}
                        onChange={e => setRegSex(e.target.value)}
                      >
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
                        placeholder="Ej. 24"
                        value={regAge}
                        onChange={e => setRegAge(e.target.value)}
                        required
                      />
                    </div>
                  </div>
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
                    </div>
                  </div>
                  <div className="field-row">
                    <div className="field-group">
                      <label className="field-label">Actividad física</label>
                      <select
                        className="input-clean"
                        value={regActivity}
                        onChange={e => setRegActivity(e.target.value)}
                      >
                        <option value="sedentario">Sedentario</option>
                        <option value="ligero">Ligero (1-3 días/sem)</option>
                        <option value="moderado">Moderado (3-5 días/sem)</option>
                        <option value="intenso">Intenso (6-7 días/sem)</option>
                      </select>
                    </div>
                    <div className="field-group">
                      <label className="field-label">Tipo de metabolismo</label>
                      <select
                        className="input-clean"
                        value={regMetabolism}
                        onChange={e => setRegMetabolism(e.target.value)}
                      >
                        {METABOLISM_OPTIONS.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.label.split('(')[0].trim()}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                    <button type="button" className="btn-outline" onClick={() => setRegStep(1)}>
                      ← Volver
                    </button>
                    <button
                      type="button"
                      className="btn-solid"
                      style={{ flex: 1 }}
                      onClick={() => {
                        setAuthError('');
                        if (Number(regAge) <= 0 || Number(regWeight) <= 0 || Number(regHeight) <= 0) {
                          setAuthError('Ingresa tu edad, peso y estatura para calcular tu metabolismo exacto.');
                          return;
                        }
                        setRegStep(3);
                      }}
                    >
                      Siguiente: Mi objetivo →
                    </button>
                  </div>
                </>
              )}

              {regStep === 3 && (
                <>
                  <div className="field-group">
                    <label className="field-label">¿Cuál es tu objetivo principal?</label>
                    <select
                      className="input-clean"
                      value={regGoal}
                      onChange={e => setRegGoal(e.target.value)}
                    >
                      {GOAL_OPTIONS.map(g => (
                        <option key={g.id} value={g.id}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field-group">
                    <label className="field-label">Enfoque médico preventivo (opcional)</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                      {MEDICAL_CONDITIONS.slice(0, 6).map(cond => {
                        const active = regConditions.includes(cond.id);
                        return (
                          <button
                            key={cond.id}
                            type="button"
                            className="copilot-chip"
                            style={
                              active
                                ? { background: 'var(--accent)', color: '#ffffff', borderColor: 'var(--accent)' }
                                : undefined
                            }
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

                  {regPreview && (
                    <div className="onboarding-preview-box">
                      <div style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: '4px' }}>
                        Plan inicial calculado para tu cuerpo:
                      </div>
                      <div>
                        Meta: <strong>{regPreview.dailyCalories} kcal/día</strong> · Proteína:{' '}
                        <strong>{regPreview.targetProtein}g</strong> · Carbs:{' '}
                        <strong>{regPreview.targetCarbs}g</strong> · Grasas:{' '}
                        <strong>{regPreview.targetFat}g</strong> · Agua:{' '}
                        <strong>{regPreview.waterGoalMl} ml</strong>
                      </div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                        TMB: {regPreview.bmr} kcal · GET: {regPreview.tdee} kcal
                      </div>
                    </div>
                  )}

                  <HealthDisclaimer compact />

                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                    <button type="button" className="btn-outline" onClick={() => setRegStep(2)}>
                      ← Volver
                    </button>
                    <button type="submit" className="btn-solid" style={{ flex: 1 }}>
                      Crear cuenta y comenzar ahora
                    </button>
                  </div>
                </>
              )}
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
