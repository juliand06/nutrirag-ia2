// Base de Datos Extensa de Alimentos (50+ alimentos globales y regionales)
// Inspira lo mejor de MyFitnessPal (buscador), Cronometer (micronutrientes),
// Yuka (puntaje de calidad 0-100 / Nutri-Score A-E / NOVA) y Eat This Much (menú automático IA).

export const FOOD_CATEGORIES = [
  'Todos',
  'Proteínas',
  'Carbohidratos',
  'Legumbres',
  'Frutas y Verduras',
  'Grasas Saludables',
  'Lácteos y Huevos',
  'Procesados (Comparar)'
];

export const DIET_PRESETS = [
  { id: 'equilibrada', label: 'Equilibrada / Mediterránea (OMS · AHA)' },
  { id: 'alta_proteina', label: 'Alta en Proteína / Recomposición (ISSN)' },
  { id: 'control_glucemico', label: 'Control Glucémico / Bajo IG (ADA)' },
  { id: 'economica_local', label: 'Económica con Productividad Local' },
  { id: 'vegetariana', label: 'Vegetariana rica en fibra y hierro' }
];

// Valores nutricionales por cada 100g (fuentes: USDA FoodData Central / FAO / tablas regionales)
export const GLOBAL_FOOD_DATABASE = [
  // PROTEÍNAS MAGRAS Y PESCADOS
  {
    id: 'fd-pollo',
    name: 'Pechuga de pollo a la plancha',
    category: 'Proteínas',
    regions: ['GLOBAL', 'CO', 'MX', 'PE', 'AR', 'CL', 'EC', 'ES', 'US'],
    defaultGrams: 150,
    kcal: 165, carbs: 0, protein: 31, fat: 3.6, fiber: 0, sugar: 0,
    sodiumMg: 74, potassiumMg: 256, ironMg: 1.0, calciumMg: 15, vitaminCMg: 0, omega3Mg: 70,
    qualityScore: 94, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Bajo',
    clinicalTag: 'Proteína magra · Apta ADA/DASH/ISSN'
  },
  {
    id: 'fd-salmon',
    name: 'Salmón al horno',
    category: 'Proteínas',
    regions: ['GLOBAL', 'CL', 'US', 'ES', 'PE'],
    defaultGrams: 150,
    kcal: 208, carbs: 0, protein: 20, fat: 13, fiber: 0, sugar: 0,
    sodiumMg: 59, potassiumMg: 363, ironMg: 0.8, calciumMg: 9, vitaminCMg: 0, omega3Mg: 2260,
    qualityScore: 96, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Bajo',
    clinicalTag: 'Ultra rico en Omega-3 · AHA/EASL'
  },
  {
    id: 'fd-trucha',
    name: 'Trucha arcoíris a la plancha',
    category: 'Proteínas',
    regions: ['CO', 'PE', 'EC', 'CL', 'GLOBAL'],
    defaultGrams: 150,
    kcal: 168, carbs: 0, protein: 24, fat: 7.2, fiber: 0, sugar: 0,
    sodiumMg: 52, potassiumMg: 448, ironMg: 0.7, calciumMg: 67, vitaminCMg: 0, omega3Mg: 1150,
    qualityScore: 95, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Bajo',
    clinicalTag: 'Plus local andino · Alto potasio y Omega-3'
  },
  {
    id: 'fd-jurel',
    name: 'Jurel o bonito fresco/al natural',
    category: 'Proteínas',
    regions: ['CL', 'PE', 'EC', 'MX', 'ES'],
    defaultGrams: 140,
    kcal: 158, carbs: 0, protein: 22, fat: 7.5, fiber: 0, sugar: 0,
    sodiumMg: 90, potassiumMg: 380, ironMg: 1.6, calciumMg: 40, vitaminCMg: 0, omega3Mg: 1850,
    qualityScore: 94, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Bajo',
    clinicalTag: 'Omega-3 económico · AHA/DASH'
  },
  {
    id: 'fd-sardina',
    name: 'Sardinas en aceite de oliva o agua (escurridas)',
    category: 'Proteínas',
    regions: ['ES', 'MX', 'PE', 'AR', 'GLOBAL'],
    defaultGrams: 100,
    kcal: 185, carbs: 0, protein: 24.6, fat: 9.5, fiber: 0, sugar: 0,
    sodiumMg: 307, potassiumMg: 397, ironMg: 2.9, calciumMg: 382, vitaminCMg: 0, omega3Mg: 1480,
    qualityScore: 91, nutriGrade: 'A', novaGroup: 3, glycemicIndex: 'Bajo',
    clinicalTag: 'Rica en calcio, hierro y Omega-3'
  },
  {
    id: 'fd-atun',
    name: 'Atún fresco o en agua (escurrido)',
    category: 'Proteínas',
    regions: ['EC', 'CO', 'MX', 'ES', 'US', 'GLOBAL'],
    defaultGrams: 120,
    kcal: 128, carbs: 0, protein: 28, fat: 1.1, fiber: 0, sugar: 0,
    sodiumMg: 247, potassiumMg: 237, ironMg: 1.3, calciumMg: 11, vitaminCMg: 0, omega3Mg: 270,
    qualityScore: 90, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Bajo',
    clinicalTag: 'Ultra magro · Ideal déficit calórico'
  },
  {
    id: 'fd-res-magra',
    name: 'Carne de res magra (lomo/nalga/peceto)',
    category: 'Proteínas',
    regions: ['AR', 'CO', 'MX', 'US', 'GLOBAL'],
    defaultGrams: 140,
    kcal: 158, carbs: 0, protein: 26, fat: 5.4, fiber: 0, sugar: 0,
    sodiumMg: 65, potassiumMg: 350, ironMg: 2.8, calciumMg: 12, vitaminCMg: 0, omega3Mg: 40,
    qualityScore: 87, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Bajo',
    clinicalTag: 'Hierro hemo + B12 · Protocolo anemia OMS'
  },
  {
    id: 'fd-pavo',
    name: 'Pechuga de pavo a la plancha',
    category: 'Proteínas',
    regions: ['US', 'ES', 'MX', 'GLOBAL'],
    defaultGrams: 150,
    kcal: 147, carbs: 0, protein: 30, fat: 2.1, fiber: 0, sugar: 0,
    sodiumMg: 70, potassiumMg: 293, ironMg: 1.1, calciumMg: 14, vitaminCMg: 0, omega3Mg: 30,
    qualityScore: 94, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Bajo',
    clinicalTag: 'Máxima proteína por caloría'
  },
  {
    id: 'fd-tofu',
    name: 'Tofu firme natural',
    category: 'Proteínas',
    regions: ['GLOBAL', 'US', 'ES', 'MX', 'CO'],
    defaultGrams: 150,
    kcal: 144, carbs: 2.8, protein: 15.8, fat: 8.7, fiber: 2.3, sugar: 0.6,
    sodiumMg: 14, potassiumMg: 237, ironMg: 2.7, calciumMg: 350, vitaminCMg: 0, omega3Mg: 580,
    qualityScore: 92, nutriGrade: 'A', novaGroup: 3, glycemicIndex: 'Bajo',
    clinicalTag: 'Proteína vegetal completa · Sin colesterol'
  },

  // LÁCTEOS Y HUEVOS
  {
    id: 'fd-huevo',
    name: 'Huevo entero cocido o revuelto (2 uds ~120g)',
    category: 'Lácteos y Huevos',
    regions: ['GLOBAL', 'CO', 'MX', 'PE', 'AR', 'CL', 'EC', 'ES', 'US'],
    defaultGrams: 120,
    kcal: 143, carbs: 0.8, protein: 12.6, fat: 9.5, fiber: 0, sugar: 0.4,
    sodiumMg: 142, potassiumMg: 138, ironMg: 1.8, calciumMg: 56, vitaminCMg: 0, omega3Mg: 80,
    qualityScore: 93, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Bajo',
    clinicalTag: 'Proteína de referencia biológica · Económico'
  },
  {
    id: 'fd-claras',
    name: 'Claras de huevo',
    category: 'Lácteos y Huevos',
    regions: ['GLOBAL'],
    defaultGrams: 120,
    kcal: 52, carbs: 0.7, protein: 10.9, fat: 0.2, fiber: 0, sugar: 0.7,
    sodiumMg: 166, potassiumMg: 163, ironMg: 0.1, calciumMg: 7, vitaminCMg: 0, omega3Mg: 0,
    qualityScore: 92, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Bajo',
    clinicalTag: 'Proteína pura baja en calorías'
  },
  {
    id: 'fd-yogur-griego',
    name: 'Yogur griego natural sin azúcar',
    category: 'Lácteos y Huevos',
    regions: ['GLOBAL', 'US', 'ES', 'CO', 'MX', 'AR', 'CL'],
    defaultGrams: 150,
    kcal: 73, carbs: 3.9, protein: 10.2, fat: 1.9, fiber: 0, sugar: 3.6,
    sodiumMg: 36, potassiumMg: 141, ironMg: 0.1, calciumMg: 110, vitaminCMg: 0, omega3Mg: 10,
    qualityScore: 93, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Bajo',
    clinicalTag: 'Probióticos + calcio · Salud digestiva'
  },
  {
    id: 'fd-queso-campesino',
    name: 'Queso fresco / campesino bajo en grasa',
    category: 'Lácteos y Huevos',
    regions: ['CO', 'MX', 'PE', 'EC', 'ES'],
    defaultGrams: 60,
    kcal: 195, carbs: 2.5, protein: 17, fat: 13, fiber: 0, sugar: 2,
    sodiumMg: 380, potassiumMg: 98, ironMg: 0.2, calciumMg: 480, vitaminCMg: 0, omega3Mg: 40,
    qualityScore: 81, nutriGrade: 'B', novaGroup: 3, glycemicIndex: 'Bajo',
    clinicalTag: 'Alto en calcio · Moderar si hay hipertensión'
  },
  {
    id: 'fd-cottage',
    name: 'Queso cottage bajo en grasa',
    category: 'Lácteos y Huevos',
    regions: ['US', 'ES', 'AR', 'CL', 'GLOBAL'],
    defaultGrams: 120,
    kcal: 82, carbs: 3.4, protein: 11.1, fat: 2.3, fiber: 0, sugar: 2.7,
    sodiumMg: 320, potassiumMg: 104, ironMg: 0.1, calciumMg: 83, vitaminCMg: 0, omega3Mg: 15,
    qualityScore: 86, nutriGrade: 'A', novaGroup: 3, glycemicIndex: 'Bajo',
    clinicalTag: 'Caseína de digestión lenta · Ideal cena'
  },

  // CARBOHIDRATOS COMPLEJOS Y TUBÉRCULOS
  {
    id: 'fd-avena',
    name: 'Avena integral en hojuelas (cruda)',
    category: 'Carbohidratos',
    regions: ['GLOBAL', 'CL', 'AR', 'CO', 'MX', 'ES', 'US'],
    defaultGrams: 50,
    kcal: 389, carbs: 66.3, protein: 16.9, fat: 6.9, fiber: 10.6, sugar: 1,
    sodiumMg: 2, potassiumMg: 429, ironMg: 4.7, calciumMg: 54, vitaminCMg: 0, omega3Mg: 110,
    qualityScore: 95, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Bajo',
    clinicalTag: 'Beta-glucanos · Reduce colesterol LDL (AHA)'
  },
  {
    id: 'fd-quinua',
    name: 'Quinua cocida',
    category: 'Carbohidratos',
    regions: ['PE', 'EC', 'CO', 'CL', 'GLOBAL'],
    defaultGrams: 130,
    kcal: 120, carbs: 21.3, protein: 4.4, fat: 1.9, fiber: 2.8, sugar: 0.9,
    sodiumMg: 7, potassiumMg: 172, ironMg: 1.5, calciumMg: 17, vitaminCMg: 0, omega3Mg: 80,
    qualityScore: 95, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Bajo',
    clinicalTag: '9 aminoácidos esenciales · Libre de gluten'
  },
  {
    id: 'fd-arroz-integral',
    name: 'Arroz integral cocido',
    category: 'Carbohidratos',
    regions: ['GLOBAL', 'CO', 'MX', 'PE', 'EC', 'ES', 'US'],
    defaultGrams: 140,
    kcal: 123, carbs: 25.6, protein: 2.7, fat: 1.0, fiber: 1.8, sugar: 0.2,
    sodiumMg: 4, potassiumMg: 86, ironMg: 0.6, calciumMg: 10, vitaminCMg: 0, omega3Mg: 14,
    qualityScore: 89, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Medio',
    clinicalTag: 'Energía sostenida · Combinar con fibra/proteína'
  },
  {
    id: 'fd-arroz-blanco',
    name: 'Arroz blanco cocido',
    category: 'Carbohidratos',
    regions: ['GLOBAL', 'CO', 'MX', 'PE', 'EC'],
    defaultGrams: 130,
    kcal: 130, carbs: 28.2, protein: 2.7, fat: 0.3, fiber: 0.4, sugar: 0.1,
    sodiumMg: 1, potassiumMg: 35, ironMg: 0.2, calciumMg: 10, vitaminCMg: 0, omega3Mg: 0,
    qualityScore: 76, nutriGrade: 'B', novaGroup: 1, glycemicIndex: 'Alto',
    clinicalTag: 'Digestión suave · Enfriar para almidón resistente'
  },
  {
    id: 'fd-platano-verde',
    name: 'Plátano verde cocido o asado',
    category: 'Carbohidratos',
    regions: ['CO', 'EC', 'PE', 'MX'],
    defaultGrams: 120,
    kcal: 116, carbs: 31, protein: 1.3, fat: 0.2, fiber: 2.3, sugar: 1.8,
    sodiumMg: 4, potassiumMg: 465, ironMg: 0.6, calciumMg: 3, vitaminCMg: 18, omega3Mg: 10,
    qualityScore: 91, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Bajo',
    clinicalTag: 'Almidón resistente prebiótico + alto potasio'
  },
  {
    id: 'fd-camote',
    name: 'Camote / Batata cocida o asada',
    category: 'Carbohidratos',
    regions: ['PE', 'US', 'AR', 'MX', 'CO', 'GLOBAL'],
    defaultGrams: 150,
    kcal: 86, carbs: 20.1, protein: 1.6, fat: 0.1, fiber: 3.0, sugar: 4.2,
    sodiumMg: 55, potassiumMg: 337, ironMg: 0.6, calciumMg: 30, vitaminCMg: 19.6, omega3Mg: 0,
    qualityScore: 94, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Bajo',
    clinicalTag: 'Betacarotenos + potasio · Ideal pre-entreno'
  },
  {
    id: 'fd-papa-criolla',
    name: 'Papa cocida con cáscara',
    category: 'Carbohidratos',
    regions: ['CO', 'PE', 'AR', 'CL', 'ES', 'GLOBAL'],
    defaultGrams: 150,
    kcal: 87, carbs: 20.1, protein: 1.9, fat: 0.1, fiber: 1.8, sugar: 0.9,
    sodiumMg: 5, potassiumMg: 379, ironMg: 0.3, calciumMg: 5, vitaminCMg: 13, omega3Mg: 0,
    qualityScore: 90, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Medio',
    clinicalTag: 'Mayor índice de saciedad natural · Alto potasio'
  },
  {
    id: 'fd-yuca',
    name: 'Yuca cocida',
    category: 'Carbohidratos',
    regions: ['CO', 'EC', 'PE', 'MX'],
    defaultGrams: 120,
    kcal: 159, carbs: 38, protein: 1.4, fat: 0.3, fiber: 1.8, sugar: 1.7,
    sodiumMg: 14, potassiumMg: 271, ironMg: 0.3, calciumMg: 16, vitaminCMg: 20.6, omega3Mg: 0,
    qualityScore: 84, nutriGrade: 'B', novaGroup: 1, glycemicIndex: 'Medio',
    clinicalTag: 'Energía sin gluten · Controlar porción en ADA'
  },
  {
    id: 'fd-tortilla-maiz',
    name: 'Tortilla de maíz nixtamalizado (3 pzas ~90g)',
    category: 'Carbohidratos',
    regions: ['MX', 'US', 'CO'],
    defaultGrams: 90,
    kcal: 218, carbs: 44.6, protein: 5.7, fat: 2.8, fiber: 6.3, sugar: 0.9,
    sodiumMg: 45, potassiumMg: 186, ironMg: 1.2, calciumMg: 81, vitaminCMg: 0, omega3Mg: 30,
    qualityScore: 91, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Bajo',
    clinicalTag: 'Calcio biodisponible + fibra · Plus mexicano'
  },
  {
    id: 'fd-arepa-integral',
    name: 'Arepa de maíz integral asada',
    category: 'Carbohidratos',
    regions: ['CO', 'EC'],
    defaultGrams: 90,
    kcal: 215, carbs: 42, protein: 5.2, fat: 2.4, fiber: 4.5, sugar: 1.1,
    sodiumMg: 120, potassiumMg: 130, ironMg: 1.1, calciumMg: 20, vitaminCMg: 0, omega3Mg: 15,
    qualityScore: 87, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Medio',
    clinicalTag: 'Sin gluten · Acompañar con huevo o queso'
  },
  {
    id: 'fd-pan-masa-madre',
    name: 'Pan integral de masa madre',
    category: 'Carbohidratos',
    regions: ['ES', 'AR', 'CL', 'US', 'GLOBAL'],
    defaultGrams: 60,
    kcal: 247, carbs: 43, protein: 11, fat: 3.4, fiber: 7.0, sugar: 3.2,
    sodiumMg: 400, potassiumMg: 248, ironMg: 2.5, calciumMg: 107, vitaminCMg: 0, omega3Mg: 30,
    qualityScore: 85, nutriGrade: 'A', novaGroup: 3, glycemicIndex: 'Bajo',
    clinicalTag: 'Fermentación natural · Mejor respuesta glucémica'
  },
  {
    id: 'fd-amaranto',
    name: 'Amaranto tostado o inflado',
    category: 'Carbohidratos',
    regions: ['MX', 'PE', 'EC'],
    defaultGrams: 30,
    kcal: 371, carbs: 65, protein: 13.6, fat: 7.0, fiber: 6.7, sugar: 1.7,
    sodiumMg: 4, potassiumMg: 508, ironMg: 7.6, calciumMg: 159, vitaminCMg: 4.2, omega3Mg: 42,
    qualityScore: 95, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Bajo',
    clinicalTag: 'Alto hierro, calcio y lisina'
  },

  // LEGUMBRES
  {
    id: 'fd-frijol-negro',
    name: 'Frijol negro o cargamanto cocido',
    category: 'Legumbres',
    regions: ['CO', 'MX', 'US', 'EC', 'GLOBAL'],
    defaultGrams: 130,
    kcal: 132, carbs: 23.7, protein: 8.9, fat: 0.5, fiber: 8.7, sugar: 0.3,
    sodiumMg: 1, potassiumMg: 355, ironMg: 2.1, calciumMg: 27, vitaminCMg: 0, omega3Mg: 90,
    qualityScore: 97, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Bajo',
    clinicalTag: 'Súper fibra + proteína económica · ADA/AHA'
  },
  {
    id: 'fd-lentejas',
    name: 'Lentejas cocidas',
    category: 'Legumbres',
    regions: ['GLOBAL', 'CO', 'PE', 'AR', 'CL', 'ES', 'MX'],
    defaultGrams: 140,
    kcal: 116, carbs: 20.1, protein: 9.0, fat: 0.4, fiber: 7.9, sugar: 1.8,
    sodiumMg: 2, potassiumMg: 369, ironMg: 3.3, calciumMg: 19, vitaminCMg: 1.5, omega3Mg: 37,
    qualityScore: 97, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Bajo',
    clinicalTag: 'Alto hierro + fibra · Combinar con vitamina C'
  },
  {
    id: 'fd-garbanzos',
    name: 'Garbanzos cocidos',
    category: 'Legumbres',
    regions: ['ES', 'AR', 'CL', 'MX', 'GLOBAL'],
    defaultGrams: 130,
    kcal: 164, carbs: 27.4, protein: 8.9, fat: 2.6, fiber: 7.6, sugar: 4.8,
    sodiumMg: 7, potassiumMg: 291, ironMg: 2.9, calciumMg: 49, vitaminCMg: 1.3, omega3Mg: 43,
    qualityScore: 96, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Bajo',
    clinicalTag: 'Pilar dieta mediterránea · Alta saciedad'
  },
  {
    id: 'fd-chochos',
    name: 'Chochos / Altramuz andino cocido',
    category: 'Legumbres',
    regions: ['EC', 'PE', 'CO'],
    defaultGrams: 100,
    kcal: 119, carbs: 9.9, protein: 15.6, fat: 2.9, fiber: 2.8, sugar: 0.5,
    sodiumMg: 4, potassiumMg: 245, ironMg: 1.2, calciumMg: 51, vitaminCMg: 1.1, omega3Mg: 130,
    qualityScore: 98, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Bajo',
    clinicalTag: 'Proteína vegetal récord · Muy bajo carbohidrato'
  },

  // FRUTAS Y VERDURAS
  {
    id: 'fd-brocoli',
    name: 'Brócoli al vapor',
    category: 'Frutas y Verduras',
    regions: ['GLOBAL'],
    defaultGrams: 120,
    kcal: 35, carbs: 7.2, protein: 2.4, fat: 0.4, fiber: 3.3, sugar: 1.4,
    sodiumMg: 41, potassiumMg: 293, ironMg: 0.7, calciumMg: 40, vitaminCMg: 64.9, omega3Mg: 110,
    qualityScore: 99, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Bajo',
    clinicalTag: 'Sulforafano + vitamina C · Orden ingesta ADA'
  },
  {
    id: 'fd-espinaca',
    name: 'Espinaca fresca o salteada',
    category: 'Frutas y Verduras',
    regions: ['GLOBAL'],
    defaultGrams: 100,
    kcal: 23, carbs: 3.6, protein: 2.9, fat: 0.4, fiber: 2.2, sugar: 0.4,
    sodiumMg: 79, potassiumMg: 558, ironMg: 2.7, calciumMg: 99, vitaminCMg: 28.1, omega3Mg: 138,
    qualityScore: 99, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Bajo',
    clinicalTag: 'Altísimo potasio + folato · Protocolo DASH'
  },
  {
    id: 'fd-nopal',
    name: 'Nopal cocido o asado',
    category: 'Frutas y Verduras',
    regions: ['MX', 'US'],
    defaultGrams: 120,
    kcal: 16, carbs: 3.3, protein: 1.3, fat: 0.1, fiber: 2.2, sugar: 1.1,
    sodiumMg: 21, potassiumMg: 257, ironMg: 0.6, calciumMg: 164, vitaminCMg: 9.3, omega3Mg: 10,
    qualityScore: 98, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Bajo',
    clinicalTag: 'Reduce pico de glucosa posprandial (ADA)'
  },
  {
    id: 'fd-zapallo',
    name: 'Zapallo / Calabaza al horno',
    category: 'Frutas y Verduras',
    regions: ['AR', 'CL', 'PE', 'CO', 'ES', 'GLOBAL'],
    defaultGrams: 150,
    kcal: 40, carbs: 9.5, protein: 1.0, fat: 0.1, fiber: 2.0, sugar: 2.2,
    sodiumMg: 4, potassiumMg: 352, ironMg: 0.7, calciumMg: 48, vitaminCMg: 21, omega3Mg: 0,
    qualityScore: 96, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Bajo',
    clinicalTag: 'Alto volumen saciante con pocas calorías'
  },
  {
    id: 'fd-guayaba',
    name: 'Guayaba fresca',
    category: 'Frutas y Verduras',
    regions: ['CO', 'MX', 'EC', 'PE'],
    defaultGrams: 120,
    kcal: 68, carbs: 14.3, protein: 2.6, fat: 1.0, fiber: 5.4, sugar: 8.9,
    sodiumMg: 2, potassiumMg: 417, ironMg: 0.3, calciumMg: 18, vitaminCMg: 228, omega3Mg: 112,
    qualityScore: 98, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Bajo',
    clinicalTag: '228mg Vitamina C (multiplica absorción hierro)'
  },
  {
    id: 'fd-banano',
    name: 'Banano / Plátano maduro (1 unidad ~100g)',
    category: 'Frutas y Verduras',
    regions: ['GLOBAL', 'CO', 'EC', 'PE', 'MX'],
    defaultGrams: 100,
    kcal: 89, carbs: 22.8, protein: 1.1, fat: 0.3, fiber: 2.6, sugar: 12.2,
    sodiumMg: 1, potassiumMg: 358, ironMg: 0.3, calciumMg: 5, vitaminCMg: 8.7, omega3Mg: 27,
    qualityScore: 92, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Medio',
    clinicalTag: 'Potasio natural · Excelente pre-entreno'
  },
  {
    id: 'fd-arandanos',
    name: 'Arándanos / Berries frescas o congeladas',
    category: 'Frutas y Verduras',
    regions: ['CL', 'PE', 'US', 'ES', 'GLOBAL'],
    defaultGrams: 80,
    kcal: 57, carbs: 14.5, protein: 0.7, fat: 0.3, fiber: 2.4, sugar: 10,
    sodiumMg: 1, potassiumMg: 77, ironMg: 0.3, calciumMg: 6, vitaminCMg: 9.7, omega3Mg: 58,
    qualityScore: 97, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Bajo',
    clinicalTag: 'Antocianinas neuroprotectoras · Bajo IG'
  },
  {
    id: 'fd-manzana',
    name: 'Manzana con cáscara',
    category: 'Frutas y Verduras',
    regions: ['GLOBAL', 'CL', 'AR', 'ES', 'US'],
    defaultGrams: 150,
    kcal: 52, carbs: 13.8, protein: 0.3, fat: 0.2, fiber: 2.4, sugar: 10.4,
    sodiumMg: 1, potassiumMg: 107, ironMg: 0.1, calciumMg: 6, vitaminCMg: 4.6, omega3Mg: 9,
    qualityScore: 95, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Bajo',
    clinicalTag: 'Pectina prebiótica · Control colesterol'
  },
  {
    id: 'fd-ensalada-mixta',
    name: 'Ensalada fresca (tomate, pepino, lechuga, pimiento)',
    category: 'Frutas y Verduras',
    regions: ['GLOBAL'],
    defaultGrams: 150,
    kcal: 20, carbs: 4.0, protein: 1.0, fat: 0.2, fiber: 1.6, sugar: 2.1,
    sodiumMg: 12, potassiumMg: 210, ironMg: 0.5, calciumMg: 22, vitaminCMg: 32, omega3Mg: 20,
    qualityScore: 99, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Bajo',
    clinicalTag: 'Consumir primero para reducir pico glucémico'
  },

  // GRASAS SALUDABLES Y SEMILLAS
  {
    id: 'fd-aguacate',
    name: 'Aguacate Hass / Palta',
    category: 'Grasas Saludables',
    regions: ['CO', 'MX', 'PE', 'CL', 'EC', 'US', 'ES', 'GLOBAL'],
    defaultGrams: 60,
    kcal: 160, carbs: 8.5, protein: 2.0, fat: 14.7, fiber: 6.7, sugar: 0.7,
    sodiumMg: 7, potassiumMg: 485, ironMg: 0.6, calciumMg: 12, vitaminCMg: 10, omega3Mg: 110,
    qualityScore: 96, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Bajo',
    clinicalTag: 'Grasa monoinsaturada + potasio · AHA/DASH'
  },
  {
    id: 'fd-aove',
    name: 'Aceite de oliva virgen extra (1 cda = 10g)',
    category: 'Grasas Saludables',
    regions: ['ES', 'AR', 'CL', 'US', 'GLOBAL'],
    defaultGrams: 10,
    kcal: 884, carbs: 0, protein: 0, fat: 100, fiber: 0, sugar: 0,
    sodiumMg: 2, potassiumMg: 1, ironMg: 0.6, calciumMg: 1, vitaminCMg: 0, omega3Mg: 760,
    qualityScore: 94, nutriGrade: 'A', novaGroup: 2, glycemicIndex: 'Bajo',
    clinicalTag: 'Polifenoles antiinflamatorios · EASL/AHA'
  },
  {
    id: 'fd-chia',
    name: 'Semillas de chía (1 cda = 15g)',
    category: 'Grasas Saludables',
    regions: ['MX', 'AR', 'PE', 'CO', 'GLOBAL'],
    defaultGrams: 15,
    kcal: 486, carbs: 42.1, protein: 16.5, fat: 30.7, fiber: 34.4, sugar: 0,
    sodiumMg: 16, potassiumMg: 407, ironMg: 7.7, calciumMg: 631, vitaminCMg: 1.6, omega3Mg: 17830,
    qualityScore: 98, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Bajo',
    clinicalTag: 'Récord en fibra soluble, calcio y Omega-3 ALA'
  },
  {
    id: 'fd-nueces',
    name: 'Nueces o almendras naturales (puñado = 25g)',
    category: 'Grasas Saludables',
    regions: ['CL', 'US', 'ES', 'AR', 'GLOBAL'],
    defaultGrams: 25,
    kcal: 615, carbs: 17, protein: 18, fat: 56, fiber: 9.5, sugar: 3.5,
    sodiumMg: 2, potassiumMg: 580, ironMg: 3.3, calciumMg: 180, vitaminCMg: 0, omega3Mg: 4500,
    qualityScore: 94, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Bajo',
    clinicalTag: 'Cardioprotector · Alta saciedad'
  },
  {
    id: 'fd-mani',
    name: 'Pasta de maní natural sin azúcar (1 cda = 15g)',
    category: 'Grasas Saludables',
    regions: ['AR', 'US', 'CO', 'MX', 'GLOBAL'],
    defaultGrams: 15,
    kcal: 588, carbs: 20, protein: 25, fat: 50, fiber: 6.0, sugar: 5.0,
    sodiumMg: 17, potassiumMg: 649, ironMg: 1.9, calciumMg: 43, vitaminCMg: 0, omega3Mg: 3,
    qualityScore: 89, nutriGrade: 'A', novaGroup: 1, glycemicIndex: 'Bajo',
    clinicalTag: 'Grasa saludable económica · Metabolismo rápido'
  },

  // PROCESADOS / ULTRAPROCESADOS (PARA COMPARACIÓN ESTILO YUKA)
  {
    id: 'fd-hamburguesa',
    name: 'Hamburguesa rápida con queso y salsa',
    category: 'Procesados (Comparar)',
    regions: ['GLOBAL'],
    defaultGrams: 220,
    kcal: 295, carbs: 24, protein: 17, fat: 14, fiber: 1.3, sugar: 5.5,
    sodiumMg: 680, potassiumMg: 210, ironMg: 2.3, calciumMg: 120, vitaminCMg: 1, omega3Mg: 40,
    qualityScore: 34, nutriGrade: 'D', novaGroup: 4, glycemicIndex: 'Alto',
    clinicalTag: 'Alerta Yuka: alto sodio y grasa saturada'
  },
  {
    id: 'fd-gaseosa',
    name: 'Bebida gaseosa azucarada (330 ml)',
    category: 'Procesados (Comparar)',
    regions: ['GLOBAL'],
    defaultGrams: 330,
    kcal: 42, carbs: 10.6, protein: 0, fat: 0, fiber: 0, sugar: 10.6,
    sodiumMg: 10, potassiumMg: 2, ironMg: 0, calciumMg: 2, vitaminCMg: 0, omega3Mg: 0,
    qualityScore: 12, nutriGrade: 'E', novaGroup: 4, glycemicIndex: 'Alto',
    clinicalTag: 'Alerta ADA/EASL/KDIGO: azúcar libre + fosfatos'
  },
  {
    id: 'fd-embutido',
    name: 'Salchicha o jamón ultraprocesado',
    category: 'Procesados (Comparar)',
    regions: ['GLOBAL'],
    defaultGrams: 80,
    kcal: 280, carbs: 3.5, protein: 12, fat: 24, fiber: 0, sugar: 1.5,
    sodiumMg: 980, potassiumMg: 190, ironMg: 1.1, calciumMg: 18, vitaminCMg: 0, omega3Mg: 20,
    qualityScore: 22, nutriGrade: 'E', novaGroup: 4, glycemicIndex: 'Bajo',
    clinicalTag: 'Alerta DASH/OMS: exceso crítico de sodio y nitritos'
  },
  {
    id: 'fd-galletas',
    name: 'Galletas rellenas ultraprocesadas',
    category: 'Procesados (Comparar)',
    regions: ['GLOBAL'],
    defaultGrams: 60,
    kcal: 485, carbs: 69, protein: 5.0, fat: 21, fiber: 2.0, sugar: 36,
    sodiumMg: 360, potassiumMg: 110, ironMg: 1.8, calciumMg: 24, vitaminCMg: 0, omega3Mg: 10,
    qualityScore: 18, nutriGrade: 'E', novaGroup: 4, glycemicIndex: 'Alto',
    clinicalTag: 'Alerta Yuka: 36% azúcar + harinas refinadas'
  }
];

