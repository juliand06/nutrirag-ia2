import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HandUnderline, HandArrow, HandLeafIcon } from '../assets/doodles/HandDrawnSvgs';
import { useNutriStore } from '../store/useNutriStore';

const STRIP_PHOTOS = [
  {
    src: '/img/hero-mesa-latina.webp',
    alt: 'Plato casero latinoamericano con aguacate, arroz, frijoles y vegetales frescos',
    caption: 'Almuerzo casero · Medellín'
  },
  {
    src: '/img/hero-mercado-fresco.webp',
    alt: 'Canasta de mercado con verduras de hoja verde, tomates y tubérculos frescos',
    caption: 'Fruver de temporada'
  },
  {
    src: '/img/plato-desayuno.webp',
    alt: 'Huevos revueltos con tomate, aguacate y pan artesanal en mesa de madera',
    caption: 'Desayuno de verdad'
  },
  {
    src: '/img/hero-frutas-tropicales.webp',
    alt: 'Variedad de frutas tropicales frescas como papaya, guayaba, mango y banano',
    caption: 'Frutas de nuestra tierra'
  },
  {
    src: '/img/plato-almuerzo.webp',
    alt: 'Tazón nutritivo con proteína a la plancha, quinua, vegetales y semillas',
    caption: 'Platos que sí llenan'
  },
  {
    src: '/img/plato-cena.webp',
    alt: 'Pescado al horno con hierbas, papas criollas y ensalada verde',
    caption: 'Cenas ligeras y ricas'
  }
];

const PILLAR_CARDS = [
  {
    id: 'planifica',
    tag: 'Organización semanal',
    title: 'Planifica tus comidas',
    phrase: 'Arma menús para toda la semana con lo que ya tienes en la cocina y una lista de mercado ordenada por pasillo.',
    image: '/img/card-planifica.webp',
    alt: 'Mesa con ingredientes frescos listos para organizar las comidas de la semana',
    radius: '26px 14px 24px 16px'
  },
  {
    id: 'entiende',
    tag: 'Sin enredos ni culpas',
    title: 'Entiende lo que comes',
    phrase: 'Conoce qué te aportan los carbohidratos, las proteínas, la fibra y cómo leer etiquetas sin volverte esclavo de una balanza.',
    image: '/img/card-entiende.webp',
    alt: 'Plato colorido con fuentes reales de proteína, fibra y grasas saludables',
    radius: '14px 26px 16px 24px'
  },
  {
    id: 'presupuesto',
    tag: 'Bolsillo cuidado',
    title: 'Come bien con tu presupuesto',
    phrase: 'Comer saludable no requiere ingredientes importados: aprovechamos huevo, legumbres, frutas de cosecha y tubérculos locales.',
    image: '/img/card-presupuesto.webp',
    alt: 'Frutas, verduras y legumbres económicas en mercado local',
    radius: '24px 16px 26px 14px'
  },
  {
    id: 'sabores',
    tag: 'Identidad culinaria',
    title: 'Sabores de tu país',
    phrase: 'Desde la arepa, la guayaba y el frijol cargamanto en Colombia hasta el nopal en México o la quinua en Perú.',
    image: '/img/card-sabores-pais.webp',
    alt: 'Mesa compartida con platos tradicionales latinoamericanos preparados en casa',
    radius: '16px 24px 14px 26px'
  }
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Cuéntanos tu rutina y tus gustos',
    description:
      'En dos minutos nos dices qué quieres lograr, cuánto tiempo tienes para cocinar, tu presupuesto y qué alimentos prefieres evitar. Sin pedirte correo de entrada.',
    image: '/img/onboarding-comida.webp',
    alt: 'Ensalada fresca con aguacate y vegetales recién cortados'
  },
  {
    step: '02',
    title: 'Recibe un plan pensado para tu mesa',
    description:
      'Calculamos tu energía diaria, agua y porciones en lenguaje claro, con platos cotidianos de tu ciudad y alternativas intercambiables en un toque.',
    image: '/img/plato-almuerzo.webp',
    alt: 'Plato completo y balanceado servido en vajilla de cerámica artesanal'
  },
  {
    step: '03',
    title: 'Acompañamiento diario sin regaños',
    description:
      'Registra tus comidas, toma agua a tu ritmo y pregúntale al Coach con IA qué preparar con lo que hay en la nevera, respaldado por guías OMS, ADA y DASH.',
    image: '/img/auth-cocina-real.webp',
    alt: 'Persona cocinando con ingredientes frescos en una cocina luminosa'
  }
];

