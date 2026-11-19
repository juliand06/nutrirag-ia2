import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const savedLang =
  typeof window !== 'undefined' ? localStorage.getItem('nutristudio_lang') || 'es' : 'es';

const resources = {
  es: {
    translation: {
      brand: 'NutriStudio AI',
      nav: {
        summary: 'Seguimiento diario',
        meals: 'Comidas',
        chat: 'Asistente Nutricional',
        documents: 'Mis planes y guías',
        analytics: 'Mi Salud y Progreso',
        profile: 'Mi cuenta y metas',
        logout: 'Cerrar sesión',
        darkMode: 'Modo oscuro clínico',
        lightMode: 'Modo claro'
      },
      units: {
        metric: 'Métrico (kg / cm)',
        imperial: 'Imperial (lb / ft)'
      },
      landing: {
        badge: 'Nutrición clínica inteligente · Alimentos reales de tu país',
        heroTitleStart: 'Nutre tu cuerpo con ',
        heroTitleAccent: 'ciencia, color y precisión',
        heroTitleEnd: ', sin dietas imposibles.',
        heroLead:
          'Escanea productos, analiza tus platos con fotografía, sigue tu metabolismo adaptativo y recibe guía clínica diaria basada en guías OMS, ADA y DASH.',
        ctaStart: 'Empezar mi plan gratis →',
        ctaLogin: 'Ya tengo cuenta',
        freePlan: 'Plan Free',
        proPlan: 'Plan Pro Clínico',
        faqTitle: 'Preguntas frecuentes'
      },
      disclaimer: 'Orientación informativa; no reemplaza a un profesional.'
    }
  },
  en: {
    translation: {
      brand: 'NutriStudio AI',
      nav: {
        summary: 'Daily Tracking',
        meals: 'Meals',
        chat: 'Nutrition Coach',
        documents: 'My Plans & Guides',
        analytics: 'Health & Progress',
        profile: 'Account & Goals',
        logout: 'Sign out',
        darkMode: 'Clinical dark mode',
        lightMode: 'Light mode'
      },
      units: {
        metric: 'Metric (kg / cm)',
        imperial: 'Imperial (lb / ft)'
      },
      landing: {
        badge: 'Smart clinical nutrition · Local whole foods for your country',
        heroTitleStart: 'Nourish your body with ',
        heroTitleAccent: 'science, clarity & color',
        heroTitleEnd: ', no impossible diets.',
        heroLead:
          'Scan barcodes, analyze meals from photos, track your adaptive metabolism, and get daily guidance grounded in WHO, ADA, and DASH clinical guidelines.',
        ctaStart: 'Start my free plan →',
        ctaLogin: 'Sign in',
        freePlan: 'Free Plan',
        proPlan: 'Pro Clinical Plan',
        faqTitle: 'Frequently asked questions'
      },
      disclaimer: 'Informational guidance; does not replace a healthcare professional.'
    }
  }
};

i18n.use(initReactI18next).init({
  resources,
  lng: savedLang,
  fallbackLng: 'es',
  interpolation: {
    escapeValue: false
  }
});

export function formatWeight(weightKg, unitSystem = 'metric') {
  const w = Number(weightKg) || 0;
  if (unitSystem === 'imperial') {
    const lbs = (w * 2.20462).toFixed(1);
    return `${lbs} lb`;
  }
  return `${w} kg`;
}

export function formatHeight(heightCm, unitSystem = 'metric') {
  const h = Number(heightCm) || 0;
  if (unitSystem === 'imperial') {
    const totalInches = Math.round(h / 2.54);
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    return `${feet}'${inches}"`;
  }
  return `${h} cm`;
}

export default i18n;
