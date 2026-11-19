import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useNutriStore } from '../store/useNutriStore';
import { Button, Chip } from '../design-system';
import HealthDisclaimer from './HealthDisclaimer';

const SCANNER_DEMOS = [
  {
    id: 'plate',
    label: '📷 Foto del plato',
    title: 'Pollo a la plancha + Quinua + Aguacate',
    badge: 'Nutri-Score A · 96/100',
    grade: 'A',
    metrics: '545 kcal · 43g Proteína · 48g Carbs · 18g Grasas · 0 Aditivos',
    note: 'Excelente saciedad y carga glucémica baja (Protocolo ADA/OMS).'
  },
  {
    id: 'barcode',
    label: '🏷️ Código de barras',
    title: 'Yogur Griego Natural Sin Azúcar',
    badge: 'Nutri-Score A · 93/100',
    grade: 'A',
    metrics: '73 kcal/100g · 10.2g Proteína · 3.6g Azúcar · NOVA 1 · 0 Aditivos',
    note: 'Probióticos naturales y alto calcio; alternativa top frente a yogures azucarados.'
  },
  {
    id: 'country',
    label: '🌎 Menú de tu país',
    title: 'Almuerzo Colombiano Saludable y Económico',
    badge: 'Nutri-Score A · 95/100',
    grade: 'A',
    metrics: '610 kcal · 40g Proteína · Frijol cargamanto + Plátano + Aguacate',
    note: 'Calibrado con alimentos frescos locales y presupuesto económico.'
  }
];