const FAQ_ITEMS = [
  {
    q: '¿Tengo que dejar la arepa, el arroz o el plátano para ver resultados?',
    a: 'Para nada. La comida tradicional de tu país tiene muchísimo valor nutricional. Te enseñamos a combinar tus carbohidratos favoritos con buena proteína, fibra y porciones acordes a tu día.'
  },
  {
    q: '¿Por qué me hacen preguntas antes de pedirme el correo?',
    a: 'Porque queremos que primero veas cómo luce tu plan, cuánta energía necesitas y qué enfoque te proponemos. Solo creas tu cuenta si sientes que el plan realmente te sirve.'
  },
  {
    q: '¿De dónde salen las recomendaciones del Coach con IA?',
    a: 'Las respuestas se apoyan en guías nutricionales reconocidas (OMS/FAO, Asociación Americana de Diabetes - ADA, dieta DASH e ICBF) y te muestran la fuente citada cuando consultas un tema específico.'
  },
  {
    q: '¿Qué pasa si soy menor de edad, estoy embarazada o tengo una condición médica?',
    a: 'Tu seguridad va primero. Si eres menor de 18 años, estás en embarazo o lactancia, o atraviesas una relación difícil con la comida, la plataforma desactiva cualquier recorte calórico y te ofrece solo orientación educativa junto con la recomendación de acudir a un profesional.'
  },
  {
    q: '¿Necesito comprar ingredientes caros o suplementos?',
    a: 'No. Puedes elegir presupuesto económico, medio o amplio, y el plan priorizará alimentos de cosecha local como huevo, lenteja, frijol, guayaba, plátano, avena o pescado según tu bolsillo.'
  },
  {
    q: '¿Cómo cuidan mis datos y mi privacidad?',
    a: 'Tus preferencias y registros son tuyos. Nunca guardamos contraseñas en texto plano en el navegador y desde tu perfil puedes exportar toda tu información o borrar tu cuenta por completo cuando quieras.'
  },
  {
    q: '¿NutriStudio AI reemplaza la consulta con un nutricionista o médico?',
    a: 'No. NutriStudio AI ofrece orientación informativa y herramientas prácticas de organización alimentaria, pero nunca sustituye el diagnóstico ni el tratamiento de un profesional de la salud.'
  }
];

