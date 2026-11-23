// Base Nutricional Global y Protocolos Clínicos/Médicos (OMS, FAO, ADA, AHA/DASH, ISSN)
// + Motor de Memoria Personalizada del Agente IA ("Conoce a la persona y guía su proceso")

export const MEDICAL_CONDITIONS = [
  {
    id: 'resistencia_insulina_diabetes',
    label: 'Resistencia a la insulina / Prediabetes / Glucosa alta',
    source: 'Guía Clínica ADA (American Diabetes Association)',
    keyRules:
      'Aplica el orden de ingesta (vegetales/fibra primero, luego proteína/grasa, al final carbohidratos complejos). Prioriza carga glucémica baja, ≥30g fibra/día y caminata ligera de 10–15 min tras comidas principales.',
    alertRule: 'Evitar carbohidratos refinados aislados y bebidas azucaradas.'
  },
  {
    id: 'hipertension_cardiovascular',
    label: 'Hipertensión / Cuidado cardiovascular',
    source: 'Protocolo DASH & AHA (American Heart Association)',
    keyRules:
      'Mantén el sodio por debajo de 2,000 mg/día, aumenta potasio natural (aguacate, plátano, legumbres, espinaca), consume Omega-3 al menos 2–3 veces/semana y usa grasas monoinsaturadas.',
    alertRule: 'Limitar embutidos, salsas comerciales y ultraprocesados altos en sodio.'
  },
  {
    id: 'colesterol_trigliceridos',
    label: 'Colesterol LDL o Triglicéridos elevados',
    source: 'Guía AHA / OMS de Perfil Lipídico',
    keyRules:
      'Incorpora fibra soluble diaria (avena, frijoles, lentejas, chía, manzana) para atrapar colesterol biliar, sustituye grasas saturadas por aceite de oliva/aguacate/pescado azul y reduce azúcares simples.',
    alertRule: 'Controlar frituras, harinas refinadas y exceso de azúcares líquidos.'
  },
  {
    id: 'gastritis_digestion',
    label: 'Gastritis / Digestión sensible / Colon irritable',
    source: 'Guía Clínica de Nutrición Digestiva y Microbiota',
    keyRules:
      'Fracciona en porciones moderadas sin ayunos extremos, prioriza cocciones suaves (vapor, plancha, horno), almidón resistente (plátano verde/papa enfriada) y fermentados tolerados (yogur natural).',
    alertRule: 'Evitar comidas muy grasosas en la noche, exceso de picante, cafeína en ayunas y ultraprocesados.'
  },
  {
    id: 'anemia_fatiga',
    label: 'Anemia ferropénica / Baja energía o fatiga',
    source: 'Guía Global OMS / FAO de Micronutrientes',
    keyRules:
      'Combina fuentes de hierro (carnes magras, lentejas, frijoles, espinaca) con vitamina C (guayaba, limón, naranja, pimiento) en la misma comida para multiplicar la absorción hasta 3 veces.',
    alertRule: 'Separa el café o té al menos 60 minutos de las comidas ricas en hierro.'
  },
  {
    id: 'rendimiento_deportivo',
    label: 'Alto rendimiento deportivo / Hipertrofia',
    source: 'Consenso ISSN (International Society of Sports Nutrition)',
    keyRules:
      'Distribuye 1.6–2.2 g de proteína/kg en 3–4 tomas (~0.4 g/kg por comida), incluye carbohidratos complejos 60–90 min antes de entrenar y repón agua + electrolitos tras el esfuerzo.',
    alertRule: 'No entrenar en déficit severo ni descuidar la proteína post-entrenamiento.'
  },
  {
    id: 'higado_graso_metabolico',
    label: 'Hígado graso metabólico (MASLD / Esteatosis)',
    source: 'Guía Clínica EASL / ESPEN de Hepatología Nutricional',
    keyRules:
      'Objetivo clínico de reducción ponderal gradual del 7–10% si hay sobrepeso, eliminación de jarabes de fructosa/bebidas azucaradas, patrón mediterráneo con aceite de oliva, legumbres y Omega-3.',
    alertRule: 'Evitar alcohol, refrescos azucarados y harinas ultraprocesadas.'
  },
  {
    id: 'salud_renal_kdigo',
    label: 'Protección renal / Control de sodio, potasio y fósforo',
    source: 'Guía Clínica KDIGO (Kidney Disease: Improving Global Outcomes)',
    keyRules:
      'Limita sodio (<1,500–2,000 mg/día), evita aditivos fosfatados inorgánicos de ultraprocesados, modula proteína (0.8–1.0 g/kg/día salvo indicación de diálisis) y mantén hidratación y potasio supervisados por nefrología.',
    alertRule: 'Precedencia clínica máxima: no aplicar dietas hiperproteicas deportivas (ISSN) ni suplementos de potasio sin aval nefrológico.'
  },
  {
    id: 'hipotiroidismo_metabolico',
    label: 'Hipotiroidismo / Salud tiroidea y metabólica',
    source: 'Guía Clínica ATA / ETA (American & European Thyroid Association)',
    keyRules:
      'Asegura aporte óptimo de selenio, zinc y hierro con alimentos reales (huevo, pescado, legumbres, semillas), prioriza proteína saciante para proteger tasa metabólica basal y consume crucíferas (brócoli, coliflor) preferiblemente cocidas al vapor.',
    alertRule: 'Si tomas levotiroxina en ayunas, sepárala 45–60 min del café, leche de soya, fibra concentrada o suplementos de calcio/hierro.'
  },
  {
    id: 'sop_endocrino',
    label: 'Síndrome de Ovario Poliquístico (SOP) / Equilibrio hormonal',
    source: 'Consenso Internacional ESHRE / ASRM de SOP y Nutrición Endocrina',
    keyRules:
      'Combina control de carga glucémica (desayuno salado rico en proteína ≥25g), fuentes naturales de mio-inositol (legumbres, cítricos enteros, semillas), ácidos grasos Omega-3 antiinflamatorios y fibra prebiótica.',
    alertRule: 'Evitar desayunos basados en azúcares líquidos o harinas blancas que disparan la hiperinsulinemia ovárica.'
  },
  {
    id: 'enfermedad_celiaca_gluten',
    label: 'Enfermedad celíaca / Sensibilidad al gluten',
    source: 'Guía Clínica WGO / ESPGHAN de Celiaquía y Gastroenterología',
    keyRules:
      'Exclusión estricta de trigo, cebada, centeno y derivados (TACC). Prioriza carbohidratos naturalmente libres de gluten de alta densidad nutricional: quinua, amaranto, arroz integral, maíz nixtamalizado, yuca, papa y plátano.',
    alertRule: 'Vigilar trazas por contaminación cruzada en avena no certificada, salsas comerciales y empanizados.'
  }
];