export default function LandingPage({ onOpenLogin, onOpenRegister }) {
  const { t } = useTranslation();
  const language = useNutriStore(s => s.language);
  const setLanguage = useNutriStore(s => s.setLanguage);
  const unitSystem = useNutriStore(s => s.unitSystem);
  const toggleUnitSystem = useNutriStore(s => s.toggleUnitSystem);
  const [activeDemoIdx, setActiveDemoIdx] = useState(0);

  const activeDemo = SCANNER_DEMOS[activeDemoIdx];

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
            {t('brand')}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip
            active={language === 'es'}
            onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
            aria-label="Cambiar idioma"
          >
            🌐 {language.toUpperCase()}
          </Chip>
          <Chip
            active={unitSystem === 'imperial'}
            tone="warm"
            onClick={toggleUnitSystem}
            aria-label="Cambiar sistema de unidades"
          >
            ⚖️ {unitSystem === 'metric' ? 'kg/cm' : 'lb/ft'}
          </Chip>
          <Button variant="outline" size="sm" onClick={onOpenLogin}>
            {t('landing.ctaLogin')}
          </Button>
          <Button variant="warm" size="sm" onClick={onOpenRegister}>
            {t('landing.ctaStart')}
          </Button>
        </div>
      </header>

      <main>
        <section className="landing-hero" aria-label="Presentación principal">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <span className="tag-pill">{t('landing.badge')}</span>
            <h1 className="landing-hero-heading">
              {t('landing.heroTitleStart')}
              <span>{t('landing.heroTitleAccent')}</span>
              {t('landing.heroTitleEnd')}
            </h1>
            <p className="landing-hero-lead">{t('landing.heroLead')}</p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Button variant="warm" size="lg" onClick={onOpenRegister}>
                {t('landing.ctaStart')}
              </Button>
              <Button variant="outline" size="lg" onClick={onOpenLogin}>
                {t('landing.ctaLogin')}
              </Button>
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
              <span>✓ Escáner de barras + Open Food Facts</span>
              <span>✓ Metabolismo adaptativo (TDEE)</span>
              <span>✓ Menús locales de 8 países</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <div className="landing-hero-img-wrap">
              <picture>
                <source srcSet="/hero-nutrition.webp" type="image/webp" />
                <img
                  src="/hero-nutrition.jpg"
                  alt="Plato saludable equilibrado en NutriStudio AI"
                />
              </picture>
              <div className="scanner-demo-laser" aria-hidden="true" />
              <div className="landing-floating-stat">
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                    {activeDemo.title}
                  </div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {activeDemo.metrics}
                  </div>
                </div>
                <span className={`nutri-badge nutri-grade-${activeDemo.grade}`}>
                  {activeDemo.badge}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {SCANNER_DEMOS.map((demo, idx) => (
                <Chip
                  key={demo.id}
                  active={activeDemoIdx === idx}
                  tone={idx === 1 ? 'warm' : 'emerald'}
                  onClick={() => setActiveDemoIdx(idx)}
                >
                  {demo.label}
                </Chip>
              ))}
            </div>
          </motion.div>
        </section>

        <section className="landing-metrics-strip" aria-label="Indicadores clave">
          <div className="landing-metric-pill">
            <div className="landing-metric-num">2M+</div>
            <div className="landing-metric-label">Productos vía Open Food Facts y base local</div>
          </div>
          <div className="landing-metric-pill">
            <div className="landing-metric-num">8 Países</div>
            <div className="landing-metric-label">Productividad alimenticia local y presupuesto</div>
          </div>
          <div className="landing-metric-pill">
            <div className="landing-metric-num">7 Guías</div>
            <div className="landing-metric-label">OMS · ADA · DASH · ISSN · ESPEN · KDIGO</div>
          </div>
          <div className="landing-metric-pill">
            <div className="landing-metric-num">PWA</div>
            <div className="landing-metric-label">Instalable y funcional incluso sin conexión</div>
          </div>
        </section>

        <section className="landing-section" aria-label="Funciones principales">
          <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto' }}>
            <span className="tag-pill">Inspirada en los referentes mundiales</span>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '10px', fontFamily: 'var(--font-display)' }}>
              Todo lo que tu salud necesita, en una sola plataforma
            </h2>
          </div>

          <div className="landing-cards-grid">
            <article className="landing-visual-card">
              <picture>
                <source srcSet="/landing-meal-scan.webp" type="image/webp" />
                <img
                  src="/landing-meal-scan.jpg"
                  alt="Escaneo inteligente de platos y códigos de barras"
                  loading="lazy"
                />
              </picture>
              <div className="landing-visual-card-body">
                <span className="nutri-badge nutri-grade-A" style={{ alignSelf: 'flex-start' }}>
                  Visión IA + Yuka
                </span>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                  Escáner de códigos de barras y fotos de tus platos
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Identifica aditivos, Nutri-Score A–E, grupo NOVA y recibe sustituciones más saludables en segundos.
                </p>
              </div>
            </article>

            <article className="landing-visual-card">
              <picture>
                <source srcSet="/landing-wellness.webp" type="image/webp" />
                <img
                  src="/landing-wellness.jpg"
                  alt="Alimentos reales y locales por país"
                  loading="lazy"
                />
              </picture>
              <div className="landing-visual-card-body">
                <span className="nutri-badge nutri-grade-B" style={{ alignSelf: 'flex-start' }}>
                  Planificador Local
                </span>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                  Menús semanales, recetas de nevera y lista por pasillo
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Adapta tus comidas a alergias, tiempo de cocina, presupuesto y alimentos frescos de tu país.
                </p>
              </div>
            </article>

            <article className="landing-visual-card">
              <picture>
                <source srcSet="/hero-nutrition.webp" type="image/webp" />
                <img
                  src="/hero-nutrition.jpg"
                  alt="Metabolismo adaptativo y seguimiento clínico"
                  loading="lazy"
                />
              </picture>
              <div className="landing-visual-card-body">
                <span className="nutri-badge nutri-grade-A" style={{ alignSelf: 'flex-start' }}>
                  Coach Clínico + Micros
                </span>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                  Gráficas de macros, micronutrientes y gasto adaptativo
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Recalibra calorías según tu tendencia real de peso, correlaciona tu sueño y exporta reportes en PDF.
                </p>
              </div>
            </article>
          </div>
        </section>

        <section className="landing-section" aria-label="Testimonios">
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto' }}>
            <span className="tag-pill">Historias reales</span>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '10px', fontFamily: 'var(--font-display)' }}>
              Personas que transformaron su rutina diaria
            </h2>
          </div>

          <div className="testimonials-grid">
            <div className="card ds-card-elevated">
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Valentina T. · Bogotá</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginBottom: '8px' }}>
                Recomposición corporal · Racha de 21 días
              </div>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                “Por fin una app que entiende los alimentos que compro en la plaza de mi país y no me pide ingredientes imposibles.”
              </p>
            </div>
            <div className="card ds-card-elevated">
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Andrés M. · Ciudad de México</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--warm-accent)', marginBottom: '8px' }}>
                Control glucémico · -4.2 kg saludables
              </div>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                “El escáner de barras me abrió los ojos con los aditivos y el Coach me mostró cómo combinar nopal, frijol y proteína.”
              </p>
            </div>
            <div className="card ds-card-elevated">
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Dra. Sofía R. · Nutricionista</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginBottom: '8px' }}>
                Uso clínico complementario
              </div>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                “Me encanta que incluye seguridad clínica para derivar casos delicados y genera reportes en PDF claros para consulta.”
              </p>
            </div>
          </div>
        </section>

        <section className="landing-section" aria-label="Planes y precios">
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto' }}>
            <span className="tag-pill">Transparente desde el inicio</span>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '10px', fontFamily: 'var(--font-display)' }}>
              Elige cómo empezar hoy
            </h2>
          </div>

          <div className="pricing-grid">
            <div className="pricing-card">
              <div>
                <span className="tag-pill">{t('landing.freePlan')}</span>
                <div style={{ fontSize: '1.9rem', fontWeight: 800, marginTop: '10px' }}>
                  $0 <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>/ mes</span>
                </div>
                <ul style={{ marginTop: '14px', paddingLeft: '18px', fontSize: '0.83rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <li>Anillo calórico, macros e hidratación visual</li>
                  <li>Escáner de códigos de barras + Open Food Facts</li>
                  <li>Base de 40+ alimentos locales con Nutri-Score A–E</li>
                  <li>Seguimiento de peso, sueño y pasos offline (PWA)</li>
                </ul>
              </div>
              <Button variant="outline" onClick={onOpenRegister}>
                Empezar gratis
              </Button>
            </div>

            <div className="pricing-card pricing-card-pro">
              <div>
                <span className="nutri-badge nutri-grade-A">{t('landing.proPlan')} · Recomendado</span>
                <div style={{ fontSize: '1.9rem', fontWeight: 800, marginTop: '10px', color: 'var(--warm-accent)' }}>
                  $9.90 <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>/ mes (Demo académica gratis)</span>
                </div>
                <ul style={{ marginTop: '14px', paddingLeft: '18px', fontSize: '0.83rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <li>Todo lo del Plan Free + Coach IA con citas médicas RAG</li>
                  <li>Planificador semanal con alergias y lista de mercado</li>
                  <li>Motor metabólico adaptativo (estilo MacroFactor)</li>
                  <li>Análisis de fotos de platos y reporte clínico PDF</li>
                </ul>
              </div>
              <Button variant="warm" onClick={onOpenRegister}>
                Probar experiencia completa →
              </Button>
            </div>
          </div>
        </section>

        <section className="landing-section" aria-label="Preguntas frecuentes">
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.55rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
              {t('landing.faqTitle')}
            </h2>
          </div>

          <div className="faq-list">
            <details className="faq-item">
              <summary>¿Mis documentos y PDFs nutricionales quedan privados? <span>+</span></summary>
              <p>Sí. Cada cuenta mantiene su espacio aislado y el archivo original se conserva en tu dispositivo sin retener copias innecesarias en el servidor.</p>
            </details>
            <details className="faq-item">
              <summary>¿Puedo usar NutriStudio sin conexión o instalarlo en el celular? <span>+</span></summary>
              <p>Sí. Es una Aplicación Web Progresiva (PWA) con almacenamiento offline en IndexedDB para registrar tus comidas y agua en cualquier momento.</p>
            </details>
            <details className="faq-item">
              <summary>¿Cómo adapta la plataforma los alimentos a mi país y presupuesto? <span>+</span></summary>
              <p>Al elegir tu país y presupuesto en el registro, priorizamos alimentos de alta disponibilidad local y ajustamos tu menú semanal y lista de compras.</p>
            </details>
            <details className="faq-item">
              <summary>¿Reemplaza una consulta médica o con nutricionista? <span>+</span></summary>
              <p>No. Todas las recomendaciones son orientación informativa y ante embarazo, diabetes tipo 1, menores o trastornos alimentarios derivamos automáticamente a un profesional.</p>
            </details>
          </div>
        </section>

        <section className="landing-quote-band">
          <div className="landing-quote-inner">
            <div style={{ fontSize: '1.35rem', fontWeight: 700, maxWidth: '720px', margin: '0 auto', lineHeight: 1.35, fontFamily: 'var(--font-display)' }}>
              “No se trata de comer menos, sino de darle a tu metabolismo exactamente lo que necesita hoy.”
            </div>
            <p style={{ fontSize: '0.9rem', opacity: 0.9, marginTop: '10px', marginBottom: '22px' }}>
              Completa nuestro onboarding conversacional en 6 pasos rápidos y obtén tu plan hoy.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <Button variant="warm" size="lg" onClick={onOpenRegister}>
                Crear mi cuenta ahora →
              </Button>
              <Button
                variant="outline"
                size="lg"
                style={{ background: 'rgba(255,255,255,0.14)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.4)' }}
                onClick={onOpenLogin}
              >
                {t('landing.ctaLogin')}
              </Button>
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