export default function LandingPage({ onOpenLogin, onOpenRegister }) {
  const navigate = useNavigate();
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const themeMode = useNutriStore(s => s.themeMode);
  const toggleThemeMode = useNutriStore(s => s.toggleThemeMode);

  const handleStartPlan = () => {
    if (onOpenRegister) onOpenRegister();
    navigate('/empezar');
  };

  const handleGoLogin = () => {
    if (onOpenLogin) onOpenLogin();
    navigate('/login');
  };

  return (
    <div style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-primary)', minHeight: '100vh' }}>
      {/* Barra superior editorial */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 80,
          backgroundColor: 'var(--bg-canvas)',
          borderBottom: '1px solid var(--border-warm)'
        }}
      >
        <div
          style={{
            maxWidth: '1220px',
            margin: '0 auto',
            padding: '14px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap'
          }}
        >
          <a
            href="#inicio"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              color: 'var(--text-primary)',
              fontWeight: 700,
              fontSize: '1.18rem',
              fontFamily: 'var(--font-display)'
            }}
          >
            <span
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '12px 8px 14px 10px',
                backgroundColor: 'var(--brand-leaf)',
                color: '#FFFFFF',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <HandLeafIcon size={20} color="#FFFFFF" />
            </span>
            <span>NutriStudio AI</span>
          </a>

          <nav
            aria-label="Navegación principal de portada"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '22px',
              flexWrap: 'wrap',
              fontSize: '0.94rem',
              fontWeight: 500
            }}
          >
            <a href="#pilares" style={{ color: 'var(--text-secondary)' }}>Comer bien</a>
            <a href="#como-funciona" style={{ color: 'var(--text-secondary)' }}>Cómo funciona</a>
            <a href="#coach-ia" style={{ color: 'var(--text-secondary)' }}>Tu coach con IA</a>
            <a href="#preguntas" style={{ color: 'var(--text-secondary)' }}>Preguntas frecuentes</a>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={toggleThemeMode}
              className="ns-btn ns-btn-ghost ns-btn-sm"
              aria-label="Cambiar entre modo claro y oscuro"
            >
              {themeMode === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            </button>
            <button
              type="button"
              onClick={handleGoLogin}
              className="ns-btn ns-btn-outline ns-btn-sm"
            >
              Ya tengo cuenta
            </button>
            <button
              type="button"
              onClick={handleStartPlan}
              className="ns-btn ns-btn-leaf ns-btn-sm"
            >
              Empezar mi plan
            </button>
          </div>
        </div>
      </header>

      {/* 1. HERO A PANTALLA COMPLETA CON COLLAGE ORGÁNICO DE COMIDA REAL */}
      <section
        id="inicio"
        style={{
          maxWidth: '1220px',
          margin: '0 auto',
          padding: '44px 22px 64px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '44px',
          alignItems: 'center'
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <span
            style={{
              display: 'inline-block',
              padding: '6px 14px',
              borderRadius: '999px',
              backgroundColor: 'var(--bg-warm)',
              border: '1px solid var(--border-strong)',
              color: 'var(--accent-earth)',
              fontSize: '0.84rem',
              fontWeight: 600,
              marginBottom: '18px'
            }}
          >
            Comida real de tu país · Sin dietas de hambre
          </span>

          <h1
            style={{
              fontSize: 'clamp(2.25rem, 4.6vw, 3.65rem)',
              lineHeight: 1.09,
              marginBottom: '18px',
              color: 'var(--text-primary)'
            }}
          >
            Come mejor{' '}
            <span style={{ display: 'inline-block', position: 'relative', color: 'var(--brand-leaf)' }}>
              sin complicarte la vida
              <HandUnderline color="#D95D24" style={{ marginTop: '2px' }} />
            </span>
          </h1>

          {/* Subtítulo de una línea + compatibilidad semántica */}
          <p
            style={{
              fontSize: '1.14rem',
              color: 'var(--text-secondary)',
              marginBottom: '28px',
              maxWidth: '540px'
            }}
          >
            Nutre tu cuerpo con los sabores de tu casa, un plan hecho a la medida de tu bolsillo y un coach con IA que te explica el porqué de cada plato.
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              flexWrap: 'wrap'
            }}
          >
            <button
              type="button"
              onClick={handleStartPlan}
              className="ns-btn ns-btn-carrot ns-btn-lg"
            >
              Empezar mi plan
            </button>
            <button
              type="button"
              onClick={handleGoLogin}
              className="ns-btn ns-btn-ghost ns-btn-md"
              style={{ textDecoration: 'underline', textUnderlineOffset: '4px' }}
            >
              Ya tengo cuenta
            </button>
            <HandArrow color="var(--accent-earth)" />
          </div>

          <p
            style={{
              marginTop: '18px',
              fontSize: '0.86rem',
              color: 'var(--text-muted)'
            }}
          >
            Toma menos de 2 minutos · No te pedimos correo ni tarjeta para ver tu resumen.
          </p>
        </motion.div>

        {/* Collage / mosaico artesanal con rotaciones sutiles y esquinas asimétricas */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          style={{
            display: 'grid',
            gridTemplateColumns: '1.15fr 0.95fr',
            gap: '16px',
            alignItems: 'stretch',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <figure
              style={{
                margin: 0,
                borderRadius: '28px 14px 24px 18px',
                overflow: 'hidden',
                transform: 'rotate(-1.4deg)',
                boxShadow: 'var(--shadow-hover)',
                border: '3px solid var(--bg-surface)',
                backgroundColor: 'var(--bg-surface)'
              }}
            >
              <img
                src="/img/hero-mesa-latina.webp"
                alt="Almuerzo casero con aguacate Hass, frijoles, arroz y ensalada fresca sobre mesa de madera"
                style={{ width: '100%', height: '230px', objectFit: 'cover', display: 'block' }}
              />
              <figcaption
                style={{
                  padding: '10px 14px',
                  fontSize: '0.83rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)'
                }}
              >
                Almuerzo casero balanceado · 540 kcal
              </figcaption>
            </figure>

            <figure
              style={{
                margin: 0,
                borderRadius: '14px 24px 18px 26px',
                overflow: 'hidden',
                transform: 'rotate(1.1deg)',
                boxShadow: 'var(--shadow-card)',
                border: '3px solid var(--bg-surface)',
                backgroundColor: 'var(--bg-surface)'
              }}
            >
              <img
                src="/img/hero-frutas-tropicales.webp"
                alt="Frutas tropicales frescas de plaza de mercado: guayaba, papaya, mango y cítricos"
                style={{ width: '100%', height: '165px', objectFit: 'cover', display: 'block' }}
              />
              <figcaption
                style={{
                  padding: '8px 14px',
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)'
                }}
              >
                Frutas de cosecha local ricas en vitamina C
              </figcaption>
            </figure>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '22px' }}>
            <figure
              style={{
                margin: 0,
                borderRadius: '22px 28px 14px 24px',
                overflow: 'hidden',
                transform: 'rotate(1.5deg)',
                boxShadow: 'var(--shadow-card)',
                border: '3px solid var(--bg-surface)',
                backgroundColor: 'var(--bg-surface)'
              }}
            >
              <img
                src="/img/hero-mercado-fresco.webp"
                alt="Canasta con verduras frescas, tomates, hojas verdes y tubérculos del mercado"
                style={{ width: '100%', height: '175px', objectFit: 'cover', display: 'block' }}
              />
              <figcaption
                style={{
                  padding: '8px 14px',
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)'
                }}
              >
                Lista de compras por pasillo y presupuesto
              </figcaption>
            </figure>

            <figure
              style={{
                margin: 0,
                borderRadius: '18px 14px 28px 20px',
                overflow: 'hidden',
                transform: 'rotate(-1deg)',
                boxShadow: 'var(--shadow-hover)',
                border: '3px solid var(--bg-surface)',
                backgroundColor: 'var(--bg-surface)'
              }}
            >
              <img
                src="/img/hero-plato-casero.webp"
                alt="Plato de vegetales asados, garbanzos, semillas y aderezo natural"
                style={{ width: '100%', height: '210px', objectFit: 'cover', display: 'block' }}
              />
              <figcaption
                style={{
                  padding: '10px 14px',
                  fontSize: '0.83rem',
                  fontWeight: 600,
                  color: 'var(--brand-leaf)'
                }}
              >
                ¡Qué buen día para comer rico y sin culpa!
              </figcaption>
            </figure>
          </div>
        </motion.div>
      </section>

      {/* 2. BANDA DE FOTOS DE COMIDA QUE SE DESPLAZA SUAVEMENTE */}
      <section
        aria-label="Galería de platos reales"
        style={{
          overflow: 'hidden',
          padding: '18px 0',
          backgroundColor: 'var(--bg-warm)',
          borderTop: '1px solid var(--border-warm)',
          borderBottom: '1px solid var(--border-warm)'
        }}
      >
        <div className="ns-food-strip">
          {[...STRIP_PHOTOS, ...STRIP_PHOTOS].map((item, idx) => (
            <div
              key={`${item.caption}-${idx}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                backgroundColor: 'var(--bg-surface)',
                padding: '8px 16px 8px 8px',
                borderRadius: '999px',
                border: '1px solid var(--border-warm)',
                boxShadow: 'var(--shadow-card)'
              }}
            >
              <img
                src={item.src}
                alt={item.alt}
                loading="lazy"
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
              />
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {item.caption}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 3. CUATRO TARJETAS ESTILO T2DNETWORK ("Healthy Eating") */}
      <section
        id="pilares"
        style={{
          maxWidth: '1220px',
          margin: '0 auto',
          padding: '72px 22px'
        }}
      >
        <div style={{ maxWidth: '680px', marginBottom: '40px' }}>
          <span
            style={{
              color: 'var(--accent-carrot)',
              fontWeight: 700,
              fontSize: '0.86rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em'
            }}
          >
            Alimentación consciente para la vida real
          </span>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3.2vw, 2.5rem)', marginTop: '8px', marginBottom: '12px' }}>
            Cuatro pilares para comer con gusto y tranquilidad
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', margin: 0 }}>
            Inspirado en las mejores guías comunitarias de salud nutricional: directo al grano, con ingredientes que conoces y explicaciones en tus palabras.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(265px, 1fr))',
            gap: '24px'
          }}
        >
          {PILLAR_CARDS.map((card) => (
            <article
              key={card.id}
              className="ns-card"
              style={{
                padding: 0,
                overflow: 'hidden',
                borderRadius: card.radius,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ position: 'relative', height: '200px', overflow: 'hidden' }}>
                  <img
                    src={card.image}
                    alt={card.alt}
                    loading="lazy"
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
                    {card.tag}
                  </span>
                </div>
                <div style={{ padding: '22px' }}>
                  <h3 style={{ fontSize: '1.35rem', marginBottom: '10px' }}>{card.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.96rem', margin: 0 }}>
                    {card.phrase}
                  </p>
                </div>
              </div>
              <div style={{ padding: '0 22px 20px' }}>
                <button
                  type="button"
                  onClick={handleStartPlan}
                  className="ns-btn ns-btn-ghost ns-btn-sm"
                  style={{ paddingLeft: 0, color: 'var(--brand-leaf)' }}
                >
                  Explorar en mi plan →
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 4. SECCIÓN "CÓMO FUNCIONA" EN 3 PASOS */}
      <section
        id="como-funciona"
        style={{
          backgroundColor: 'var(--bg-warm)',
          borderTop: '1px solid var(--border-warm)',
          borderBottom: '1px solid var(--border-warm)',
          padding: '72px 22px'
        }}
      >
        <div style={{ maxWidth: '1220px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 48px' }}>
            <span
              style={{
                color: 'var(--brand-leaf)',
                fontWeight: 700,
                fontSize: '0.86rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em'
              }}
            >
              Paso a paso
            </span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.2vw, 2.45rem)', marginTop: '8px', marginBottom: '10px' }}>
              Cómo funciona NutriStudio AI
            </h2>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              Sin formularios eternos ni tecnicismos clínicos difíciles de entender.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '28px'
            }}
          >
            {HOW_IT_WORKS.map((item) => (
              <div
                key={item.step}
                className="ns-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  borderRadius: '22px 16px 24px 18px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '2rem',
                      fontWeight: 700,
                      color: 'var(--accent-carrot)'
                    }}
                  >
                    {item.step}
                  </span>
                  <span
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      backgroundColor: 'var(--bg-warm)',
                      padding: '4px 12px',
                      borderRadius: '999px'
                    }}
                  >
                    Plan Free & Pro Clínico
                  </span>
                </div>
                <img
                  src={item.image}
                  alt={item.alt}
                  loading="lazy"
                  style={{
                    width: '100%',
                    height: '175px',
                    objectFit: 'cover',
                    borderRadius: '14px'
                  }}
                />
                <h3 style={{ fontSize: '1.28rem', marginBottom: '4px' }}>{item.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. SECCIÓN "TU COACH CON IA" MOSTRANDO UN CHAT DE EJEMPLO REALISTA */}
      <section
        id="coach-ia"
        style={{
          maxWidth: '1220px',
          margin: '0 auto',
          padding: '76px 22px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '44px',
          alignItems: 'center'
        }}
      >
        <div>
          <span
            style={{
              color: 'var(--accent-carrot)',
              fontWeight: 700,
              fontSize: '0.86rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em'
            }}
          >
            Tu coach con IA
          </span>
          <h2 style={{ fontSize: 'clamp(1.85rem, 3.2vw, 2.5rem)', marginTop: '8px', marginBottom: '16px' }}>
            Un compañero que conoce tu nevera y habla tu mismo idioma
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.04rem', marginBottom: '20px' }}>
            ¿Llegaste cansado a las 8 de la noche y solo tienes huevos, tomate, medio aguacate y una arepa? Pregúntale al coach y te dará opciones concretas que cuadran con tu día, citando guías nutricionales reales.
          </p>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: '0 0 28px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              color: 'var(--text-primary)',
              fontWeight: 500
            }}
          >
            <li>✓ Cambia ingredientes que no te gusten o estén caros esta semana.</li>
            <li>✓ Agrega cualquier plato sugerido a tu diario con un solo botón.</li>
            <li>✓ Cita las guías OMS, ADA y tablas de composición cuando te explica algo.</li>
          </ul>
          <button
            type="button"
            onClick={handleStartPlan}
            className="ns-btn ns-btn-leaf ns-btn-lg"
          >
            Probar con mis propios datos →
          </button>
        </div>

        {/* Ventana de chat realista y cálida */}
        <div
          className="ns-card ns-card-organic"
          style={{
            padding: '24px',
            backgroundColor: 'var(--bg-surface)',
            border: '1.5px solid var(--border-strong)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '14px',
              marginBottom: '18px',
              borderBottom: '1px solid var(--border-warm)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--brand-leaf)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700
                }}
              >
                NS
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.96rem' }}>Coach NutriStudio</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Basado en guías OMS · ADA · Alimentos de Colombia
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.76rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '999px',
                backgroundColor: 'var(--brand-leaf-soft)',
                color: 'var(--brand-leaf)'
              }}
            >
              Ejemplo real
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                alignSelf: 'flex-end',
                maxWidth: '85%',
                backgroundColor: 'var(--bg-warm)',
                color: 'var(--text-primary)',
                padding: '12px 16px',
                borderRadius: '18px 18px 4px 18px',
                fontSize: '0.94rem'
              }}
            >
              ¿Qué ceno hoy rápido? Tengo huevos, aguacate, tomate y me quedan unas 480 kcal del día.
            </div>

            <div
              style={{
                alignSelf: 'flex-start',
                maxWidth: '92%',
                backgroundColor: 'var(--bg-sage)',
                color: 'var(--text-primary)',
                padding: '16px',
                borderRadius: '18px 18px 18px 4px',
                fontSize: '0.94rem'
              }}
            >
              <p style={{ margin: '0 0 10px 0', fontWeight: 600 }}>
                ¡Tienes una cena buenísima en 8 minutos! Te propongo:
              </p>
              <p style={{ margin: '0 0 10px 0' }}>
                <strong>Pericos caseros con aguacate:</strong> 2 huevos revueltos con tomate y cebolla en poquito aceite + medio aguacate Hass (70 g) + 1 arepa pequeña de maíz asada (60 g).
              </p>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginBottom: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 600
                }}
              >
                <span className="ns-chip">455 kcal</span>
                <span className="ns-chip">21 g proteína</span>
                <span className="ns-chip">28 g carbos</span>
                <span className="ns-chip">6 g fibra</span>
              </div>
              <div
                style={{
                  fontSize: '0.79rem',
                  color: 'var(--text-secondary)',
                  borderTop: '1px dashed var(--border-strong)',
                  paddingTop: '8px'
                }}
              >
                Fuente: <em>Guia_Planificacion_Comidas_e_Hidratacion.pdf (Pág. 3)</em> — Priorizar proteína y fibra en la noche mejora la saciedad y el descanso.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. PREGUNTAS FRECUENTES EN ACORDEÓN (MÍNIMO 6) */}
      <section
        id="preguntas"
        style={{
          backgroundColor: 'var(--bg-warm)',
          borderTop: '1px solid var(--border-warm)',
          padding: '72px 22px'
        }}
      >
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.35rem)', marginBottom: '12px', textAlign: 'center' }}>
            Preguntas frecuentes
          </h2>
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '36px' }}>
            Resolvemos tus dudas con total transparencia antes de que empieces.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={item.q}
                  className="ns-card"
                  style={{ padding: '16px 20px', borderRadius: '16px' }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}
                    aria-expanded={isOpen}
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      textAlign: 'left',
                      fontSize: '1.04rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      cursor: 'pointer'
                    }}
                  >
                    <span>{item.q}</span>
                    <span
                      aria-hidden="true"
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: isOpen ? 'var(--brand-leaf)' : 'var(--bg-warm)',
                        color: isOpen ? '#FFFFFF' : 'var(--text-primary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>
                  {isOpen && (
                    <p
                      style={{
                        marginTop: '12px',
                        marginBottom: 0,
                        color: 'var(--text-secondary)',
                        fontSize: '0.96rem',
                        lineHeight: 1.6
                      }}
                    >
                      {item.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. PIE DE PÁGINA CON AVISO LEGAL OBLIGATORIO */}
      <footer
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderTop: '1px solid var(--border-warm)',
          padding: '44px 22px'
        }}
      >
        <div
          style={{
            maxWidth: '1220px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
              <HandLeafIcon size={20} color="var(--brand-leaf)" />
              <span>NutriStudio AI</span>
            </div>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <button type="button" onClick={handleStartPlan} className="ns-btn ns-btn-leaf ns-btn-sm">
                Empezar mi plan
              </button>
              <button type="button" onClick={handleGoLogin} className="ns-btn ns-btn-outline ns-btn-sm">
                Ya tengo cuenta
              </button>
            </div>
          </div>

          <div
            role="note"
            style={{
              padding: '14px 18px',
              borderRadius: '14px',
              backgroundColor: 'var(--bg-warm)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-secondary)',
              fontSize: '0.88rem'
            }}
          >
            <strong>Aviso importante:</strong> NutriStudio AI ofrece orientación informativa sobre alimentación y no reemplaza la consulta con un profesional de la salud. Esta plataforma ofrece orientación informativa y no reemplaza a un profesional de la salud.
          </div>
        </div>
      </footer>
    </div>
  );
}
