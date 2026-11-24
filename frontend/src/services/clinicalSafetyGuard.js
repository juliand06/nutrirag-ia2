// Capa de Seguridad Clínica Obligatoria (Fase 3):
// Detecta y deriva inmediatamente a un profesional de la salud ante:
// - Embarazo / lactancia
// - Trastornos de la conducta alimentaria (TCA)
// - Diabetes tipo 1
// - Menores de edad (< 18 años)
// - Solicitudes de dietas extremas (< 1.200 kcal o déficits peligrosos)

export const MIN_SAFE_DAILY_KCAL = 1200;

function norm(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const SAFETY_RULES = [
  {
    code: 'PREGNANCY_LACTATION',
    regex: /\b(embaraz\w*|gestacion\w*|lactancia|amamant\w*|postparto|posparto)\b/,
    message:
      '💛 **Atención especial (Embarazo / Lactancia):** Durante el embarazo o la lactancia tus requerimientos de energía, hierro, ácido fólico, yodo y calcio cambian significativamente. Por seguridad, no generamos planes restrictivos en esta etapa; consulta siempre con tu obstetra o nutricionista clínico perinatal. *(Orientación informativa; no reemplaza a un profesional).*'
  },
  {
    code: 'EATING_DISORDER',
    // Evita falsos positivos como "quiero dejar de comer azúcar" o "no comer nada de lácteos"
    regex:
      /\b(anorexi\w*|bulimi\w*|purgar\w*|vomitar\s+despues\s+de\s+comer|laxantes\s+para\s+bajar|ayuno\s+de\s+[3-9]\s*dias|atracon\w*)\b|\b(no\s+comer\s+nada|dejar\s+de\s+comer)(?!\s+(de\s+)?(azucar|dulces?|lacteos?|leche|queso|carne|harinas?|pan|fritos?|sal|gaseosas?|ultraprocesados?|gluten|trigo))\b/,
    message:
      '💚 **Cuidado y apoyo profesional:** Si estás atravesando dificultades con la alimentación, restricción severa o culpa al comer, mereces acompañamiento cálido y especializado. Esta plataforma no sustituye apoyo médico ni psicológico; te invitamos a conversar con un profesional de salud o especialista en conducta alimentaria. *(Orientación informativa; no reemplaza a un profesional).*'
  },
  {
    code: 'TYPE_1_DIABETES',
    regex: /\b(diabetes\s+tipo\s*1|dm1|cetoacidosis|bomba\s+de\s+insulina|dosis\s+de\s+insulina|cuanta\s+insulina)\b/,
    message:
      '🩺 **Derivación clínica (Diabetes Tipo 1):** El manejo nutricional de la diabetes tipo 1 y el conteo de carbohidratos vinculado a dosis de insulina requieren supervisión directa de tu endocrinólogo y nutricionista educador en diabetes. Nunca ajustes tu insulina con base en una app. *(Orientación informativa; no reemplaza a un profesional).*'
  },
  {
    code: 'EXTREME_DEFICIT',
    regex: /\b(dieta\s+extrema|bajar\s+10\s+kilos\s+en\s+una\s+semana|dieta\s+de\s+[3-9]\d{2}\s*kcal)\b/,
    message:
      '🛡️ **Seguridad nutricional:** Por criterio médico internacional nunca recomendamos dietas por debajo de **1.200 kcal/día** ni déficits extremos, ya que provocan pérdida muscular, fatiga y efecto rebote. Podemos construir juntos un déficit saludable y sostenible (300–500 kcal por debajo de tu gasto) o consultar a un nutricionista. *(Orientación informativa; no reemplaza a un profesional).*'
  }
];

const WEIGHT_LOSS_INTENT_REGEX =
  /\b(deficit|adelgazar|bajar\s+de\s+peso|perder\s+peso|dieta\s+estricta|quemar\s+grasa|recortar\s+calorias)\b/;

export function evaluateClinicalSafety(query, userProfile = null) {
  const raw = norm(query);
  // Ignorar negaciones simples ("no estoy embarazada", "no tengo anorexia")
  const n = raw.replace(
    /\b(no\s+estoy|no\s+tengo|no\s+padezco|sin|nunca\s+tuve)\s+[a-z0-9_\s]+?(?=[,.;?!]|$)/g,
    ' '
  );

  // Detectar dietas diarias explícitas < 1200 kcal (sin bloquear preguntas sobre un plato/almuerzo individual de 500 kcal)
  const isSingleMealMention = /\b(desayuno|almuerzo|cena|merienda|plato|snack|batido|porcion)\b/.test(n);
  const kcalMatch = n.match(/\b(\d{3,4})\s*(kcal|calorias)\b/);
  if (kcalMatch && !isSingleMealMention) {
    const requested = Number(kcalMatch[1]);
    if (requested > 100 && requested < MIN_SAFE_DAILY_KCAL) {
      return {
        blocked: true,
        code: 'EXTREME_DEFICIT',
        referralMessage: SAFETY_RULES.find(r => r.code === 'EXTREME_DEFICIT').message
      };
    }
  }

  for (const rule of SAFETY_RULES) {
    if (rule.regex.test(n)) {
      return {
        blocked: true,
        code: rule.code,
        referralMessage: rule.message
      };
    }
  }

  // Protección basada en el PERFIL guardado (no solo en el texto de la pregunta):
  // Si el usuario marcó embarazo/lactancia, TCA o es menor de 18 años, bloqueamos peticiones de déficit/adelgazar
  // pero permitimos preguntas seguras (ej. ideas de comidas equilibradas, recetas o dudas educativas).
  const wantsRestriction = WEIGHT_LOSS_INTENT_REGEX.test(n);
  const conditions = Array.isArray(userProfile?.healthConditions)
    ? userProfile.healthConditions.map(norm)
    : [];

  if (wantsRestriction && conditions.includes('embarazo_lactancia')) {
    return {
      blocked: true,
      code: 'PREGNANCY_PROFILE_PROTECTION',
      referralMessage: SAFETY_RULES.find(r => r.code === 'PREGNANCY_LACTATION').message
    };
  }

  if (wantsRestriction && conditions.includes('tca')) {
    return {
      blocked: true,
      code: 'TCA_PROFILE_PROTECTION',
      referralMessage: SAFETY_RULES.find(r => r.code === 'EATING_DISORDER').message
    };
  }

  const age = Number(userProfile?.age || 0);
  if (age > 0 && age < 18 && wantsRestriction) {
    return {
      blocked: true,
      code: 'MINOR_PROTECTION',
      referralMessage:
        '🩺 **Protección para menores de 18 años:** En etapa de crecimiento y desarrollo no se deben aplicar dietas restrictivas ni déficits calóricos sin supervisión pediátrica o de un nutricionista infanto-juvenil. Puedo ayudarte con ideas de comidas nutritivas y variadas, pero consulta con tu pediatra para metas de peso. *(Orientación informativa; no reemplaza a un profesional).*'
    };
  }

  return { blocked: false, code: null, referralMessage: null };
}
