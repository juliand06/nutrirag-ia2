// Base de conocimiento de Productividad Alimenticia por País, Posibilidades (Presupuesto)
// y Factores Físicos / Metabólicos para acompañamiento activo en el proceso nutricional.

export const SEX_OPTIONS = [
  { id: 'femenino', label: 'Femenino', bmrOffset: -161 },
  { id: 'masculino', label: 'Masculino', bmrOffset: 5 },
  { id: 'no_especificado', label: 'Prefiero no indicar (promedio)', bmrOffset: -78 }
];

export const METABOLISM_OPTIONS = [
  {
    id: 'lento',
    label: 'Metabolismo lento (tendencia a almacenar energía)',
    factor: 0.92,
    carbsDelta: -0.05,
    proteinDelta: 0.05,
    strategy:
      'Prioriza proteína en cada comida (efecto térmico alto), carbohidratos complejos con fibra y evita largos periodos de sedentarismo tras comer.'
  },
  {
    id: 'equilibrado',
    label: 'Metabolismo equilibrado (gasto energético estándar)',
    factor: 1.0,
    carbsDelta: 0,
    proteinDelta: 0,
    strategy:
      'Mantén una distribución regular en 3 a 4 comidas balanceadas, combinando proteína magra, carbohidratos locales de absorción lenta y grasas saludables.'
  },
  {
    id: 'rapido',
    label: 'Metabolismo rápido (alto gasto calórico)',
    factor: 1.08,
    carbsDelta: 0.05,
    proteinDelta: -0.02,
    strategy:
      'Aprovecha alimentos densos en nutrientes y energía limpia (avena, plátano/camote, aguacate, legumbres y grasas saludables) sin saltarte tiempos de comida.'
  }
];

export const BUDGET_OPTIONS = [
  {
    id: 'economico',
    label: 'Económico (máximo valor nutricional por menor costo local)',
    description: 'Prioriza legumbres, huevo, tubérculos y frutas/verduras de alta producción nacional.'
  },
  {
    id: 'equilibrado',
    label: 'Equilibrado (canasta familiar variada de temporada)',
    description: 'Combina proteínas accesibles, cereales integrales, aguacate y carnes magras locales.'
  },
  {
    id: 'amplio',
    label: 'Amplio (incluye pescados azules, frutos secos y superalimentos)',
    description: 'Incorpora pescados ricos en Omega-3, semillas, lácteos proteicos y variedad completa.'
  }
];

