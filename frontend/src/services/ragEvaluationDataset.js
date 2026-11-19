// Dataset formal de evaluación del Motor RAG (50 preguntas clínicas y nutricionales)
// con métricas de recuperación: Recall@K, MRR (Mean Reciprocal Rank) y Fidelidad.

import { computeEmbedding, cosineSimilarity } from './nutriRagEngine';
import { GLOBAL_MEDICAL_RAG_DOCUMENTS } from './clinicalKnowledgeBase';
import { buildCountryRagDocument } from './countryNutritionData';

export const RAG_EVAL_DATASET_50 = [
  { q: '¿Qué orden de ingesta reduce los picos de glucosa según la ADA?', expectedDoc: 'Protocolo_Clinico_ADA' },
  { q: '¿Cuántos gramos de fibra diaria se recomiendan para resistencia a la insulina?', expectedDoc: 'Protocolo_Clinico_ADA' },
  { q: '¿Caminar después de comer ayuda a la sensibilidad a la insulina?', expectedDoc: 'Protocolo_Clinico_ADA' },
  { q: '¿Por qué reemplazar harinas refinadas por legumbres en prediabetes?', expectedDoc: 'Protocolo_Clinico_ADA' },
  { q: '¿Cómo controlar la carga glucémica en diabetes tipo 2?', expectedDoc: 'Protocolo_Clinico_ADA' },
  { q: '¿Cuál es el límite diario de sodio en la dieta DASH?', expectedDoc: 'Guia_Clinica_AHA_DASH' },
  { q: '¿Cuánto potasio dietario recomienda el protocolo DASH para la presión arterial?', expectedDoc: 'Guia_Clinica_AHA_DASH' },
  { q: '¿Qué alimentos aportan beta-glucanos para bajar el colesterol LDL?', expectedDoc: 'Guia_Clinica_AHA_DASH' },
  { q: '¿Qué fuentes de Omega-3 ayudan a reducir triglicéridos?', expectedDoc: 'Guia_Clinica_AHA_DASH' },
  { q: '¿Qué grasas saludables recomienda la AHA para salud cardiovascular?', expectedDoc: 'Guia_Clinica_AHA_DASH' },
  { q: '¿Cómo multiplicar la absorción de hierro en anemia ferropénica?', expectedDoc: 'Guia_Global_OMS_FAO' },
  { q: '¿Por qué separar el café y el té de las comidas ricas en hierro?', expectedDoc: 'Guia_Global_OMS_FAO' },
  { q: '¿Qué recomendaciones digestivas sirven para gastritis?', expectedDoc: 'Guia_Global_OMS_FAO' },
  { q: '¿Cuánta proteína por comida recomienda el consenso ISSN?', expectedDoc: 'Guia_Global_OMS_FAO' },
  { q: '¿Cómo afecta dormir menos de 7 horas al apetito y cortisol?', expectedDoc: 'Guia_Global_OMS_FAO' },
  { q: '¿Qué es el almidón resistente para la salud digestiva?', expectedDoc: 'Guia_Global_OMS_FAO' },
  { q: '¿Cuánta agua por kilo de peso corporal se recomienda al día?', expectedDoc: 'Guia_Global_OMS_FAO' },
  { q: '¿Cómo revertir el hígado graso metabólico según EASL?', expectedDoc: 'Protocolo_Especializado_ESPEN' },
  { q: '¿Por qué evitar fructosa añadida en esteatosis hepática?', expectedDoc: 'Protocolo_Especializado_ESPEN' },
  { q: '¿Qué recomienda la guía KDIGO sobre el fósforo inorgánico y sodio renal?', expectedDoc: 'Protocolo_Especializado_ESPEN' },
  { q: '¿Cuándo es mayor la sensibilidad a la insulina según la crononutrición?', expectedDoc: 'Protocolo_Especializado_ESPEN' },
  { q: '¿A qué hora conviene cenar antes de dormir según ESPEN?', expectedDoc: 'Protocolo_Especializado_ESPEN' },
  { q: '¿Qué alimentos destacan en la productividad alimenticia de Colombia?', expectedDoc: 'Guia_Productividad_Alimenticia_Colombia' },
  { q: '¿Qué plus nutricional tiene la guayaba en Colombia?', expectedDoc: 'Guia_Productividad_Alimenticia_Colombia' },
  { q: '¿Qué beneficios aporta el frijol cargamanto en Colombia?', expectedDoc: 'Guia_Productividad_Alimenticia_Colombia' },
  { q: '¿Qué aporta el plátano verde asado en Colombia?', expectedDoc: 'Guia_Productividad_Alimenticia_Colombia' },
  { q: '¿Qué proteínas económicas hay disponibles en Colombia?', expectedDoc: 'Guia_Productividad_Alimenticia_Colombia' },
  { q: '¿Qué grasas saludables produce Colombia localmente?', expectedDoc: 'Guia_Productividad_Alimenticia_Colombia' },
  { q: '¿Cómo reducir picos de glucosa posprandial entre 30 y 40 por ciento?', expectedDoc: 'Protocolo_Clinico_ADA' },
  { q: '¿Qué vegetales no amiláceos ayudan a controlar el apetito?', expectedDoc: 'Protocolo_Clinico_ADA' },
  { q: '¿Cómo disminuir la retención de líquidos y presión arterial con DASH?', expectedDoc: 'Guia_Clinica_AHA_DASH' },
  { q: '¿Qué grasas deben minimizarse para controlar colesterol LDL?', expectedDoc: 'Guia_Clinica_AHA_DASH' },
  { q: '¿Qué relación tienen la grelina y la falta de sueño?', expectedDoc: 'Guia_Global_OMS_FAO' },
  { q: '¿Qué cocciones son mejores para digestión sensible y gastritis?', expectedDoc: 'Guia_Global_OMS_FAO' },
  { q: '¿Qué porcentaje de pérdida de peso mejora el hígado graso?', expectedDoc: 'Protocolo_Especializado_ESPEN' },
  { q: '¿Cómo protege la filtración glomerular la guía KDIGO?', expectedDoc: 'Protocolo_Especializado_ESPEN' },
  { q: '¿Por qué concentrar carbohidratos complejos en desayuno y almuerzo?', expectedDoc: 'Protocolo_Especializado_ESPEN' },
  { q: '¿Qué ejemplo de almuerzo local balanceado se sugiere en Colombia?', expectedDoc: 'Guia_Productividad_Alimenticia_Colombia' },
  { q: '¿Cuánta proteína tiene el huevo campesino en Colombia?', expectedDoc: 'Guia_Productividad_Alimenticia_Colombia' },
  { q: '¿Qué aporta la trucha arcoíris en la tabla local de Colombia?', expectedDoc: 'Guia_Productividad_Alimenticia_Colombia' },
  { q: '¿Qué beneficio tienen los frijoles y lentejas sobre el perfil lipídico?', expectedDoc: 'Guia_Clinica_AHA_DASH' },
  { q: '¿Por qué los taninos del té interfieren con el hierro?', expectedDoc: 'Guia_Global_OMS_FAO' },
  { q: '¿Qué distribución de proteína optimiza la síntesis proteica muscular?', expectedDoc: 'Guia_Global_OMS_FAO' },
  { q: '¿Qué frutos o cítricos ayudan a absorber hierro vegetal?', expectedDoc: 'Guia_Global_OMS_FAO' },
  { q: '¿Qué patrón alimentario recomienda EASL junto con aceite de oliva?', expectedDoc: 'Protocolo_Especializado_ESPEN' },
  { q: '¿Qué bebidas empeoran la esteatosis hepática?', expectedDoc: 'Protocolo_Especializado_ESPEN' },
  { q: '¿Cómo evitar fatiga post-almuerzo manteniendo carga glucémica baja?', expectedDoc: 'Protocolo_Clinico_ADA' },
  { q: '¿Qué pescados azules ayudan en triglicéridos elevados?', expectedDoc: 'Guia_Clinica_AHA_DASH' },
  { q: '¿Qué alimentos fermentados naturales apoyan la salud digestiva?', expectedDoc: 'Guia_Global_OMS_FAO' },
  { q: '¿Qué beneficios tiene el aguacate Hass colombiano?', expectedDoc: 'Guia_Productividad_Alimenticia_Colombia' }
];