/**
 * Base de Farmacovigilancia Alimento-Medicamento (Interacciones Clínicas Relevantes)
 * Permite a la IA advertir proactivamente cómo coordinar horarios de comidas con tratamientos comunes.
 */
export const CLINICAL_DRUG_NUTRIENT_INTERACTIONS = [
  {
    conditionId: 'resistencia_insulina_diabetes',
    medications: 'Metformina, Insulina o Sulfonilureas (Glibenclamida, Glimepirida)',
    interactionRule:
      'Con metformina: tómala junto con las comidas para reducir molestias gastrointestinales y vigila niveles de Vitamina B12 (huevo, pescado, carnes magras). Si usas insulina o sulfonilureas: no omitas comidas ni elimines de golpe todos los carbohidratos complejos para prevenir hipoglucemia (<70 mg/dL).',
    source: 'Farmacovigilancia Clínica ADA / FDA'
  },
  {
    conditionId: 'hipertension_cardiovascular',
    medications: 'IECA (Enalapril), ARA-II (Losartán, Valsartán) o Espironolactona',
    interactionRule:
      'Evita las "sales dietéticas" de supermercado a base de cloruro de potasio sin consultar a tu médico, ya que estos fármacos retienen potasio. Sazona con hierbas aromáticas, ajo, cebolla y limón natural.',
    source: 'Guía Farmacológica AHA / ACC'
  },
  {
    conditionId: 'colesterol_trigliceridos',
    medications: 'Estatinas (Atorvastatina, Simvastatina, Rosuvastatina) o Anticoagulantes (Warfarina)',
    interactionRule:
      'Con atorvastatina/simvastatina: evita el jugo de toronja (pomelo) porque inhibe la enzima CYP3A4. Si tomas warfarina: mantén una porción diaria constante de vegetales verdes (espinaca, brócoli) sin hacer cambios drásticos de un día para otro en tu ingesta de Vitamina K.',
    source: 'Consenso Clínico AHA / ESC de Lípidos y Anticoagulación'
  },
  {
    conditionId: 'hipotiroidismo_metabolico',
    medications: 'Levotiroxina sódica',
    interactionRule:
      'Tómala con agua pura 45 a 60 minutos antes del desayuno. El café expreso, el salvado de fibra, la soya y los suplementos de calcio o hierro reducen su absorción intestinal hasta en un 40% si se toman al mismo tiempo.',
    source: 'American Thyroid Association (ATA)'
  },
  {
    conditionId: 'anemia_fatiga',
    medications: 'Sulfato ferroso / Hierro oral',
    interactionRule:
      'Acompáñalo con vitamina C natural (guayaba, naranja, limonada sin azúcar) y sepáralo 2 horas de lácteos, café o té negro/verde, cuyos fitatos, taninos y calcio bloquean el transportador intestinal DMT1.',
    source: 'Guía OMS de Suplementación y Absorción de Hierro'
  }
];