export const COUNTRY_FOOD_CATALOG = {
  CO: {
    id: 'CO',
    name: 'Colombia',
    productivityFocus:
      'Alta productividad en plátano, yuca, papa criolla, frijol cargamanto, aguacate Hass, frutas tropicales (guayaba, papaya, banano), huevo y avicultura.',
    nutritionalPlus:
      'Excelente acceso todo el año a potasio, fibra soluble, vitamina C (guayaba aporta 4 veces más que la naranja), grasas monoinsaturadas (aguacate Hass) y proteína de alto valor biológico a bajo costo (huevo y legumbres).',
    foods: [
      {
        name: 'Huevo campesino (2 unidades / 120g)',
        tier: 'economico',
        kcal100g: 143,
        carbs100g: 1,
        protein100g: 12.6,
        fat100g: 9.5,
        plus: 'Proteína completa más económica y biodisponible del país.'
      },
      {
        name: 'Frijol cargamanto o lenteja cocida (100g)',
        tier: 'economico',
        kcal100g: 127,
        carbs100g: 22.8,
        protein100g: 8.7,
        fat100g: 0.5,
        plus: 'Alta fibra saciante y hierro vegetal; ideal para controlar glucosa.'
      },
      {
        name: 'Plátano verde o maduro cocido/asado (100g)',
        tier: 'economico',
        kcal100g: 116,
        carbs100g: 31,
        protein100g: 1.3,
        fat100g: 0.2,
        plus: 'En verde aporta almidón resistente prebiótico para la microbiota.'
      },
      {
        name: 'Guayaba fresca (100g)',
        tier: 'economico',
        kcal100g: 68,
        carbs100g: 14,
        protein100g: 2.6,
        fat100g: 1,
        plus: 'Plus local en vitamina C y fibra con muy baja carga glucémica.'
      },
      {
        name: 'Aguacate Hass colombiano (100g)',
        tier: 'equilibrado',
        kcal100g: 160,
        carbs100g: 8.5,
        protein100g: 2,
        fat100g: 14.7,
        plus: 'Grasa monoinsaturada cardioprotectora de producción local.'
      },
      {
        name: 'Trucha arcoíris o pechuga de pollo (100g)',
        tier: 'amplio',
        kcal100g: 165,
        carbs100g: 0,
        protein100g: 26,
        fat100g: 5.5,
        plus: 'Proteína magra alta en Omega-3 (trucha) para recuperación muscular.'
      }
    ],
    mealBlueprints: {
      desayuno: '2 huevos revueltos con tomate y cebolla + 1 arepa pequeña de maíz integral + 1 guayaba fresca.',
      almuerzo: 'Pechuga o trucha a la plancha (150g) + 120g de frijol o lenteja + 100g de plátano asado + ensalada con 50g de aguacate Hass.',
      merienda: 'Yogur griego o queso campesino bajo en grasa con banano o papaya picada.',
      cena: 'Trucha o pollo a la plancha (140g) + vegetales salteados + 60g de papa criolla o aguacate.'
    }
  },
  MX: {
    id: 'MX',
    name: 'México',
    productivityFocus:
      'Potencia mundial en aguacate, maíz nixtamalizado, frijol negro/pinto, nopal, jitomate, amaranto, chía y cítricos.',
    nutritionalPlus:
      'La nixtamalización del maíz aporta calcio altamente biodisponible; el nopal reduce picos de glucosa posprandial y el amaranto entrega proteína completa con lisina.',
    foods: [
      {
        name: 'Tortilla de maíz nixtamalizado (100g / ~3 pzas)',
        tier: 'economico',
        kcal100g: 218,
        carbs100g: 44,
        protein100g: 5.7,
        fat100g: 2.8,
        plus: 'Carbohidrato complejo local rico en calcio y fibra.'
      },
      {
        name: 'Frijol negro de la olla (100g)',
        tier: 'economico',
        kcal100g: 132,
        carbs100g: 23.7,
        protein100g: 8.9,
        fat100g: 0.5,
        plus: 'Sinergia proteica perfecta al combinarse con maíz.'
      },
      {
        name: 'Nopal asado o cocido (100g)',
        tier: 'economico',
        kcal100g: 16,
        carbs100g: 3.3,
        protein100g: 1.3,
        fat100g: 0.1,
        plus: 'Mucílago y fibra soluble que mejoran la sensibilidad a la insulina.'
      },
      {
        name: 'Amaranto tostado (100g)',
        tier: 'equilibrado',
        kcal100g: 371,
        carbs100g: 65,
        protein100g: 13.6,
        fat100g: 7,
        plus: 'Pseudocereal mexicano libre de gluten con aminoácidos esenciales.'
      },
      {
        name: 'Aguacate mexicano (100g)',
        tier: 'equilibrado',
        kcal100g: 160,
        carbs100g: 8.5,
        protein100g: 2,
        fat100g: 14.7,
        plus: 'Alta saciedad y grasas saludables de acceso directo.'
      },
      {
        name: 'Sardina o atún fresco / pollo (100g)',
        tier: 'amplio',
        kcal100g: 185,
        carbs100g: 0,
        protein100g: 25,
        fat100g: 8,
        plus: 'Omega-3 y vitamina D a excelente relación costo-beneficio.'
      }
    ],
    mealBlueprints: {
      desayuno: '2 huevos a la mexicana con nopales asados + 2 tortillas de maíz nixtamalizado.',
      almuerzo: 'Pechuga de pollo asada (150g) + 100g de frijol negro de la olla + ensalada de nopal, jitomate y 50g de aguacate.',
      merienda: 'Yogur natural con 2 cucharadas de amaranto y chía.',
      cena: 'Tacos de lechuga o 1 tortilla de maíz con pescado/pollo deshebrado, pico de gallo y aguacate.'
    }
  },
  PE: {
    id: 'PE',
    name: 'Perú',
    productivityFocus:
      'Líder en superalimentos andinos (quinua, kiwicha, tarwi), camote, palta, legumbres y pesca rica en Omega-3 (anchoveta, bonito, caballa).',
    nutritionalPlus:
      'Acceso directo a proteínas vegetales completas (quinua y tarwi) y pescados azules económicos con uno de los niveles más altos de EPA/DHA del mundo.',
    foods: [
      {
        name: 'Quinua cocida (100g)',
        tier: 'economico',
        kcal100g: 120,
        carbs100g: 21.3,
        protein100g: 4.4,
        fat100g: 1.9,
        plus: 'Contiene los 9 aminoácidos esenciales y bajo índice glucémico.'
      },
      {
        name: 'Camote sancochado (100g)',
        tier: 'economico',
        kcal100g: 86,
        carbs100g: 20,
        protein100g: 1.6,
        fat100g: 0.1,
        plus: 'Rico en betacarotenos y energía sostenida para actividad física.'
      },
      {
        name: 'Bonito o caballa fresca (100g)',
        tier: 'equilibrado',
        kcal100g: 168,
        carbs100g: 0,
        protein100g: 23.4,
        fat100g: 7.5,
        plus: 'Pescado azul local económico, antiinflamatorio y alto en Omega-3.'
      },
      {
        name: 'Palta (aguacate) peruana (100g)',
        tier: 'equilibrado',
        kcal100g: 160,
        carbs100g: 8.5,
        protein100g: 2,
        fat100g: 14.7,
        plus: 'Potasio y grasas saludables abundantes en el mercado local.'
      },
      {
        name: 'Lentejas o garbanzos cocidos (100g)',
        tier: 'economico',
        kcal100g: 116,
        carbs100g: 20,
        protein100g: 9,
        fat100g: 0.4,
        plus: 'Hierro, folato y fibra para energía estable.'
      }
    ],
    mealBlueprints: {
      desayuno: 'Bowl de quinua cocida con huevo sancochado o yogur + manzana y canela.',
      almuerzo: 'Filete de bonito o pollo a la plancha (150g) + 120g de quinua o camote + ensalada criolla con palta.',
      merienda: 'Kiwicha pop con yogur natural o fruta de estación.',
      cena: 'Pescado al vapor o tortilla de claras y verduras con 50g de palta.'
    }
  },
  AR: {
    id: 'AR',
    name: 'Argentina',
    productivityFocus:
      'Gran productividad en carnes magras, huevo, lácteos, calabaza/zapallo, legumbres, avena, maní y frutas cítricas.',
    nutritionalPlus:
      'Alta disponibilidad de proteínas completas (cortes magros, huevo, lácteos) y vegetales ricos en fibra y betacarotenos (zapallo anco, acelga).',
    foods: [
      {
        name: 'Zapallo / calabaza al horno (100g)',
        tier: 'economico',
        kcal100g: 40,
        carbs100g: 9.5,
        protein100g: 1,
        fat100g: 0.1,
        plus: 'Muy bajo en calorías, alto volumen saciante y vitamina A.'
      },
      {
        name: 'Huevo y cortes magros (nalga/peceto/pollo) (100g)',
        tier: 'equilibrado',
        kcal100g: 155,
        carbs100g: 0,
        protein100g: 26,
        fat100g: 4.5,
        plus: 'Hierro hemo, vitamina B12 y creatina natural.'
      },
      {
        name: 'Lentejas o garbanzos cocidos (100g)',
        tier: 'economico',
        kcal100g: 116,
        carbs100g: 20,
        protein100g: 9,
        fat100g: 0.4,
        plus: 'Base económica de fibra y proteína vegetal.'
      },
      {
        name: 'Avena arrollada (100g cruda)',
        tier: 'economico',
        kcal100g: 389,
        carbs100g: 66,
        protein100g: 16.9,
        fat100g: 6.9,
        plus: 'Beta-glucanos que reducen colesterol y estabilizan la energía.'
      },
      {
        name: 'Maní sin sal / pasta de maní natural (30g)',
        tier: 'equilibrado',
        kcal100g: 567,
        carbs100g: 16,
        protein100g: 25.8,
        fat100g: 49,
        plus: 'Grasa saludable económica producida localmente (ideal para metabolismo rápido).'
      }
    ],
    mealBlueprints: {
      desayuno: 'Panqueque de avena con 2 huevos + fruta cítrica o manzana.',
      almuerzo: 'Bife magro o pollo a la plancha (150g) + puré de zapallo anco + ensalada mixta con oliva.',
      merienda: 'Yogur natural con avena y 1 cucharada de pasta de maní sin azúcar.',
      cena: 'Omelette de 2 huevos y vegetales (espinaca/acelga) + ensalada fresca.'
    }
  },
  CL: {
    id: 'CL',
    name: 'Chile',
    productivityFocus:
      'Líder en pescados azules (jurel, salmón), palta, avena, legumbres (porotos, lentejas) y frutas antioxidantes (arándanos, manzanas).',
    nutritionalPlus:
      'El jurel chileno ofrece Omega-3 de altísima calidad a precio accesible, complementado con antioxidantes (berries) y fibra de avena y porotos.',
    foods: [
      {
        name: 'Jurel al natural o al horno (100g)',
        tier: 'economico',
        kcal100g: 158,
        carbs100g: 0,
        protein100g: 21,
        fat100g: 8,
        plus: 'Uno de los alimentos con mejor relación Omega-3/precio en Latinoamérica.'
      },
      {
        name: 'Porotos o lentejas cocidas (100g)',
        tier: 'economico',
        kcal100g: 127,
        carbs100g: 22.8,
        protein100g: 8.7,
        fat100g: 0.5,
        plus: 'Saciedad prolongada y control metabólico.'
      },
      {
        name: 'Avena integral chilena (100g cruda)',
        tier: 'economico',
        kcal100g: 389,
        carbs100g: 66,
        protein100g: 16.9,
        fat100g: 6.9,
        plus: 'Fibra soluble ideal para desayunos energéticos.'
      },
      {
        name: 'Palta Hass (100g)',
        tier: 'equilibrado',
        kcal100g: 160,
        carbs100g: 8.5,
        protein100g: 2,
        fat100g: 14.7,
        plus: 'Grasas monoinsaturadas y vitamina E.'
      },
      {
        name: 'Salmón y arándanos (100g salmón)',
        tier: 'amplio',
        kcal100g: 208,
        carbs100g: 0,
        protein100g: 20,
        fat100g: 13,
        plus: 'Combinación antiinflamatoria y neuroprotectora.'
      }
    ],
    mealBlueprints: {
      desayuno: 'Porridge de avena con yogur natural y arándanos o manzana.',
      almuerzo: 'Jurel o salmón al horno (150g) + porotos o quinoa + ensalada chilena con palta.',
      merienda: 'Huevo duro o yogur proteico con frutos rojos.',
      cena: 'Tortilla de verduras con pechuga de pollo o jurel + ensalada verde.'
    }
  },
  EC: {
    id: 'EC',
    name: 'Ecuador',
    productivityFocus:
      'Productividad destacada en plátano verde, chochos (altramuz andino), quinua, atún/pescado blanco, aguacate y frutas tropicales.',
    nutritionalPlus:
      'Los chochos son una joya nutricional local: altísima proteína vegetal (~15–18g cocidos) con casi cero carbohidratos de absorción rápida y alto calcio.',
    foods: [
      {
        name: 'Chochos (altramuz) cocidos (100g)',
        tier: 'economico',
        kcal100g: 119,
        carbs100g: 9.9,
        protein100g: 15.6,
        fat100g: 2.9,
        plus: 'Súper proteína vegetal local con bajísimo impacto glucémico.'
      },
      {
        name: 'Plátano verde cocido o asado (100g)',
        tier: 'economico',
        kcal100g: 116,
        carbs100g: 31,
        protein100g: 1.3,
        fat100g: 0.2,
        plus: 'Almidón resistente que mejora la salud intestinal y saciedad.'
      },
      {
        name: 'Atún o pescado blanco fresco (100g)',
        tier: 'equilibrado',
        kcal100g: 132,
        carbs100g: 0,
        protein100g: 28,
        fat100g: 1.3,
        plus: 'Proteína ultra magra de alta producción costera.'
      },
      {
        name: 'Aguacate y quinua (100g quinua cocida)',
        tier: 'equilibrado',
        kcal100g: 120,
        carbs100g: 21.3,
        protein100g: 4.4,
        fat100g: 1.9,
        plus: 'Energía limpia y minerales andinos.'
      }
    ],
    mealBlueprints: {
      desayuno: '2 huevos revueltos + porción moderada de verde cocido/asado + papaya.',
      almuerzo: 'Atún o pescado a la plancha (150g) + 100g de quinua + ensalada con chochos y aguacate.',
      merienda: 'Cevichocho ligero con tomate, limón y tostado moderado.',
      cena: 'Pescado blanco o pollo a la plancha con vegetales al vapor y aguacate.'
    }
  },
  ES: {
    id: 'ES',
    name: 'España',
    productivityFocus:
      'Referente mundial en dieta mediterránea: aceite de oliva virgen extra (AOVE), legumbres (garbanzos, lentejas), pescado azul (sardinas, caballa), huerta fresca y cítricos.',
    nutritionalPlus:
      'Polifenoles del AOVE, fibra prebiótica de legumbres y Omega-3 de pescado azul con respaldo clínico para longevidad y salud cardiovascular.',
    foods: [
      {
        name: 'Garbanzos o lentejas cocidas (100g)',
        tier: 'economico',
        kcal100g: 139,
        carbs100g: 22,
        protein100g: 8.9,
        fat100g: 2.1,
        plus: 'Base mediterránea económica de proteína vegetal y fibra.'
      },
      {
        name: 'Sardinas o caballa (100g)',
        tier: 'economico',
        kcal100g: 185,
        carbs100g: 0,
        protein100g: 24,
        fat100g: 10,
        plus: 'Ricas en Omega-3, vitamina D y calcio.'
      },
      {
        name: 'Aceite de oliva virgen extra - AOVE (10g / 1 cda)',
        tier: 'equilibrado',
        kcal100g: 884,
        carbs100g: 0,
        protein100g: 0,
        fat100g: 100,
        plus: 'Antioxidantes y ácido oleico antiinflamatorio.'
      },
      {
        name: 'Pechuga de pavo/pollo y huerta mediterránea (100g)',
        tier: 'equilibrado',
        kcal100g: 145,
        carbs100g: 0,
        protein100g: 29,
        fat100g: 2.5,
        plus: 'Proteína magra de rápida digestión.'
      }
    ],
    mealBlueprints: {
      desayuno: 'Tostada de pan integral con tomate rallado, 1 cda de AOVE y 2 huevos o queso fresco batido.',
      almuerzo: 'Ensalada templada de garbanzos (130g) con caballa o pechuga de pavo (140g), pimiento, tomate y AOVE.',
      merienda: 'Yogur natural sin azúcar con fruta de temporada y nueces.',
      cena: 'Sardinas o merluza a la plancha con verduras asadas (calabacín, berenjena, pimiento).'
    }
  },
  US: {
    id: 'US',
    name: 'Estados Unidos',
    productivityFocus:
      'Alta disponibilidad de avena integral, pechuga de pollo/pavo, huevos, batata (sweet potato), frijol negro, yogur griego y espinaca/berries congeladas.',
    nutritionalPlus:
      'Fácil acceso a lácteos altos en proteína (Greek yogurt, cottage cheese) y vegetales/berries congelados que conservan el 100% de sus micronutrientes a menor costo.',
    foods: [
      {
        name: 'Avena integral y frijol negro (100g frijol cocido)',
        tier: 'economico',
        kcal100g: 132,
        carbs100g: 23.7,
        protein100g: 8.9,
        fat100g: 0.5,
        plus: 'Fibra soluble y carbohidratos complejos de bajo costo.'
      },
      {
        name: 'Yogur griego 0% o 2% (150g)',
        tier: 'equilibrado',
        kcal100g: 73,
        carbs100g: 3.6,
        protein100g: 10,
        fat100g: 1.9,
        plus: 'Alta densidad proteica práctica para desayunos y meriendas.'
      },
      {
        name: 'Pechuga de pavo o pollo (100g)',
        tier: 'equilibrado',
        kcal100g: 165,
        carbs100g: 0,
        protein100g: 31,
        fat100g: 3.6,
        plus: 'Máxima proteína por caloría.'
      },
      {
        name: 'Salmón y berries congeladas (100g salmón)',
        tier: 'amplio',
        kcal100g: 208,
        carbs100g: 0,
        protein100g: 20,
        fat100g: 13,
        plus: 'Omega-3 y antioxidantes accesibles todo el año.'
      }
    ],
    mealBlueprints: {
      desayuno: 'Bowl de yogur griego (170g) con 45g de avena y berries congeladas.',
      almuerzo: 'Pechuga de pavo o pollo (150g) + 150g de sweet potato asada + espinaca y frijol negro.',
      merienda: 'Queso cottage o huevos cocidos con manzana.',
      cena: 'Salmón o pollo al horno con brócoli y espárragos al vapor.'
    }
  }
};