export function scaleFoodPortion(food, grams) {
  const g = Math.max(1, Number(grams) || food.defaultGrams || 100);
  const factor = g / 100;
  const carbs = Math.round((Number(food.carbs) || 0) * factor);
  const fiber = Math.round((Number(food.fiber) || 0) * factor);
  const netCarbs = Math.max(0, carbs - fiber);
  const giNumeric =
    food.glycemicIndex === 'Alto' ? 74 : food.glycemicIndex === 'Medio' ? 56 : 36;
  const glycemicLoad = Number(((giNumeric * netCarbs) / 100).toFixed(1));

  return {
    grams: g,
    kcal: Math.round((Number(food.kcal) || 0) * factor),
    carbs,
    protein: Math.round((Number(food.protein) || 0) * factor),
    fat: Math.round((Number(food.fat) || 0) * factor),
    fiber,
    sugar: Math.round((Number(food.sugar) || 0) * factor),
    sodiumMg: Math.round((Number(food.sodiumMg) || 0) * factor),
    potassiumMg: Math.round((Number(food.potassiumMg) || 0) * factor),
    ironMg: Number(((Number(food.ironMg) || 0) * factor).toFixed(1)),
    calciumMg: Math.round((Number(food.calciumMg) || 0) * factor),
    vitaminCMg: Math.round((Number(food.vitaminCMg) || 0) * factor),
    omega3Mg: Math.round((Number(food.omega3Mg) || 0) * factor),
    glycemicLoad,
    glycemicIndex: food.glycemicIndex || 'Bajo',
    novaGroup: food.novaGroup || 1
  };
}

