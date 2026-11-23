import React, { useState } from 'react';
import { useNutriStore } from '../store/useNutriStore';
import { resolveUserClinicalProtocols } from '../lib/proactiveAiEngine';
import { MEDICAL_CONDITIONS } from '../services/clinicalKnowledgeBase';

const EDUCATIONAL_GUIDES = [
  {
    id: 'planificar',
    title: 'Planificar comidas y recetas',
    phrase: 'Organiza tu semana en 15 minutos para no terminar pidiendo domicilios por cansancio.',
    image: '/img/card-planifica.webp',
    alt: 'Mesa con verduras frescas, legumbres y recipientes para organizar la semana',
    articles: [
      {
        subtitle: 'La regla del plato clínico en 3 partes (OMS / ADA)',
        body: 'Sin pesar cada gramo: llena la mitad de tu plato con verduras o ensalada fresca, un cuarto con una buena fuente de proteína (huevo, pollo, pescado, frijol o tofu) y el último cuarto con tu carbohidrato complejo favorito (arroz integral, papa, plátano verde, arepa o quinua).'
      },
      {
        subtitle: 'Cocina una base y úsala en dos comidas',
        body: 'Si cocinas frijoles, lentejas o pollo a la plancha el domingo, ya tienes la mitad del almuerzo del lunes y el relleno para la cena del martes dentro de tu tiempo disponible de cocina.'
      }
    ]
  },
  {
    id: 'entender',
    title: 'Entender la nutrición',
    phrase: 'Carbohidratos, grasas, proteína, fibra y cómo leer etiquetas sin caer en trampas de marketing.',
    image: '/img/card-entiende.webp',
    alt: 'Ingredientes naturales que muestran fuentes de proteína, fibra, carbohidratos y grasas saludables',
    articles: [
      {
        subtitle: 'Carbohidratos y carga glucémica (Guía ADA)',
        body: 'No son el enemigo. La diferencia está en la velocidad a la que entran a tu sangre: la avena, el plátano verde, las legumbres y el arroz acompañado de verdura te dan energía estable sin picos de insulina.'
      },
      {
        subtitle: 'Proteína y Fibra: síntesis muscular y saciedad (Consenso ISSN)',
        body: 'Distribuir entre 0.35 y 0.45 g de proteína por kg de peso en cada comida (huevos, yogur natural, pescado, pollo, tofu o legumbres) y sumar 28–35 g de fibra vegetal al día frena los antojos de dulce.'
      },
      {
        subtitle: 'Grasas cardioprotectoras y perfil lipídico (AHA / DASH)',
        body: 'El aguacate Hass, el aceite de oliva virgen extra, las semillas de chía y pescados ricos en Omega-3 (trucha, jurel, salmón, sardina) protegen el endotelio vascular y mejoran el colesterol HDL.'
      },
      {
        subtitle: 'Cómo leer una etiqueta en 10 segundos (Clasificación NOVA)',
        body: 'Mira primero la lista de ingredientes: están ordenados de mayor a menor peso. Si el azúcar, jarabe de maíz, glutamato o harinas refinadas aparecen en los primeros tres lugares (NOVA 4), resérvalo solo para ocasiones puntuales.'
      }
    ]
  },
  {
    id: 'formas-comer-bien',
    title: 'Formas de comer bien',
    phrase: 'Crononutrición y hábitos sostenibles que respetan tus horarios y tu cultura.',
    image: '/img/card-sabores-pais.webp',
    alt: 'Mesa compartida con comida casera latinoamericana',
    articles: [
      {
        subtitle: 'El orden de ingesta reduce picos de glucosa (ADA)',
        body: 'Empezar por la ensalada o las verduras, seguir con la proteína y dejar el arroz, papa o pasta para el final crea una malla de fibra natural que reduce el pico glucémico posprandial entre un 30% y 40%.'
      },
      {
        subtitle: 'Crononutrición nocturna (Consenso ESPEN)',
        body: 'La sensibilidad a la insulina disminuye al caer la noche. Cenar ligero 2 a 3 horas antes de dormir priorizando proteína magra y vegetales mejora el descanso profundo y la oxidación de grasas.'
      }
    ]
  },
  {
    id: 'presupuesto',
    title: 'Comer bien con poco presupuesto',
    phrase: 'Los alimentos con mayor densidad de micronutrientes suelen estar en la plaza de mercado.',
    image: '/img/card-presupuesto.webp',
    alt: 'Frutas, verduras y legumbres frescas en plaza de mercado local',
    articles: [
      {
        subtitle: 'Sinergia Hierro + Vitamina C económica (Protocolo OMS/FAO)',
        body: 'Combinar lentejas o frijoles con guayaba, limón o pimentón fresco en el mismo almuerzo multiplica hasta por 3 la absorción del hierro vegetal sin gastar en suplementos costosos. Recuerda separar el café o té 60 minutos.'
      },
      {
        subtitle: 'Almidón resistente prebiótico local',
        body: 'Cocinar plátano verde, papa o arroz y dejarlos reposar/enfriar transforma parte de sus carbohidratos en almidón resistente que alimenta tu microbiota intestinal.'
      }
    ]
  }
];