export const COUNTRY_OPTIONS = Object.values(COUNTRY_FOOD_CATALOG).map(c => ({
  id: c.id,
  name: c.name
}));

export function getCountryProfile(countryId) {
  return COUNTRY_FOOD_CATALOG[countryId] || COUNTRY_FOOD_CATALOG.CO;
}

export function getMetabolismProfile(metabolismId) {
  return METABOLISM_OPTIONS.find(m => m.id === metabolismId) || METABOLISM_OPTIONS[1];
}

export function getBudgetProfile(budgetId) {
  return BUDGET_OPTIONS.find(b => b.id === budgetId) || BUDGET_OPTIONS[1];
}

export function getSexProfile(sexId) {
  return SEX_OPTIONS.find(s => s.id === sexId) || SEX_OPTIONS[2];
}

/**
 * Construye un documento RAG dinámico con la productividad alimenticia del país del usuario
 * para que el motor híbrido (vector + léxico) lo recupere y cite en cada consulta.
 */
export function buildCountryRagDocument(countryId) {
  const country = getCountryProfile(countryId);
  const foodSummary = country.foods
    .map(
      f =>
        `${f.name}: ${f.kcal100g} kcal, ${f.carbs100g}g carbs, ${f.protein100g}g proteína, ${f.fat100g}g grasa (${f.plus})`
    )
    .join(' | ');

  return {
    id: `doc-pais-${country.id.toLowerCase()}`,
    tenantId: 'reference',
    ownerUsername: 'sistema',
    fileName: `Guia_Productividad_Alimenticia_${country.name.replace(/\s+/g, '_')}_2026.pdf`,
    sha256Hash: `country-prod-${country.id.toLowerCase()}-2026`,
    totalPages: 2,
    totalChunks: 2,
    ocrApplied: false,
    embeddingModel: 'text-embedding-004',
    tempFileDeleted: true,
    indexingStatus: 'INDEXED',
    createdAt: '2026-11-19',
    chunks: [
      {
        id: `chk-pais-${country.id.toLowerCase()}-1`,
        pageNumber: 1,
        sectionTitle: `1. Productividad Alimenticia y Plus Nutricionales de ${country.name}`,
        chunkOrder: 1,
        tokenCount: 540,
        content: `En ${country.name}, la productividad alimenticia destaca por: ${country.productivityFocus} Plus nutricional para los habitantes: ${country.nutritionalPlus}`
      },
      {
        id: `chk-pais-${country.id.toLowerCase()}-2`,
        pageNumber: 2,
        sectionTitle: `2. Tabla de Alimentos Locales Accesibles en ${country.name} (por 100g)`,
        chunkOrder: 2,
        tokenCount: 620,
        content: `Alimentos locales clave en ${country.name}: ${foodSummary}. Ejemplo de almuerzo local balanceado: ${country.mealBlueprints.almuerzo}`
      }
    ]
  };
}