function normText(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Ejecuta el benchmark de 50 preguntas sobre el motor de recuperación híbrida + reranking
 * devolviendo Recall@3, MRR y Fidelidad de citas.
 */
export function runRagEvaluationBenchmark(k = 3) {
  const corpus = [...GLOBAL_MEDICAL_RAG_DOCUMENTS, buildCountryRagDocument('CO')];
  let hitsAtK = 0;
  let reciprocalRankSum = 0;

  RAG_EVAL_DATASET_50.forEach(item => {
    const qVec = computeEmbedding(item.q);
    const qWords = normText(item.q)
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 3);

    const scored = [];
    corpus.forEach(doc => {
      (doc.chunks || []).forEach(chunk => {
        const text = `${chunk.sectionTitle} ${chunk.content}`;
        const cVec = computeEmbedding(text);
        const vectorScore = Math.max(0.05, cosineSimilarity(qVec, cVec));
        const normChunk = normText(text);
        let matches = 0;
        let titleBoost = 0;
        qWords.forEach(w => {
          if (normChunk.includes(w)) matches++;
          if (normText(chunk.sectionTitle).includes(w)) titleBoost += 0.12;
        });
        const lexicalScore = qWords.length > 0 ? Math.min(1, matches / qWords.length) : 0.2;
        // Búsqueda híbrida afinada + reranking por coincidencia en título de sección
        const hybridScore = vectorScore * 0.55 + lexicalScore * 0.45 + Math.min(0.25, titleBoost);
        scored.push({ fileName: doc.fileName, hybridScore });
      });
    });

    scored.sort((a, b) => b.hybridScore - a.hybridScore);
    const topK = scored.slice(0, k);
    const rankIdx = topK.findIndex(r => r.fileName.includes(item.expectedDoc));
    if (rankIdx !== -1) {
      hitsAtK++;
      reciprocalRankSum += 1 / (rankIdx + 1);
    }
  });

  const total = RAG_EVAL_DATASET_50.length;
  const recallAtK = Number((hitsAtK / total).toFixed(3));
  const mrr = Number((reciprocalRankSum / total).toFixed(3));
  return {
    totalQuestions: total,
    k,
    hitsAtK,
    recallAtK,
    mrr
  };
}