export function searchFoodDatabase({ query = '', category = 'Todos', countryId = 'CO' }) {
  const norm = s =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  const q = norm(query).trim();

  return GLOBAL_FOOD_DATABASE.filter(food => {
    const matchCat = category === 'Todos' || food.category === category;
    const matchQ =
      !q ||
      norm(food.name).includes(q) ||
      norm(food.clinicalTag).includes(q) ||
      norm(food.category).includes(q);
    return matchCat && matchQ;
  }).sort((a, b) => {
    const aLocal = a.regions.includes(countryId) ? 1 : 0;
    const bLocal = b.regions.includes(countryId) ? 1 : 0;
    if (bLocal !== aLocal) return bLocal - aLocal;
    return b.qualityScore - a.qualityScore;
  });
}

/**
 * Generador Automático de Menú Diario (estilo Eat This Much + Fitia + IA Clínica):
 * Arma 4 tiempos de comida calibrados a las calorías objetivo del usuario, estilo de dieta y país.
 */
export function generateDailyMenuFromDatabase({
  targetCalories = 2000,
  dietStyle = 'equilibrada',
  countryId = 'CO'
}) {
  const kcalGoal = Math.max(1300, Number(targetCalories) || 2000);
  const byId = id => GLOBAL_FOOD_DATABASE.find(f => f.id === id) || GLOBAL_FOOD_DATABASE[0];

  const templates = {
    equilibrada: {
      Desayuno: [
        { food: byId('fd-huevo'), grams: 120 },
        { food: byId(countryId === 'MX' ? 'fd-tortilla-maiz' : countryId === 'CO' ? 'fd-arepa-integral' : 'fd-avena'), grams: countryId === 'MX' || countryId === 'CO' ? 90 : 50 },
        { food: byId(countryId === 'CO' ? 'fd-guayaba' : 'fd-manzana'), grams: 120 }
      ],
      Almuerzo: [
        { food: byId(countryId === 'CO' ? 'fd-trucha' : countryId === 'CL' || countryId === 'PE' ? 'fd-jurel' : 'fd-pollo'), grams: 150 },
        { food: byId(countryId === 'PE' ? 'fd-quinua' : countryId === 'ES' ? 'fd-garbanzos' : 'fd-frijol-negro'), grams: 130 },
        { food: byId('fd-aguacate'), grams: 60 },
        { food: byId('fd-ensalada-mixta'), grams: 150 }
      ],
      Merienda: [
        { food: byId('fd-yogur-griego'), grams: 150 },
        { food: byId('fd-arandanos'), grams: 80 },
        { food: byId('fd-chia'), grams: 15 }
      ],
      Cena: [
        { food: byId('fd-pollo'), grams: 140 },
        { food: byId('fd-brocoli'), grams: 140 },
        { food: byId('fd-aove'), grams: 10 },
        { food: byId('fd-camote'), grams: 100 }
      ]
    },
    alta_proteina: {
      Desayuno: [
        { food: byId('fd-huevo'), grams: 120 },
        { food: byId('fd-claras'), grams: 120 },
        { food: byId('fd-avena'), grams: 50 }
      ],
      Almuerzo: [
        { food: byId('fd-pollo'), grams: 180 },
        { food: byId('fd-arroz-integral'), grams: 150 },
        { food: byId('fd-aguacate'), grams: 50 },
        { food: byId('fd-brocoli'), grams: 120 }
      ],
      Merienda: [
        { food: byId('fd-yogur-griego'), grams: 180 },
        { food: byId('fd-nueces'), grams: 25 }
      ],
      Cena: [
        { food: byId('fd-salmon'), grams: 160 },
        { food: byId('fd-espinaca'), grams: 120 },
        { food: byId('fd-papa-criolla'), grams: 130 }
      ]
    },
    control_glucemico: {
      Desayuno: [
        { food: byId('fd-huevo'), grams: 120 },
        { food: byId(countryId === 'MX' ? 'fd-nopal' : 'fd-espinaca'), grams: 120 },
        { food: byId('fd-aguacate'), grams: 60 }
      ],
      Almuerzo: [
        { food: byId('fd-ensalada-mixta'), grams: 160 },
        { food: byId('fd-pollo'), grams: 160 },
        { food: byId('fd-lentejas'), grams: 120 },
        { food: byId('fd-aove'), grams: 10 }
      ],
      Merienda: [
        { food: byId('fd-yogur-griego'), grams: 150 },
        { food: byId('fd-chia'), grams: 15 },
        { food: byId('fd-arandanos'), grams: 60 }
      ],
      Cena: [
        { food: byId('fd-trucha'), grams: 150 },
        { food: byId('fd-brocoli'), grams: 150 },
        { food: byId('fd-aguacate'), grams: 50 }
      ]
    },
    economica_local: {
      Desayuno: [
        { food: byId('fd-huevo'), grams: 120 },
        { food: byId('fd-avena'), grams: 55 },
        { food: byId('fd-banano'), grams: 100 }
      ],
      Almuerzo: [
        { food: byId('fd-frijol-negro'), grams: 160 },
        { food: byId(countryId === 'CO' || countryId === 'EC' ? 'fd-platano-verde' : 'fd-papa-criolla'), grams: 140 },
        { food: byId('fd-pollo'), grams: 120 },
        { food: byId('fd-ensalada-mixta'), grams: 140 }
      ],
      Merienda: [
        { food: byId(countryId === 'CO' ? 'fd-guayaba' : 'fd-manzana'), grams: 140 },
        { food: byId('fd-mani'), grams: 20 }
      ],
      Cena: [
        { food: byId('fd-lentejas'), grams: 150 },
        { food: byId('fd-huevo'), grams: 120 },
        { food: byId('fd-zapallo'), grams: 140 }
      ]
    },
    vegetariana: {
      Desayuno: [
        { food: byId('fd-yogur-griego'), grams: 160 },
        { food: byId('fd-avena'), grams: 55 },
        { food: byId('fd-chia'), grams: 15 },
        { food: byId('fd-arandanos'), grams: 80 }
      ],
      Almuerzo: [
        { food: byId('fd-tofu'), grams: 150 },
        { food: byId(countryId === 'EC' ? 'fd-chochos' : 'fd-garbanzos'), grams: 140 },
        { food: byId('fd-quinua'), grams: 120 },
        { food: byId('fd-aguacate'), grams: 60 }
      ],
      Merienda: [
        { food: byId('fd-nueces'), grams: 25 },
        { food: byId('fd-guayaba'), grams: 120 }
      ],
      Cena: [
        { food: byId('fd-lentejas'), grams: 160 },
        { food: byId('fd-brocoli'), grams: 140 },
        { food: byId('fd-aove'), grams: 10 },
        { food: byId('fd-huevo'), grams: 120 }
      ]
    }
  };

  const chosen = templates[dietStyle] || templates.equilibrada;

  // Calcular kcal base del template para escalar suavemente a la meta del usuario
  let rawTotalKcal = 0;
  Object.values(chosen).forEach(items => {
    items.forEach(item => {
      rawTotalKcal += scaleFoodPortion(item.food, item.grams).kcal;
    });
  });
  const scaleFactor = Math.max(0.75, Math.min(1.4, kcalGoal / Math.max(1, rawTotalKcal)));

  const meals = Object.entries(chosen).map(([mealType, items]) => {
    const scaledItems = items.map(item => {
      const targetG = Math.max(10, Math.round((item.grams * scaleFactor) / 5) * 5);
      const stats = scaleFoodPortion(item.food, targetG);
      return { food: item.food, ...stats };
    });

    const totals = scaledItems.reduce(
      (acc, it) => ({
        kcal: acc.kcal + it.kcal,
        carbs: acc.carbs + it.carbs,
        protein: acc.protein + it.protein,
        fat: acc.fat + it.fat,
        fiber: acc.fiber + it.fiber,
        sodiumMg: acc.sodiumMg + it.sodiumMg,
        potassiumMg: acc.potassiumMg + it.potassiumMg,
        vitaminCMg: acc.vitaminCMg + it.vitaminCMg,
        qualitySum: acc.qualitySum + it.food.qualityScore
      }),
      { kcal: 0, carbs: 0, protein: 0, fat: 0, fiber: 0, sodiumMg: 0, potassiumMg: 0, vitaminCMg: 0, qualitySum: 0 }
    );

    const avgQuality = Math.round(totals.qualitySum / Math.max(1, scaledItems.length));
    return {
      mealType,
      dishName: scaledItems.map(i => `${i.food.name.split('(')[0].trim()} (${i.grams}g)`).join(' + '),
      items: scaledItems,
      ...totals,
      avgQuality,
      nutriGrade: avgQuality >= 85 ? 'A' : avgQuality >= 70 ? 'B' : 'C'
    };
  });

  const dayTotals = meals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      carbs: acc.carbs + m.carbs,
      protein: acc.protein + m.protein,
      fat: acc.fat + m.fat,
      fiber: acc.fiber + m.fiber,
      sodiumMg: acc.sodiumMg + m.sodiumMg,
      potassiumMg: acc.potassiumMg + m.potassiumMg,
      vitaminCMg: acc.vitaminCMg + m.vitaminCMg,
      qualitySum: acc.qualitySum + m.avgQuality
    }),
    { kcal: 0, carbs: 0, protein: 0, fat: 0, fiber: 0, sodiumMg: 0, potassiumMg: 0, vitaminCMg: 0, qualitySum: 0 }
  );

  return {
    dietStyle,
    countryId,
    meals,
    dayTotals: {
      ...dayTotals,
      avgQuality: Math.round(dayTotals.qualitySum / Math.max(1, meals.length))
    }
  };
}
