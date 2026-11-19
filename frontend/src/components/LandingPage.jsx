import React from 'react';
import HealthDisclaimer from './HealthDisclaimer';

export default function LandingPage({ onOpenLogin, onOpenRegister }) {
  return (
    <div className="landing-page">
      <header className="landing-nav">
        <div className="auth-brand" style={{ marginBottom: 0 }}>
          <img
            src="/nutristudio-logo.svg"
            alt="Logo NutriStudio AI"
            style={{ width: '34px', height: '34px', borderRadius: '9px' }}
          />
          <span className="auth-brand-name" style={{ fontSize: '1.12rem' }}>
            NutriStudio AI
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button type="button" className="btn-outline" onClick={onOpenLogin}>
            Iniciar sesión
          </button>
          <button type="button" className="btn-solid" onClick={onOpenRegister}>
            Comenzar gratis
          </button>
        </div>
      </header>

      <main>
        <section className="landing-hero" aria-label="Presentación principal">
          <div>
            <span className="tag-pill">
              Tu espacio de nutrición inteligente y bienestar diario
            </span>
            <h1 className="landing-hero-heading">
              Nutre tu cuerpo con <span>ciencia e inteligencia</span>, no con dietas imposibles.
            </h1>
            <p className="landing-hero-lead">
              “El verdadero cambio comienza cuando entiendes tu metabolismo, aprovechas los alimentos reales de tu país y cuentas con un asistente nutricional que te acompaña en cada comida.”
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-solid"
                style={{ padding: '12px 22px', fontSize: '0.92rem' }}
                onClick={onOpenRegister}
              >
                Empezar mi plan personalizado →
              </button>
              <button
                type="button"
                className="btn-outline"
                style={{ padding: '12px 20px', fontSize: '0.92rem' }}
                onClick={onOpenLogin}
              >
                Ya tengo cuenta
              </button>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '18px',
                flexWrap: 'wrap',
                marginTop: '22px',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)'
              }}
            >
              <span>✓ Anillo calórico y macros</span>
              <span>✓ Escáner de platos y Nutri-Score A–E</span>
              <span>✓ Planes con alimentos reales de tu país</span>
            </div>
          </div>

          <div className="landing-hero-img-wrap">
            <img src="/hero-nutrition.jpg" alt="Plato saludable equilibrado en NutriStudio AI" />
            <div className="landing-floating-stat">
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  Seguimiento inteligente 360°
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Calorías · Micronutrientes · Pronóstico corporal a 30 días
                </div>
              </div>
              <span className="nutri-badge nutri-grade-A">Nutri-Score A</span>
            </div>
          </div>
        </section>

        <section className="landing-metrics-strip" aria-label="Indicadores de la plataforma">
          <div className="landing-metric-pill">
            <div className="landing-metric-num">40+</div>
            <div className="landing-metric-label">Alimentos reales con puntaje de calidad A–E</div>
          </div>
          <div className="landing-metric-pill">
            <div className="landing-metric-num">8 Países</div>
            <div className="landing-metric-label">Planes con alimentos locales y a tu alcance</div>
          </div>
          <div className="landing-metric-pill">
            <div className="landing-metric-num">100%</div>
            <div className="landing-metric-label">Respaldado en medicina nutricional clínica</div>
          </div>
          <div className="landing-metric-pill">
            <div className="landing-metric-num">24/7</div>
            <div className="landing-metric-label">Asistente inteligente que te acompaña hoy</div>
          </div>
        </section>

        <section className="landing-section" aria-label="Beneficios principales">
          <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto' }}>
            <span className="tag-pill">Diseñada para acompañarte todos los días</span>
            <h2 style={{ fontSize: '1.65rem', fontWeight: 700, marginTop: '10px', letterSpacing: '-0.025em' }}>
              Todo lo que tu salud necesita, en una sola plataforma
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              Pensada para que cuidar tu alimentación sea claro, visual, motivador y sostenible.
            </p>
          </div>

          <div className="landing-cards-grid">
            <article className="landing-visual-card">
              <img src="/landing-meal-scan.jpg" alt="Escaneo inteligente de platos con fotografía" />
              <div className="landing-visual-card-body">
                <span className="nutri-badge nutri-grade-A" style={{ alignSelf: 'flex-start' }}>
                  Escáner y Calidad
                </span>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                  “Una foto basta para conocer tus calorías, macros y calidad real.”
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Analiza tus platos al instante, busca en nuestra base con Nutri-Score A–E y recibe sustituciones más saludables en tiempo real.
                </p>
              </div>
            </article>

            <article className="landing-visual-card">
              <img src="/landing-wellness.jpg" alt="Alimentos frescos y locales por país" />
              <div className="landing-visual-card-body">
                <span className="nutri-badge nutri-grade-B" style={{ alignSelf: 'flex-start' }}>
                  Alimentos de tu País
                </span>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                  “Comer saludable no tiene que ser costoso ni lejano a tu cultura.”
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Adaptamos menús automáticos y tu lista de mercado semanal a los alimentos más nutritivos y accesibles de tu país y presupuesto.
                </p>
              </div>
            </article>

            <article className="landing-visual-card">
              <img src="/hero-nutrition.jpg" alt="Seguimiento nutricional y de salud personalizado" />
              <div className="landing-visual-card-body">
                <span className="nutri-badge nutri-grade-A" style={{ alignSelf: 'flex-start' }}>
                  Cuidado Personalizado
                </span>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                  “Un asistente que conoce tu cuerpo, tus metas y tu progreso.”
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Acompañamiento diario respaldado en guías médicas de nutrición, con seguimiento de hidratación, peso y exámenes de salud.
                </p>
              </div>
            </article>
          </div>
        </section>

        <section className="landing-quote-band">
          <div className="landing-quote-inner">
            <div style={{ fontSize: '1.35rem', fontWeight: 700, maxWidth: '720px', margin: '0 auto', lineHeight: 1.35 }}>
              “No se trata de comer menos, sino de darle a tu metabolismo exactamente lo que necesita hoy.”
            </div>
            <p style={{ fontSize: '0.9rem', opacity: 0.9, marginTop: '10px', marginBottom: '22px' }}>
              Registra tu edad, peso, estatura y objetivo en 3 pasos rápidos y comienza tu proceso ahora mismo.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-outline"
                style={{ background: '#ffffff', color: '#0f6b56', borderColor: '#ffffff', fontWeight: 600, padding: '11px 22px' }}
                onClick={onOpenRegister}
              >
                Crear mi cuenta en 3 pasos →
              </button>
              <button
                type="button"
                className="btn-outline"
                style={{ background: 'rgba(255,255,255,0.14)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.4)', padding: '11px 20px' }}
                onClick={onOpenLogin}
              >
                Iniciar sesión
              </button>
            </div>
          </div>
          <div style={{ marginTop: '14px' }}>
            <HealthDisclaimer />
          </div>
        </section>
      </main>
    </div>
  );
}