/**
 * Calcula métricas físicas/metabólicas completas (TMB, GET, IMC) para el perfil del usuario.
 */
export function computeMetabolicMetrics(userProfile) {
  const w = Number(userProfile?.weightKg) || 0;
  const h = Number(userProfile?.heightCm) || 0;
  const a = Number(userProfile?.age) || 0;
  if (w <= 0 || h <= 0 || a <= 0) {
    return null;
  }

  const sex = getSexProfile(userProfile?.sex);
  const meta = getMetabolismProfile(userProfile?.metabolismType);
  const bmrRaw = 10 * w + 6.25 * h - 5 * a + sex.bmrOffset;
  const bmr = Math.max(950, Math.round(bmrRaw * meta.factor));

  const activityMult =
    userProfile?.activityLevel === 'sedentario'
      ? 1.2
      : userProfile?.activityLevel === 'ligero'
        ? 1.375
        : userProfile?.activityLevel === 'intenso'
          ? 1.725
          : 1.55;

  const tdee = Math.round(bmr * activityMult);
  const heightM = h / 100;
  const bmi = Number((w / (heightM * heightM)).toFixed(1));
  const bmiCategory =
    bmi < 18.5
      ? 'Bajo peso'
      : bmi < 25
        ? 'Peso saludable'
        : bmi < 30
          ? 'Sobrepeso'
          : 'Obesidad';

  return {
    bmr,
    tdee,
    bmi,
    bmiCategory,
    metabolismLabel: meta.label,
    metabolismStrategy: meta.strategy
  };
}