/**
 * Documentos RAG Globales con evidencia médica y nutricional reconocida
 * que alimentan de forma permanente al motor RAG Híbrido.
 */
export const GLOBAL_MEDICAL_RAG_DOCUMENTS = [
  {
    id: 'doc-global-ada-glucosa',
    tenantId: 'reference',
    ownerUsername: 'sistema',
    fileName: 'Protocolo_Clinico_ADA_Glucosa_e_Insulina_Global.pdf',
    sha256Hash: 'global-med-ada-2026',
    totalPages: 3,
    totalChunks: 2,
    ocrApplied: false,
    embeddingModel: 'text-embedding-004',
    tempFileDeleted: true,
    indexingStatus: 'INDEXED',
    createdAt: '2026-11-19',
    chunks: [
      {
        id: 'chk-ada-1',
        pageNumber: 1,
        sectionTitle: 'Orden de Ingesta y Control de Picos Glucémicos (ADA)',
        chunkOrder: 1,
        tokenCount: 580,
        content:
          'En personas con resistencia a la insulina, prediabetes o diabetes tipo 2, consumir primero vegetales fibrosos, luego proteína y grasas saludables, y dejar los carbohidratos complejos para el final reduce los picos de glucosa posprandial entre un 30% y 40%. Acompañar las comidas con 25–35g de fibra diaria y caminar 10–15 minutos después de comer mejora significativamente la sensibilidad a la insulina.'
      },
      {
        id: 'chk-ada-2',
        pageNumber: 2,
        sectionTitle: 'Distribución de Carbohidratos y Carga Glucémica',
        chunkOrder: 2,
        tokenCount: 540,
        content:
          'Se recomienda reemplazar harinas refinadas y azúcares líquidos por legumbres (frijol, lenteja, garbanzo), avena integral, quinua y vegetales no amiláceos. Mantener una carga glucémica baja estabiliza el apetito, previene fatiga post-almuerzo y protege el metabolismo a largo plazo.'
      }
    ]
  },
  {
    id: 'doc-global-aha-dash',
    tenantId: 'reference',
    ownerUsername: 'sistema',
    fileName: 'Guia_Clinica_AHA_DASH_Cardiovascular_y_Lipidos.pdf',
    sha256Hash: 'global-med-aha-dash-2026',
    totalPages: 3,
    totalChunks: 2,
    ocrApplied: false,
    embeddingModel: 'text-embedding-004',
    tempFileDeleted: true,
    indexingStatus: 'INDEXED',
    createdAt: '2026-11-19',
    chunks: [
      {
        id: 'chk-dash-1',
        pageNumber: 1,
        sectionTitle: 'Protocolo DASH: Sodio, Potasio y Presión Arterial',
        chunkOrder: 1,
        tokenCount: 560,
        content:
          'El patrón alimentario DASH (AHA) recomienda mantener el sodio por debajo de 2,000 mg/día y elevar el potasio dietario (3,500–4,700 mg/día) mediante aguacate, legumbres, vegetales de hoja verde y frutas enteras. Este equilibrio ayuda a regular la presión arterial y reducir la retención de líquidos.'
      },
      {
        id: 'chk-dash-2',
        pageNumber: 2,
        sectionTitle: 'Control de Colesterol LDL y Triglicéridos',
        chunkOrder: 2,
        tokenCount: 530,
        content:
          'Para reducir colesterol LDL y triglicéridos, se priorizan beta-glucanos (avena), legumbres, ácidos grasos Omega-3 (sardina, jurel, salmón, trucha, chía) y grasas monoinsaturadas (aguacate, aceite de oliva virgen extra), minimizando ultraprocesados, grasas trans y azúcares añadidos.'
      }
    ]
  },
  {
    id: 'doc-global-oms-digestivo-micronutrientes',
    tenantId: 'reference',
    ownerUsername: 'sistema',
    fileName: 'Guia_Global_OMS_FAO_Micronutrientes_Digestion_y_ISSN.pdf',
    sha256Hash: 'global-med-oms-issn-2026',
    totalPages: 4,
    totalChunks: 2,
    ocrApplied: false,
    embeddingModel: 'text-embedding-004',
    tempFileDeleted: true,
    indexingStatus: 'INDEXED',
    createdAt: '2026-11-19',
    chunks: [
      {
        id: 'chk-oms-micro-1',
        pageNumber: 1,
        sectionTitle: 'Absorción de Hierro, Anemia y Salud Digestiva (OMS/FAO)',
        chunkOrder: 1,
        tokenCount: 590,
        content:
          'Para prevenir anemia y fatiga, la combinación de hierro vegetal o animal (lentejas, frijoles, carnes magras) con vitamina C (guayaba, cítricos, pimiento) multiplica la absorción de hierro; el café y el té deben separarse 60 minutos por sus taninos. Para gastritis y salud digestiva, se prefieren cocciones suaves, comidas fraccionadas, almidón resistente y alimentos fermentados naturales.'
      },
      {
        id: 'chk-issn-2',
        pageNumber: 3,
        sectionTitle: 'Rendimiento Deportivo, Proteína y Sueño Metabólico (ISSN)',
        chunkOrder: 2,
        tokenCount: 570,
        content:
          'Según el consenso ISSN, distribuir 0.35–0.45 g de proteína por kg de peso en 3–4 comidas optimiza la síntesis proteica muscular. Dormir menos de 7 horas eleva la grelina (hambre) y el cortisol, dificultando la pérdida de grasa y la recuperación; por ello el descanso y la hidratación (35 ml/kg) son pilares del proceso nutricional.'
      }
    ]
  },
  {
    id: 'doc-global-espen-kdigo-easl',
    tenantId: 'reference',
    ownerUsername: 'sistema',
    fileName: 'Protocolo_Especializado_ESPEN_KDIGO_EASL_Crononutricion.pdf',
    sha256Hash: 'global-med-espen-kdigo-easl-2026',
    totalPages: 4,
    totalChunks: 2,
    ocrApplied: false,
    embeddingModel: 'text-embedding-004',
    tempFileDeleted: true,
    indexingStatus: 'INDEXED',
    createdAt: '2026-11-19',
    chunks: [
      {
        id: 'chk-easl-kdigo-1',
        pageNumber: 1,
        sectionTitle: 'Hígado Graso (EASL) y Protección Renal (KDIGO)',
        chunkOrder: 1,
        tokenCount: 590,
        content:
          'En hígado graso metabólico (EASL/ESPEN), reducir bebidas azucaradas y fructosa añadida, priorizar Omega-3, legumbres y aceite de oliva logra revertir esteatosis hepática con pérdidas graduales de 7–10% del peso. En protección renal (KDIGO), eliminar fósforo inorgánico de ultraprocesados y controlar el sodio (<2g/día) protege la filtración glomerular.'
      },
      {
        id: 'chk-crono-2',
        pageNumber: 3,
        sectionTitle: 'Crononutrición Clínica y Ventanas Metabólicas (ESPEN)',
        chunkOrder: 2,
        tokenCount: 540,
        content:
          'La crononutrición demuestra que la sensibilidad a la insulina es mayor durante las primeras horas del día y disminuye en la noche. Concentrar mayor proporción calórica y carbohidratos complejos en desayuno y almuerzo, manteniendo cenas ligeras 2–3 horas antes de dormir, mejora la glucemia, la calidad del sueño y la recomposición corporal.'
      }
    ]
  },
  {
    id: 'doc-global-farmaco-nutriente-endocrino',
    tenantId: 'reference',
    ownerUsername: 'sistema',
    fileName: 'Guia_Farmacovigilancia_Nutricional_Endocrino_ATA_ESHRE.pdf',
    sha256Hash: 'global-med-farmaco-ata-eshre-2026',
    totalPages: 4,
    totalChunks: 2,
    ocrApplied: false,
    embeddingModel: 'text-embedding-004',
    tempFileDeleted: true,
    indexingStatus: 'INDEXED',
    createdAt: '2026-11-23',
    chunks: [
      {
        id: 'chk-farmaco-1',
        pageNumber: 1,
        sectionTitle: 'Interacciones Fármaco-Nutriente: Levotiroxina, Metformina, IECA/ARA-II y Warfarina',
        chunkOrder: 1,
        tokenCount: 620,
        content:
          'En hipotiroidismo (ATA), la levotiroxina debe tomarse en ayunas con agua y separarse 45–60 minutos de café, soya, fibra alta, calcio o hierro. En hipertensión tratada con IECA (enalapril) o ARA-II (losartán), se deben evitar sustitutos de sal con cloruro de potasio por riesgo de hiperpotasemia. En diabetes con metformina, se vigila la vitamina B12; con insulina o sulfonilureas nunca se omiten comidas para prevenir hipoglucemia (<70 mg/dL). Con warfarina se mantiene estable la porción diaria de hojas verdes ricas en vitamina K.'
      },
      {
        id: 'chk-endocrino-2',
        pageNumber: 3,
        sectionTitle: 'Nutrición en SOP (ESHRE), Celiaquía (WGO) y Prevención de Sarcopenia (ESPEN)',
        chunkOrder: 2,
        tokenCount: 580,
        content:
          'En Síndrome de Ovario Poliquístico (SOP), iniciar el día con desayuno salado proteico (≥25–30g proteína), fuentes naturales de mio-inositol (legumbres, semillas, cítricos enteros) y Omega-3 mejora la resistencia a la insulina y la ovulación. En enfermedad celíaca se excluye trigo, cebada y centeno (TACC), priorizando quinua, amaranto, maíz nixtamalizado, arroz integral y tubérculos locales.'
      }
    ]
  }
];

