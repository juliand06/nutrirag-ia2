import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  registerWithOnboarding,
  loginWithEmail,
  continueWithGoogleAccount,
  requestPasswordRecovery,
  evaluatePasswordStrength
} from '../api/authClient';
import { useNutriStore } from '../store/useNutriStore';
import { buildPersonalizedNutritionSummary } from '../lib/nutritionCalculator';
import { HandLeafIcon } from '../assets/doodles/HandDrawnSvgs';

export default function AuthPage({ mode = 'register' }) {
  const navigate = useNavigate();
  const onboardingDraft = useNutriStore(s => s.onboardingDraft);
  const setAuthenticatedUser = useNutriStore(s => s.setAuthenticatedUser);
  const showToast = useNutriStore(s => s.showToast);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [emailReminders, setEmailReminders] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [recoveryInfo, setRecoveryInfo] = useState('');

  const computedPlan = buildPersonalizedNutritionSummary(onboardingDraft);
  const strength = evaluatePasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setRecoveryInfo('');

    if (mode === 'forgot') {
      try {
        setLoading(true);
        const res = await requestPasswordRecovery(email);
        setRecoveryInfo(res.message);
      } catch (err) {
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'login') {
      try {
        setLoading(true);
        const res = await loginWithEmail(email, password);
        setAuthenticatedUser(res.user);
        showToast(`¡Qué alegría verte de nuevo, ${res.user.name.split(' ')[0]}!`, 'emerald');
        navigate('/app');
      } catch (err) {
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Modo registro
    if (password.length < 8) {
      setErrorMsg('Elige una contraseña de al menos 8 caracteres para proteger tu cuenta.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Las dos contraseñas no coinciden. Revisa que estén escritas igual.');
      return;
    }
    if (!acceptTerms) {
      setErrorMsg('Por favor marca la casilla de términos y política de privacidad para continuar.');
      return;
    }

    try {
      setLoading(true);
      const res = await registerWithOnboarding({
        name,
        email,
        password,
        acceptTerms,
        emailReminders,
        onboardingData: onboardingDraft,
        computedPlan
      });
      setAuthenticatedUser(res.user);
      showToast(`¡Bienvenido a tu plan, ${res.user.name.split(' ')[0]}!`, 'emerald');
      navigate('/app');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setErrorMsg('');
    try {
      setLoading(true);
      const res = await continueWithGoogleAccount({
        onboardingData: onboardingDraft,
        computedPlan
      });
      setAuthenticatedUser(res.user);
      showToast(`Sesión iniciada como ${res.user.name}.`, 'emerald');
      navigate('/app');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const strengthColors = ['#D95D24', '#D95D24', '#D49B27', '#2E7D32', '#1E5631'];

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-canvas)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))'
      }}
    >
      {/* Columna izquierda: Formulario */}
      <div
        style={{
          padding: '32px 24px 56px',
          maxWidth: '520px',
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}
      >
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '1.15rem',
              color: 'var(--text-primary)'
            }}
          >
            <span
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                backgroundColor: 'var(--brand-leaf)',
                color: '#FFFFFF',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <HandLeafIcon size={18} color="#FFFFFF" />
            </span>
            <span>NutriStudio AI</span>
          </Link>

          <Link to="/empezar" className="ns-btn ns-btn-ghost ns-btn-sm">
            Ver mi resumen
          </Link>
        </div>

        <div className="ns-card ns-card-organic" style={{ padding: '28px' }}>
          {mode === 'register' && (
            <>
              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  backgroundColor: 'var(--brand-leaf-soft)',
                  color: 'var(--brand-leaf)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  marginBottom: '10px'
                }}
              >
                Tu plan de {computedPlan.dailyCalories} kcal está listo para guardarse
              </span>
              <h1 style={{ fontSize: '1.85rem', marginBottom: '6px' }}>Crea tu cuenta gratis</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '22px' }}>
                Guardaremos tus metas, alimentos de {computedPlan.countryName} y seguimiento diario en tu perfil privado.
              </p>
            </>
          )}

          {mode === 'login' && (
            <>
              <h1 style={{ fontSize: '1.85rem', marginBottom: '6px' }}>Qué bueno tenerte de vuelta</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '22px' }}>
                Entra con tu correo y contraseña para seguir con tu plan del día.
              </p>
            </>
          )}

          {mode === 'forgot' && (
            <>
              <h1 style={{ fontSize: '1.85rem', marginBottom: '6px' }}>Recupera tu contraseña</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '22px' }}>
                Te enviaremos un enlace seguro a tu correo para que elijas una clave nueva.
              </p>
            </>
          )}

          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {mode === 'register' && (
              <div>
                <label htmlFor="auth-name" style={{ display: 'block', fontWeight: 600, fontSize: '0.92rem', marginBottom: '6px' }}>
                  ¿Cómo te llamas?
                </label>
                <input
                  id="auth-name"
                  type="text"
                  required
                  className="ns-input"
                  placeholder="Ej. Camila Restrepo"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
            )}

            <div>
              <label htmlFor="auth-email" style={{ display: 'block', fontWeight: 600, fontSize: '0.92rem', marginBottom: '6px' }}>
                Correo electrónico
              </label>
              <input
                id="auth-email"
                type="email"
                required
                className="ns-input"
                placeholder="tucorreo@ejemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label htmlFor="auth-password" style={{ fontWeight: 600, fontSize: '0.92rem' }}>
                    Contraseña {mode === 'register' && '(mínimo 8 caracteres)'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--brand-leaf)',
                      fontWeight: 600,
                      fontSize: '0.84rem',
                      cursor: 'pointer'
                    }}
                  >
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  className="ns-input"
                  placeholder="Crea una contraseña segura"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />

                {mode === 'register' && password.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
                      {[0, 1, 2, 3].map(bar => (
                        <div
                          key={bar}
                          style={{
                            flex: 1,
                            height: '5px',
                            borderRadius: '999px',
                            backgroundColor:
                              bar < strength.score
                                ? strengthColors[strength.score]
                                : 'var(--border-warm)'
                          }}
                        />
                      ))}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      Fortaleza: {strength.label}
                    </span>
                  </div>
                )}
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label htmlFor="auth-confirm" style={{ display: 'block', fontWeight: 600, fontSize: '0.92rem', marginBottom: '6px' }}>
                  Confirma tu contraseña
                </label>
                <input
                  id="auth-confirm"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="ns-input"
                  placeholder="Repite tu contraseña"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>
            )}

            {mode === 'register' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.88rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={e => setAcceptTerms(e.target.checked)}
                    style={{ marginTop: '3px' }}
                  />
                  <span>
                    Acepto los términos de uso y la política de privacidad de datos (obligatorio). Entiendo que es orientación informativa.
                  </span>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.88rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={emailReminders}
                    onChange={e => setEmailReminders(e.target.checked)}
                    style={{ marginTop: '3px' }}
                  />
                  <span>
                    Quiero recibir ideas de recetas de temporada y recordatorios semanales por correo (opcional).
                  </span>
                </label>
              </div>
            )}

            {errorMsg && (
              <div
                role="alert"
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--accent-carrot-soft)',
                  border: '1px solid var(--accent-carrot)',
                  color: 'var(--accent-carrot)',
                  fontSize: '0.9rem',
                  fontWeight: 600
                }}
              >
                {errorMsg}
              </div>
            )}

            {recoveryInfo && (
              <div
                role="status"
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--brand-leaf-soft)',
                  border: '1px solid var(--brand-leaf)',
                  color: 'var(--brand-leaf)',
                  fontSize: '0.9rem',
                  fontWeight: 600
                }}
              >
                {recoveryInfo}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="ns-btn ns-btn-leaf ns-btn-lg"
              style={{ width: '100%' }}
            >
              {loading
                ? 'Procesando…'
                : mode === 'register'
                  ? 'Crear cuenta y abrir mi plan'
                  : mode === 'login'
                    ? 'Entrar a mi cuenta'
                    : 'Enviar instrucciones'}
            </button>
          </form>

          {mode !== 'forgot' && (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  margin: '18px 0',
                  color: 'var(--text-muted)',
                  fontSize: '0.84rem'
                }}
              >
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-warm)' }} />
                <span>o también</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-warm)' }} />
              </div>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading}
                className="ns-btn ns-btn-outline ns-btn-md"
                style={{ width: '100%' }}
              >
                Continuar con Google
              </button>
            </>
          )}

          {/* Enlaces entre Registro / Login / Olvidé mi contraseña */}
          <div
            style={{
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-warm)',
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              fontSize: '0.9rem'
            }}
          >
            {mode === 'register' ? (
              <span>
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" style={{ fontWeight: 700 }}>
                  Iniciar sesión
                </Link>
              </span>
            ) : (
              <span>
                ¿Aún no tienes cuenta?{' '}
                <Link to="/registro" style={{ fontWeight: 700 }}>
                  Crear mi cuenta
                </Link>
              </span>
            )}

            {mode === 'login' && (
              <Link to="/recuperar-clave" style={{ color: 'var(--text-secondary)' }}>
                Olvidé mi contraseña
              </Link>
            )}
            {mode === 'forgot' && (
              <Link to="/login" style={{ fontWeight: 700 }}>
                Volver a iniciar sesión
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Columna derecha: Fotografía cálida de cocina real (solo en escritorio) */}
      <aside
        className="ns-sidebar-desktop"
        style={{
          width: '100%',
          height: 'auto',
          minHeight: '100vh',
          backgroundColor: 'var(--bg-warm)',
          borderRight: 'none',
          borderLeft: '1px solid var(--border-warm)',
          padding: '44px',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <div style={{ maxWidth: '460px' }}>
          <figure
            style={{
              margin: '0 0 24px 0',
              borderRadius: '26px 14px 28px 16px',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-hover)',
              border: '4px solid var(--bg-surface)'
            }}
          >
            <img
              src="/img/auth-cocina-real.webp"
              alt="Mesa de cocina con verduras frescas, hierbas, pan artesanal y aceite de oliva"
              style={{ width: '100%', height: '360px', objectFit: 'cover', display: 'block' }}
            />
          </figure>
          <h2 style={{ fontSize: '1.55rem', marginBottom: '10px' }}>
            Tu información es tuya, sin letra pequeña
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
            Nunca almacenamos tu contraseña en el navegador. Puedes exportar tu diario o borrar todos tus datos con un clic desde tu perfil.
          </p>
        </div>
      </aside>
    </div>
  );
}