/**
 * Genera el acompañamiento activo de la IA EN EL PROCESO diario del usuario,
 * combinando país, presupuesto/posibilidades, metabolismo y avance real del día.
 */
export function buildProcessCoachPlan({ userProfile, dailyTracking }) {
  const country = getCountryProfile(userProfile?.country || 'CO');
  const budget = getBudgetProfile(userProfile?.budgetTier || 'equilibrado');
  const meta = getMetabolismProfile(userProfile?.metabolismType || 'equilibrado');
  const metrics = computeMetabolicMetrics(userProfile);

  const goalKcal = Number(userProfile?.dailyCalories || 0);
  const goalProtein = Number(userProfile?.targetProtein || 0);
  const goalWater = Number(userProfile?.waterGoalMl || 0);

  const consumedKcal = Number(dailyTracking?.consumedKcal || 0);
  const consumedProtein = Number(dailyTracking?.consumedProtein || 0);
  const waterTodayMl = Number(dailyTracking?.waterTodayMl || 0);
  const mealsCount = Number(dailyTracking?.mealsCount || 0);

  const remainingKcal = Math.max(0, goalKcal - consumedKcal);
  const remainingProtein = Math.max(0, goalProtein - consumedProtein);

  // Filtrar/priorizar alimentos del país según las posibilidades/presupuesto del usuario
  const allowedTiers =
    budget.id === 'economico'
      ? ['economico']
      : budget.id === 'equilibrado'
        ? ['economico', 'equilibrado']
        : ['economico', 'equilibrado', 'amplio'];

  const localFoods = country.foods.filter(f => allowedTiers.includes(f.tier));
  const prioritizedFoods = localFoods.length > 0 ? localFoods : country.foods.slice(0, 4);

  // Determinar etapa actual del proceso diario
  let stageBadge = 'Inicio del proceso';
  let nextActionTitle = 'Configura tu perfil físico, país y metabolismo';
  let nextActionDetail =
    'Para acompañarte en tu proceso diario con alimentos accesibles de tu país, ingresa tu peso, estatura, país y tipo de metabolismo en "Mi cuenta y metas".';
  let suggestedMealSlot = 'desayuno';

  if (goalKcal > 0) {
    if (mealsCount === 0) {
      stageBadge = 'Paso 1 · Arranque del día';
      suggestedMealSlot = 'desayuno';
      nextActionTitle = `Inicia tu día con proteína local de ${country.name}`;
      nextActionDetail = `Tienes ${remainingKcal} kcal y ${remainingProtein}g de proteína disponibles hoy. Con tu ${meta.label.split('(')[0].trim().toLowerCase()}, te conviene empezar con un desayuno saciante: ${country.mealBlueprints.desayuno}`;
    } else if (remainingKcal > goalKcal * 0.45) {
      stageBadge = 'Paso 2 · Comida principal';
      suggestedMealSlot = 'almuerzo';
      nextActionTitle = `Construye tu almuerzo aprovechando el plus de ${country.name}`;
      nextActionDetail = `Te restan ${remainingKcal} kcal y ${remainingProtein}g de proteína. Sugerencia adaptada a tu presupuesto (${budget.id}): ${country.mealBlueprints.almuerzo}`;
    } else if (remainingKcal > 250) {
      stageBadge = 'Paso 3 · Cierre inteligente del día';
      suggestedMealSlot = 'cena';
      nextActionTitle = 'Cierra tu jornada protegiendo tu metabolismo nocturno';
      nextActionDetail = `Te quedan ${remainingKcal} kcal y ${remainingProtein}g de proteína. Prioriza cena ligera con proteína y vegetales locales: ${country.mealBlueprints.cena}`;
    } else {
      stageBadge = 'Meta diaria alcanzada';
      suggestedMealSlot = 'merienda';
      nextActionTitle = '¡Excelente cumplimiento en tu proceso de hoy!';
      nextActionDetail = `Has cubierto tu meta de ${goalKcal} kcal. Enfócate en completar tu hidratación (${waterTodayMl}/${goalWater} ml) y descansar bien para optimizar tu metabolismo.`;
    }
  }

  const checklist = [
    {
      label: `Perfil físico, país (${country.name}) y metabolismo configurados`,
      done: goalKcal > 0 && Boolean(userProfile?.country)
    },
    {
      label: `Al menos 1 comida registrada hoy (${mealsCount} registradas)`,
      done: mealsCount > 0
    },
    {
      label: `Proteína en camino (≥50% de ${goalProtein || 0}g diarios)`,
      done: goalProtein > 0 && consumedProtein >= goalProtein * 0.5
    },
    {
      label: `Hidratación activa (≥50% de ${goalWater || 0} ml)`,
      done: goalWater > 0 && waterTodayMl >= goalWater * 0.5
    }
  ];

  return {
    country,
    budget,
    meta,
    metrics,
    stageBadge,
    nextActionTitle,
    nextActionDetail,
    suggestedMealSlot,
    suggestedMealText: country.mealBlueprints[suggestedMealSlot],
    prioritizedFoods: prioritizedFoods.slice(0, 4),
    checklist
  };
}