const LEARN_FAQ = [
  {
    q: '¿Es obligatorio pesar la comida en gramos?',
    a: 'No. Los gramos en la app son una guía orientativa. Con el tiempo aprenderás a calcular a ojo usando la palma de tu mano para la proteína y el puño para los carbohidratos complejos.'
  },
  {
    q: '¿Qué significa NOVA 1 a 4 en el buscador de alimentos?',
    a: 'La clasificación NOVA mide qué tan procesado está un alimento: NOVA 1 son alimentos frescos del campo (frutas, huevos, carnes, granos) y NOVA 4 son ultraprocesados industriales.'
  },
  {
    q: '¿Por qué la IA me recomienda separar el café de las comidas principales?',
    a: 'Según las guías OMS/FAO, los taninos del café y el té pueden reducir la absorción del hierro de tus alimentos hasta en un 50% si se toman inmediatamente con el almuerzo.'
  },
  {
    q: '¿Qué hago si un día como de más en una celebración?',
    a: 'Disfrútalo sin culpa y al día siguiente retoma tu desayuno proteico y tu hidratación normal. Nunca compenses con ayunos castigadores.'
  }
];

export default function LearnPage() {
  const currentUser = useNutriStore(s => s.currentUser);
  const [activeCardId, setActiveCardId] = useState('entender');
  const [openFaq, setOpenFaq] = useState(0);

  const userProtocols = resolveUserClinicalProtocols(currentUser || {});

  return (
    <div>
      <div style={{ maxWidth: '760px', marginBottom: '26px' }}>
        <span
          style={{
            color: 'var(--accent-carrot)',
            fontWeight: 700,
            fontSize: '0.84rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          Biblioteca clínica y práctica de alimentación
        </span>
        <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.35rem)', marginTop: '4px', marginBottom: '8px' }}>
          Aprende a comer bien con base médica y científica
        </h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1rem' }}>
          Tu IA seleccionó los protocolos clínicos que aplican directamente a tu perfil, acompañados de guías prácticas inspiradas en OMS/FAO, ADA, AHA/DASH, ISSN, ESPEN y KDIGO.
        </p>
      </div>

      {/* PROTOCOLOS CLÍNICOS SELECCIONADOS AUTOMÁTICAMENTE POR LA IA PARA LA PERSONA */}
      <section className="ns-card ns-card-sage" style={{ padding: '22px', marginBottom: '28px' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--brand-leaf)', textTransform: 'uppercase' }}>
          Priorizado por tu IA según tus 13 respuestas del perfil
        </span>
        <h2 style={{ fontSize: '1.35rem', margin: '4px 0 12px 0' }}>
          Tu protocolo médico-nutricional de cabecera
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          {userProtocols.map(proto => (
            <div key={proto.id} className="ns-card" style={{ padding: '16px' }}>
              <div style={{ fontWeight: 700, color: 'var(--brand-leaf)', fontSize: '1.02rem' }}>
                {proto.label}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Respaldo: {proto.source}
              </div>
              <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                {proto.keyRules}
              </p>
              <div style={{ fontSize: '0.82rem', color: 'var(--accent-carrot)', fontWeight: 600 }}>
                Precaución clave: {proto.alertRule}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4 tarjetas grandes estilo T2DNetwork */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px',
          marginBottom: '32px'
        }}
      >
        {EDUCATIONAL_GUIDES.map(guide => {
          const isOpen = activeCardId === guide.id;
          return (
            <article
              key={guide.id}
              className="ns-card"
              style={{
                padding: 0,
                overflow: 'hidden',
                borderColor: isOpen ? 'var(--brand-leaf)' : 'var(--border-warm)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <img
                  src={guide.image}
                  alt={guide.alt}
                  style={{ width: '100%', height: '165px', objectFit: 'cover', display: 'block' }}
                />
                <div style={{ padding: '18px' }}>
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '6px' }}>{guide.title}</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: 0 }}>
                    {guide.phrase}
                  </p>
                </div>
              </div>
              <div style={{ padding: '0 18px 18px' }}>
                <button
                  type="button"
                  onClick={() => setActiveCardId(guide.id)}
                  className={`ns-btn ${isOpen ? 'ns-btn-leaf' : 'ns-btn-outline'} ns-btn-sm`}
                  style={{ width: '100%' }}
                >
                  {isOpen ? 'Viendo esta guía abajo ↓' : 'Leer guía completa'}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Contenido desplegado de la tarjeta activa */}
      {EDUCATIONAL_GUIDES.filter(g => g.id === activeCardId).map(guide => (
        <section
          key={guide.id}
          className="ns-card ns-card-organic ns-card-warm"
          style={{ padding: '28px', marginBottom: '36px' }}
        >
          <h2 style={{ fontSize: '1.6rem', marginBottom: '18px' }}>{guide.title}</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '18px'
            }}
          >
            {guide.articles.map(art => (
              <div key={art.subtitle} className="ns-card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '8px', color: 'var(--brand-leaf)' }}>
                  {art.subtitle}
                </h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                  {art.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Compendio de los 8 Protocolos Médicos Especializados */}
      <section style={{ marginBottom: '36px' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>
          Compendio de protocolos médicos especializados en NutriStudio
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          {MEDICAL_CONDITIONS.map(cond => (
            <div key={cond.id} className="ns-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--accent-earth)' }}>
                {cond.source}
              </div>
              <h3 style={{ fontSize: '1.05rem', margin: '4px 0 8px' }}>{cond.label}</h3>
              <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {cond.keyRules}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ en acordeón */}
      <section style={{ maxWidth: '820px' }}>
        <h2 style={{ fontSize: '1.55rem', marginBottom: '16px' }}>Preguntas frecuentes sobre nutrición diaria</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {LEARN_FAQ.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={item.q} className="ns-card" style={{ padding: '16px 20px' }}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                  aria-expanded={isOpen}
                  style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    textAlign: 'left',
                    fontWeight: 700,
                    fontSize: '1rem',
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  <span>{item.q}</span>
                  <span>{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && (
                  <p style={{ margin: '10px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.94rem' }}>
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