export function getActiveMedicalProtocols(conditionIds = []) {
  if (!Array.isArray(conditionIds) || conditionIds.length === 0) return [];
  return MEDICAL_CONDITIONS.filter(c => conditionIds.includes(c.id));
}

/**
 * Construye la Memoria Inteligente del Bot sobre la persona:
 * analiza su historial real de comidas, pesajes, hidratación, consultas y perfil clínico
 * para detectar patrones y guiar a la persona de forma proactiva.
 */
export function buildUserMemoryProfile({ userProfile, workspace, dailyTracking }) {
  const meals = workspace?.mealLogs || [];
  const weights = workspace?.weightHistory || [];
  const conversations = workspace?.conversations || [];
  const docs = workspace?.documents || [];
  const activeProtocols = getActiveMedicalProtocols(userProfile?.medicalConditions || []);

  // 1. Tendencia de peso real
  let weightTrendText = 'Sin historial suficiente de pesajes todavía.';
  if (weights.length >= 2) {
    const latest = Number(weights[0].weightKg || 0);
    const oldest = Number(weights[weights.length - 1].weightKg || 0);
    const diff = Number((latest - oldest).toFixed(1));
    if (diff < 0) {
      weightTrendText = `Tendencia a la baja: ${Math.abs(diff)} kg menos desde tu primer registro (${oldest} kg → ${latest} kg).`;
    } else if (diff > 0) {
      weightTrendText = `Tendencia al alza: +${diff} kg desde tu primer registro (${oldest} kg → ${latest} kg).`;
    } else {
      weightTrendText = `Peso estable en ${latest} kg a lo largo de ${weights.length} registros.`;
    }
  } else if (weights.length === 1) {
    weightTrendText = `Peso base registrado: ${weights[0].weightKg} kg (agrega nuevos controles semanales para medir tu evolución).`;
  }

  // 2. Patrones de alimentación detectados
  const recentMeals = meals.slice(0, 10);
  const avgMealKcal =
    recentMeals.length > 0
      ? Math.round(recentMeals.reduce((acc, m) => acc + (Number(m.totalCalories) || 0), 0) / recentMeals.length)
      : 0;
  const avgMealProtein =
    recentMeals.length > 0
      ? Math.round(recentMeals.reduce((acc, m) => acc + (Number(m.proteinGrams) || 0), 0) / recentMeals.length)
      : 0;
  const avgMealCarbs =
    recentMeals.length > 0
      ? Math.round(recentMeals.reduce((acc, m) => acc + (Number(m.carbsGrams) || 0), 0) / recentMeals.length)
      : 0;

  const favoriteDishes = [...new Set(recentMeals.map(m => m.dishName).filter(Boolean))].slice(0, 3);

  // 3. Insights y alertas proactivas ("el bot te conoce y se adelanta")
  const proactiveInsights = [];

  if (recentMeals.length > 0 && avgMealProtein < 22) {
    proactiveInsights.push(
      `Detecto que tus platos recientes promedian ${avgMealProtein}g de proteína. Subir a 25–35g por comida te dará mucha más saciedad y protegerá tu masa muscular.`
    );
  }
  if (
    activeProtocols.some(p => p.id === 'resistencia_insulina_diabetes') &&
    (avgMealCarbs > 55 || (dailyTracking?.consumedCarbs || 0) > (userProfile?.targetCarbs || 999))
  ) {
    proactiveInsights.push(
      'Alerta clínica (ADA): por tu enfoque de glucosa/insulina, te recomiendo comer primero vegetales y proteína antes de los carbohidratos y evitar superar tu cuota de carbohidratos netos.'
    );
  }
  if (activeProtocols.some(p => p.id === 'hipertension_cardiovascular')) {
    proactiveInsights.push(
      'Cuidado cardiovascular activo (DASH): prioriza sazonar con especias naturales, limón y hierbas en lugar de sal/salsas, e incluye alimentos ricos en potasio local.'
    );
  }
  if (activeProtocols.some(p => p.id === 'anemia_fatiga')) {
    proactiveInsights.push(
      'Protocolo de energía/hierro (OMS): acompaña tus legumbres o carnes con una fuente de vitamina C (guayaba, limón, naranja) y separa el café 1 hora.'
    );
  }
  if ((dailyTracking?.waterTodayMl || 0) < (userProfile?.waterGoalMl || 0) * 0.4 && (userProfile?.waterGoalMl || 0) > 0) {
    proactiveInsights.push(
      `Tu hidratación de hoy va en ${dailyTracking?.waterTodayMl || 0} ml de ${userProfile.waterGoalMl} ml. Tomar 1–2 vasos de agua ahora mejora tu metabolismo y evita confundir sed con hambre.`
    );
  }
  if (proactiveInsights.length === 0) {
    proactiveInsights.push(
      'Tu perfil clínico y metabólico está listo. Mientras más comidas, controles de peso y consultas registres, más preciso será mi acompañamiento diario.'
    );
  }

  // Nivel de conocimiento del bot sobre el usuario (0 a 100%)
  let knowledgeScore = 20;
  if (Number(userProfile?.dailyCalories || 0) > 0) knowledgeScore += 20;
  if (userProfile?.country && userProfile?.metabolismType) knowledgeScore += 15;
  if (activeProtocols.length > 0 || userProfile?.physicalNotes) knowledgeScore += 15;
  if (meals.length > 0) knowledgeScore += Math.min(15, meals.length * 5);
  if (weights.length > 0) knowledgeScore += 10;
  if (docs.length > 0 || conversations.length > 0) knowledgeScore += 5;
  knowledgeScore = Math.min(100, knowledgeScore);

  const memoryPromptSummary = [
    `Memoria acumulada del usuario (nivel de conocimiento ${knowledgeScore}%):`,
    `- Evolución de peso: ${weightTrendText}`,
    recentMeals.length > 0
      ? `- Historial alimenticio (${meals.length} platos): promedio por plato ${avgMealKcal} kcal, ${avgMealProtein}g proteína, ${avgMealCarbs}g carbohidratos. Platos frecuentes: ${favoriteDishes.join(', ')}.`
      : '- Aún no registra platos en su historial.',
    activeProtocols.length > 0
      ? `- Condiciones médicas/clínicas activas: ${activeProtocols.map(p => `${p.label} [${p.source}: ${p.keyRules}]`).join(' | ')}`
      : '- Sin condiciones médicas especiales seleccionadas.',
    `- Alertas proactivas actuales: ${proactiveInsights.join(' ')}`
  ].join('\n');

  return {
    knowledgeScore,
    weightTrendText,
    avgMealKcal,
    avgMealProtein,
    avgMealCarbs,
    favoriteDishes,
    activeProtocols,
    proactiveInsights,
    memoryPromptSummary,
    statsCount: {
      meals: meals.length,
      weights: weights.length,
      conversations: conversations.length,
      docs: docs.length
    }
  };
}
