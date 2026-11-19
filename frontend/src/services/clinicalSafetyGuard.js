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
    triggers: ['embaraz', 'gestacion', 'lactancia', 'amamant', 'postparto'],
    message:
      '💛 **Atención especial (Embarazo / Lactancia):** Durante el embarazo o la lactancia tus requerimientos de energía, hierro, ácido fólico, yodo y calcio cambian significativamente. Por seguridad, no generamos planes restrictivos en esta etapa; consulta siempre con tu obstetra o nutricionista clínico perinatal. *(Orientación informativa; no reemplaza a un profesional).*'
  },
  {
    code: 'EATING_DISORDER',
    triggers: [
      'anorexia', 'bulimia', 'purgar', 'vomitar despues de comer', 'laxantes para bajar',
      'no comer nada', 'dejar de comer', 'ayuno de 7 dias', 'ayuno de 5 dias', 'atracon'
    ],
    message:
      '💚 **Cuidado y apoyo profesional:** Si estás atravesando dificultades con la alimentación, restricción severa o culpa al comer, mereces acompañamiento cálido y especializado. Esta plataforma no sustituye apoyo médico ni psicológico; te invitamos a conversar con un profesional de salud o especialista en conducta alimentaria. *(Orientación informativa; no reemplaza a un profesional).*'
  },
  {
    code: 'TYPE_1_DIABETES',
    triggers: ['diabetes tipo 1', 'dm1', 'cetoacidosis', 'bomba de insulina', 'dosis de insulina'],
    message:
      '🩺 **Derivación clínica (Diabetes Tipo 1):** El manejo nutricional de la diabetes tipo 1 y el conteo de carbohidratos vinculado a dosis de insulina requieren supervisión directa de tu endocrinólogo y nutricionista educador en diabetes. Nunca ajustes tu insulina con base en una app. *(Orientación informativa; no reemplaza a un profesional).*'
  },
  {
    code: 'EXTREME_DEFICIT',
    triggers: ['500 kcal', '600 kcal', '700 kcal', '800 kcal', '900 kcal', '1000 kcal', '1.000 kcal', 'dieta extrema', 'bajar 10 kilos en una semana'],
    message:
      '🛡️ **Seguridad nutricional:** Por criterio médico internacional nunca recomendamos dietas por debajo de **1.200 kcal/día** ni déficits extremos, ya que provocan pérdida muscular, fatiga y efecto rebote. Podemos construir juntos un déficit saludable y sostenible (300–500 kcal por debajo de tu gasto) o consultar a un nutricionista. *(Orientación informativa; no reemplaza a un profesional).*'
  }
];

export function evaluateClinicalSafety(query, userProfile = null) {
  const n = norm(query);

  // Detectar números explícitos < 1200 kcal en la consulta
  const kcalMatch = n.match(/\b(\d{3,4})\s*(kcal|calorias)\b/);
  if (kcalMatch) {
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
    if (rule.triggers.some(t => n.includes(t))) {
      return {
        blocked: true,
        code: rule.code,
        referralMessage: rule.message
      };
    }
  }

  // Protección a menores de edad (< 18 años) ante consultas de déficit/adelgazar
  const age = Number(userProfile?.age || 0);
  if (
    (age > 0 && age < 18) &&
    (n.includes('deficit') || n.includes('adelgazar') || n.includes('bajar de peso') || n.includes('dieta estricta'))
  ) {
    return {
      blocked: true,
      code: 'MINOR_PROTECTION',
      referralMessage:
        '🩺 **Protección para menores de 18 años:** En etapa de crecimiento y desarrollo no se deben aplicar dietas restrictivas ni déficits calóricos sin supervisión pediátrica o de un nutricionista infanto-juvenil. Enfócate en alimentación variada, actividad física y consulta con tu pediatra. *(Orientación informativa; no reemplaza a un profesional).*'
    };
  }

  return { blocked: false, code: null, referralMessage: null };
}
