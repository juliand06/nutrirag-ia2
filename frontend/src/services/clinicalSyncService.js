// Conector Real HL7 FHIR R4 / SMART on FHIR (HAPI FHIR / SMART Health IT)
// Regla clínica estricta: NUNCA mostrar datos clínicos ficticios como si fueran reales.
// Si no hay conexión activa con un servidor FHIR real o no existen recursos para el paciente,
// se reporta explícitamente en la UI que no hay conexión FHIR activa.

export const FHIR_SANDBOX_ENDPOINTS = [
  {
    id: 'hapi-fhir-r4',
    name: 'HAPI FHIR R4 Public Sandbox',
    baseUrl: 'https://hapi.fhir.org/baseR4',
    authorizeUrl: 'https://hapi.fhir.org/baseR4/authorize',
    tokenUrl: 'https://hapi.fhir.org/baseR4/token',
    standard: 'HL7 FHIR R4 (LOINC / SNOMED)'
  },
  {
    id: 'smart-health-it-r4',
    name: 'SMART Health IT R4 Sandbox',
    baseUrl: 'https://launch.smarthealthit.org/v/r4/fhir',
    authorizeUrl: 'https://launch.smarthealthit.org/v/r4/auth/authorize',
    tokenUrl: 'https://launch.smarthealthit.org/v/r4/auth/token',
    standard: 'SMART App Launch 2.0 · HL7 FHIR R4'
  }
];

export const CLINICAL_INSTITUTIONS = [
  {
    id: 'hapi-fhir-r4',
    sandboxId: 'hapi-fhir-r4',
    name: 'HAPI FHIR R4 Public Sandbox (HL7 FHIR)',
    type: 'Sandbox HL7 FHIR R4',
    specialty: 'Interoperabilidad abierta Patient / Observation (LOINC)',
    fhirBaseUrl: 'https://hapi.fhir.org/baseR4',
    smartAuthSupported: true,
    fhirResources: ['Patient', 'Observation', 'Condition', 'AllergyIntolerance'],
    evidenceGrade: 'Estándar HL7 FHIR R4'
  },
  {
    id: 'smart-health-it-r4',
    sandboxId: 'smart-health-it-r4',
    name: 'SMART Health IT R4 Sandbox (OAuth2 Launch)',
    type: 'Sandbox SMART on FHIR R4',
    specialty: 'Flujo SMART App Launch + Registros Patient/Observation reales',
    fhirBaseUrl: 'https://launch.smarthealthit.org/v/r4/fhir',
    smartAuthSupported: true,
    fhirResources: ['Patient', 'Observation', 'Condition', 'MedicationRequest', 'AllergyIntolerance'],
    evidenceGrade: 'SMART on FHIR R4 + OAuth2'
  }
];

const LOINC_METRIC_MAP = {
  '1558-6': 'fastingGlucose',
  '2345-7': 'fastingGlucose',
  '2339-0': 'fastingGlucose',
  '4548-4': 'hba1c',
  '17856-6': 'hba1c',
  '13457-7': 'ldlCholesterol',
  '2089-1': 'ldlCholesterol',
  '18262-6': 'ldlCholesterol',
  '2085-9': 'hdlCholesterol',
  '2571-8': 'triglycerides',
  '718-7': 'hemoglobin',
  '8480-6': 'bloodPressureSys',
  '8462-4': 'bloodPressureDia',
  '29463-7': 'clinicalWeightKg'
};

/**
 * Construye la URL de autorización OAuth2 SMART on FHIR para flujo clínico real.
 */
export function buildSmartOnFhirAuthorizeUrl({
  fhirBaseUrl,
  clientId = 'nutristudio-smart-web',
  redirectUri = 'http://localhost:5173/salud',
  scope = 'patient/*.read openid fhirUser',
  state = 'nutristudio-smart-state'
}) {
  const sandbox =
    FHIR_SANDBOX_ENDPOINTS.find(s => s.baseUrl === fhirBaseUrl) || FHIR_SANDBOX_ENDPOINTS[0];
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    aud: fhirBaseUrl || sandbox.baseUrl,
    state
  });
  return `${sandbox.authorizeUrl}?${params.toString()}`;
}

function extractNumericValueFromObservation(obs) {
  if (!obs || typeof obs !== 'object') return null;
  if (obs.valueQuantity && typeof obs.valueQuantity.value === 'number') {
    let val = obs.valueQuantity.value;
    const unit = String(obs.valueQuantity.unit || obs.valueQuantity.code || '').toLowerCase();
    if (unit.includes('lb')) {
      val = Number((val * 0.453592).toFixed(1));
    }
    return Number(val.toFixed(1));
  }
  return null;
}

/**
 * Mapea recursos reales FHIR R4 (Patient + Bundle Observation) al modelo clínico interno.
 * Nunca rellena biomarcadores faltantes con números inventados.
 */
export function parseFhirBundleToClinicalRecord({
  patientResource,
  observationBundle,
  email,
  institutionName,
  fhirBaseUrl
}) {
  const metrics = {
    clinicalWeightKg: null,
    fastingGlucose: null,
    hba1c: null,
    ldlCholesterol: null,
    hdlCholesterol: null,
    triglycerides: null,
    hemoglobin: null,
    bloodPressureSys: null,
    bloodPressureDia: null
  };

  const entries = Array.isArray(observationBundle?.entry) ? observationBundle.entry : [];
  const extractedIds = [];
  let latestExamDate = null;

  for (const item of entries) {
    const obs = item?.resource;
    if (!obs || obs.resourceType !== 'Observation') continue;

    const obsDate = (obs.effectiveDateTime || obs.issued || '').slice(0, 10);
    if (obsDate && (!latestExamDate || obsDate > latestExamDate)) {
      latestExamDate = obsDate;
    }

    const codings = Array.isArray(obs.code?.coding) ? obs.code.coding : [];
    for (const coding of codings) {
      const targetField = LOINC_METRIC_MAP[coding?.code];
      if (targetField && metrics[targetField] === null) {
        const num = extractNumericValueFromObservation(obs);
        if (num !== null) {
          metrics[targetField] = num;
          extractedIds.push(obs.id || coding.code);
        }
      }
    }

    if (Array.isArray(obs.component)) {
      for (const comp of obs.component) {
        const compCodings = Array.isArray(comp.code?.coding) ? comp.code.coding : [];
        for (const coding of compCodings) {
          const targetField = LOINC_METRIC_MAP[coding?.code];
          if (targetField && metrics[targetField] === null && comp.valueQuantity?.value != null) {
            metrics[targetField] = Number(Number(comp.valueQuantity.value).toFixed(1));
            extractedIds.push(`${obs.id || 'bp'}:${coding.code}`);
          }
        }
      }
    }
  }

  const observationCount = extractedIds.length;
  if (!patientResource && observationCount === 0) {
    return null;
  }

  const patientEmail =
    (Array.isArray(patientResource?.telecom)
      ? patientResource.telecom.find(t => t.system === 'email')?.value
      : '') ||
    (email || '').trim().toLowerCase();

  return {
    recordId: `fhir-${patientResource?.id || 'bundle'}`,
    patientFhirId: patientResource?.id || '',
    institutionId: fhirBaseUrl,
    institutionName: institutionName || 'Servidor HL7 FHIR R4',
    fhirEndpoint: fhirBaseUrl,
    isRealFhirData: true,
    sourceType: 'SMART_ON_FHIR_R4',
    verificationLabel: `Datos reales HL7 FHIR R4 (${observationCount} observaciones LOINC)`,
    patientEmail: (patientEmail || '').trim().toLowerCase(),
    consentGranted: true,
    consentTimestamp: new Date().toISOString().slice(0, 10),
    examDate: latestExamDate || new Date().toISOString().slice(0, 10),
    observationCount,
    rawObservationIds: extractedIds,
    ...metrics,
    allergies: '',
    medications: '',
    clinicianNotes:
      observationCount > 0
        ? `Sincronizado directamente desde ${fhirBaseUrl} (${observationCount} observaciones LOINC reales).`
        : 'Paciente localizado en servidor FHIR sin observaciones de laboratorio registradas.'
  };
}

/**
 * Conector real SMART on FHIR R4 contra HAPI FHIR / SMART Health IT.
 * NUNCA genera datos ficticios si el servidor no responde o no tiene observaciones.
 */
export async function connectSmartOnFhirSandbox({
  email,
  patientFhirId = '',
  sandboxId = 'hapi-fhir-r4',
  consentGranted = false,
  accessToken = '',
  fetchImpl = globalThis.fetch
}) {
  if (!consentGranted) {
    throw new Error(
      'Se requiere consentimiento informado explícito (SMART on FHIR / Ley 1581 / GDPR) antes de consultar un servidor FHIR.'
    );
  }

  const sandbox =
    FHIR_SANDBOX_ENDPOINTS.find(s => s.id === sandboxId) || FHIR_SANDBOX_ENDPOINTS[0];
  const envUrl =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_FHIR_SANDBOX_URL
      ? String(import.meta.env.VITE_FHIR_SANDBOX_URL).trim()
      : '';
  const baseUrl = (sandboxId === 'env' && envUrl ? envUrl : sandbox.baseUrl).replace(/\/$/, '');

  if (typeof fetchImpl !== 'function') {
    return {
      connected: false,
      isRealFhirData: false,
      status: 'NO_REAL_FHIR_CONNECTION',
      sandboxId: sandbox.id,
      sandboxName: sandbox.name,
      fhirBaseUrl: baseUrl,
      clinicalRecord: null,
      message:
        'No hay cliente HTTP/Fetch disponible para consultar el servidor SMART on FHIR. Nunca se muestran datos clínicos ficticios.'
    };
  }

  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPatientId = (patientFhirId || '').trim();
  const headers = {
    Accept: 'application/fhir+json, application/json'
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), 4500) : null;

  try {
    let patientResource = null;
    if (cleanPatientId) {
      const pRes = await fetchImpl(
        `${baseUrl}/Patient/${encodeURIComponent(cleanPatientId)}`,
        { headers, signal: controller?.signal }
      );
      if (pRes.ok) {
        const candidate = await pRes.json();
        if (candidate?.resourceType === 'Patient') {
          patientResource = candidate;
        }
      }
    } else if (cleanEmail) {
      const searchRes = await fetchImpl(
        `${baseUrl}/Patient?email=${encodeURIComponent(cleanEmail)}&_count=1`,
        { headers, signal: controller?.signal }
      );
      if (searchRes.ok) {
        const bundle = await searchRes.json();
        patientResource = bundle?.entry?.[0]?.resource || null;
      }
    }

    if (!patientResource?.id) {
      return {
        connected: false,
        isRealFhirData: false,
        status: 'NO_PATIENT_RECORDS_FOUND',
        sandboxId: sandbox.id,
        sandboxName: sandbox.name,
        fhirBaseUrl: baseUrl,
        clinicalRecord: null,
        message: `Conexión realizada con ${sandbox.name}, pero no se encontró un recurso FHIR Patient para ${cleanPatientId ? `ID "${cleanPatientId}"` : cleanEmail || 'tu cuenta'}. Nunca se muestran datos clínicos ficticios.`
      };
    }

    const obsRes = await fetchImpl(
      `${baseUrl}/Observation?patient=${encodeURIComponent(patientResource.id)}&_count=40&_sort=-date`,
      { headers, signal: controller?.signal }
    );
    const obsBundle = obsRes.ok ? await obsRes.json() : { entry: [] };
    const parsed = parseFhirBundleToClinicalRecord({
      patientResource,
      observationBundle: obsBundle,
      email: cleanEmail,
      institutionName: sandbox.name,
      fhirBaseUrl: baseUrl
    });

    if (!parsed || parsed.observationCount === 0) {
      return {
        connected: false,
        isRealFhirData: false,
        status: 'NO_OBSERVATIONS_IN_FHIR',
        patientFound: true,
        patientFhirId: patientResource.id,
        sandboxId: sandbox.id,
        sandboxName: sandbox.name,
        fhirBaseUrl: baseUrl,
        clinicalRecord: null,
        message: `Paciente FHIR "${patientResource.id}" encontrado en ${sandbox.name}, pero no tiene observaciones clínicas LOINC registradas. Nunca se generan laboratorios ficticios.`
      };
    }

    return {
      connected: true,
      isRealFhirData: true,
      status: 'CONNECTED_FHIR_R4',
      patientFhirId: patientResource.id,
      sandboxId: sandbox.id,
      sandboxName: sandbox.name,
      fhirBaseUrl: baseUrl,
      clinicalRecord: parsed,
      message: `Conectado a ${sandbox.name}: ${parsed.observationCount} observaciones clínicas reales importadas (HL7 FHIR R4).`
    };
  } catch (err) {
    return {
      connected: false,
      isRealFhirData: false,
      status: 'NO_REAL_FHIR_CONNECTION',
      sandboxId: sandbox.id,
      sandboxName: sandbox.name,
      fhirBaseUrl: baseUrl,
      clinicalRecord: null,
      errorDetail: err?.message || 'Error de red o CORS',
      message: `Sin conexión activa con ${sandbox.name} (${err?.message || 'servidor inaccesible'}). Por seguridad clínica, nunca se muestran datos ficticios.`
    };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

/**
 * Validación de descubrimiento federado FHIR: exige consentimiento explícito.
 * Por defecto en modo síncrono devuelve estado DISCONNECTED sin datos ficticios;
 * con liveSandbox=true delega en connectSmartOnFhirSandbox().
 */
export function runFederatedClinicalDiscovery({
  email,
  patientFhirId = '',
  sandboxId = 'hapi-fhir-r4',
  consentGranted = false,
  accessToken = '',
  liveSandbox = false,
  fetchImpl
}) {
  if (!consentGranted) {
    throw new Error(
      'Se requiere consentimiento informado explícito del paciente (SMART on FHIR / Ley 1581 / GDPR) para consultar un servidor FHIR.'
    );
  }
  if (liveSandbox) {
    return connectSmartOnFhirSandbox({
      email,
      patientFhirId,
      sandboxId,
      consentGranted,
      accessToken,
      fetchImpl
    });
  }
  return {
    connected: false,
    isRealFhirData: false,
    status: 'DISCONNECTED',
    clinicalRecord: null,
    message:
      'No hay conexión activa con un servidor SMART on FHIR real. Nunca se muestran datos clínicos ficticios.'
  };
}

/**
 * Nunca prellena datos de laboratorio inventados.
 * Devuelve null salvo que allowManualBlank=true (plantilla vacía para ingreso manual del paciente).
 */
export function buildInitialClinicalRecordForEmail({
  email,
  institutionId = 'hapi-fhir-r4',
  userWeightKg = 0,
  allowManualBlank = false
}) {
  if (!allowManualBlank) {
    return null;
  }
  const inst =
    CLINICAL_INSTITUTIONS.find(i => i.id === institutionId) || CLINICAL_INSTITUTIONS[0];
  const today = new Date().toISOString().slice(0, 10);

  return {
    recordId: 'manual-' + Math.random().toString(36).substring(2, 9),
    institutionId: inst.id,
    institutionName: 'Ingreso manual del paciente (Sin conexión FHIR activa)',
    isRealFhirData: false,
    sourceType: 'MANUAL_USER_ENTRY',
    verificationLabel: 'Ingresado manualmente por el usuario (No verificado por servidor FHIR)',
    patientEmail: (email || '').trim().toLowerCase(),
    consentGranted: true,
    consentTimestamp: today,
    examDate: today,
    clinicalWeightKg: Number(userWeightKg) > 0 ? Number(userWeightKg) : null,
    fastingGlucose: null,
    hba1c: null,
    ldlCholesterol: null,
    hdlCholesterol: null,
    triglycerides: null,
    hemoglobin: null,
    bloodPressureSys: null,
    bloodPressureDia: null,
    allergies: '',
    medications: '',
    clinicianNotes: ''
  };
}

function hasPositiveMetric(val) {
  return val !== null && val !== undefined && val !== '' && Number(val) > 0;
}

/**
 * Rúbrica de Coordinación Clínica (0–100 puntos):
 * Evalúa únicamente valores reales provenientes de FHIR R4 o ingresados manualmente por el usuario.
 */
export function evaluateClinicalReconciliationRubric({ userProfile, clinicalRecord }) {
  if (!clinicalRecord) {
    return null;
  }

  const appEmail = (userProfile?.email || '').trim().toLowerCase();
  const clinicEmail = (clinicalRecord.patientEmail || '').trim().toLowerCase();
  const emailMatched = Boolean(appEmail && clinicEmail && appEmail === clinicEmail);
  const consentVerified = Boolean(clinicalRecord.consentGranted);

  const scoreIdentity = emailMatched && consentVerified ? 20 : emailMatched ? 10 : 0;

  let daysOld = 0;
  if (clinicalRecord.examDate) {
    const parsedTime = new Date(clinicalRecord.examDate).getTime();
    if (!Number.isNaN(parsedTime)) {
      daysOld = Math.max(0, Math.round((Date.now() - parsedTime) / (1000 * 60 * 60 * 24)));
    }
  }
  const scoreFreshness = daysOld <= 180 ? 20 : daysOld <= 365 ? 12 : 5;

  const appWeight = Number(userProfile?.weightKg || 0);
  const clinicWeight = Number(clinicalRecord.clinicalWeightKg || 0);
  const weightDiff = appWeight > 0 && clinicWeight > 0 ? Math.abs(appWeight - clinicWeight) : 0;
  const scoreBiometric =
    appWeight > 0 && clinicWeight > 0
      ? weightDiff <= 2
        ? 20
        : weightDiff <= 5
          ? 14
          : 8
      : 10;

  const detectedConditions = [];
  const biomarkerAlerts = [];

  if (
    (hasPositiveMetric(clinicalRecord.fastingGlucose) && Number(clinicalRecord.fastingGlucose) >= 100) ||
    (hasPositiveMetric(clinicalRecord.hba1c) && Number(clinicalRecord.hba1c) >= 5.7)
  ) {
    detectedConditions.push('resistencia_insulina_diabetes');
    biomarkerAlerts.push(
      `Glucosa (${clinicalRecord.fastingGlucose ?? '—'} mg/dL) o HbA1c (${clinicalRecord.hba1c ?? '—'}%) en rango de vigilancia → activar protocolo ADA.`
    );
  }
  if (
    (hasPositiveMetric(clinicalRecord.bloodPressureSys) && Number(clinicalRecord.bloodPressureSys) >= 130) ||
    (hasPositiveMetric(clinicalRecord.bloodPressureDia) && Number(clinicalRecord.bloodPressureDia) >= 85)
  ) {
    detectedConditions.push('hipertension_cardiovascular');
    biomarkerAlerts.push(
      `Presión arterial (${clinicalRecord.bloodPressureSys ?? '—'}/${clinicalRecord.bloodPressureDia ?? '—'} mmHg) elevada → activar protocolo DASH/AHA.`
    );
  }
  if (
    (hasPositiveMetric(clinicalRecord.ldlCholesterol) && Number(clinicalRecord.ldlCholesterol) >= 130) ||
    (hasPositiveMetric(clinicalRecord.triglycerides) && Number(clinicalRecord.triglycerides) >= 150)
  ) {
    detectedConditions.push('colesterol_trigliceridos');
    biomarkerAlerts.push(
      `Perfil lipídico (LDL ${clinicalRecord.ldlCholesterol ?? '—'} / Triglicéridos ${clinicalRecord.triglycerides ?? '—'} mg/dL) → reforzar fibra soluble y Omega-3.`
    );
  }
  if (hasPositiveMetric(clinicalRecord.hemoglobin) && Number(clinicalRecord.hemoglobin) < 12.0) {
    detectedConditions.push('anemia_fatiga');
    biomarkerAlerts.push(
      `Hemoglobina (${clinicalRecord.hemoglobin} g/dL) baja → activar protocolo OMS de hierro + vitamina C.`
    );
  }

  const hasAnyLabValue = [
    clinicalRecord.fastingGlucose,
    clinicalRecord.hba1c,
    clinicalRecord.ldlCholesterol,
    clinicalRecord.triglycerides,
    clinicalRecord.hemoglobin,
    clinicalRecord.bloodPressureSys
  ].some(hasPositiveMetric);

  const userConds = Array.isArray(userProfile?.medicalConditions) ? userProfile.medicalConditions : [];
  const missingSyncedConditions = detectedConditions.filter(c => !userConds.includes(c));
  const scoreClinicalSync = !hasAnyLabValue
    ? 0
    : detectedConditions.length === 0 || missingSyncedConditions.length === 0
      ? 25
      : Math.max(12, 25 - missingSyncedConditions.length * 6);

  const medText = (clinicalRecord.medications || '').toLowerCase();
  const drugNutrientAlerts = [];
  if (medText.includes('metformina')) {
    drugNutrientAlerts.push(
      'Interacción fármaco-nutriente (Metformina): vigilar Vitamina B12 y tomar con comida.'
    );
  }
  if (medText.includes('losartan') || medText.includes('enalapril') || medText.includes('antihipertensivo')) {
    drugNutrientAlerts.push(
      'Interacción fármaco-nutriente (Antihipertensivo): controlar sodio y consultar al médico sobre potasio.'
    );
  }
  if (medText.includes('levotiroxina') || medText.includes('tiroides')) {
    drugNutrientAlerts.push(
      'Interacción fármaco-nutriente (Levotiroxina): separar 30–60 min del desayuno, café, calcio o hierro.'
    );
  }
  if (medText.includes('estatina') || medText.includes('atorvastatina')) {
    drugNutrientAlerts.push(
      'Interacción fármaco-nutriente (Estatina): evitar toronja/pomelo y priorizar Omega-3.'
    );
  }
  const scoreSafety = 15;

  const totalScore = Math.min(
    100,
    scoreIdentity + scoreFreshness + scoreBiometric + scoreClinicalSync + scoreSafety
  );

  const discrepancies = [];
  if (!emailMatched && clinicEmail) {
    discrepancies.push(
      `El correo del expediente (${clinicEmail}) no coincide con tu correo de sesión (${appEmail}).`
    );
  }
  if (weightDiff > 2) {
    discrepancies.push(
      `Diferencia de peso detectada: app ${appWeight} kg vs. registro clínico ${clinicWeight} kg.`
    );
  }
  if (daysOld > 180) {
    discrepancies.push(
      `Tus exámenes tienen ${daysOld} días de antigüedad; se sugiere actualizarlos con tu clínica.`
    );
  }
  if (missingSyncedConditions.length > 0) {
    discrepancies.push(
      `Hay ${missingSyncedConditions.length} protocolo(s) clínico(s) sugeridos por tus laboratorios sin activar.`
    );
  }

  return {
    totalScore,
    isRealFhirData: Boolean(clinicalRecord.isRealFhirData),
    sourceType: clinicalRecord.sourceType || 'MANUAL_USER_ENTRY',
    emailMatched,
    consentVerified,
    daysOld,
    weightDiff: Number(weightDiff.toFixed(1)),
    detectedConditions,
    missingSyncedConditions,
    biomarkerAlerts,
    drugNutrientAlerts,
    discrepancies,
    criteria: [
      { name: 'Identidad + consentimiento explícito', score: scoreIdentity, max: 20 },
      { name: 'Vigencia de exámenes clínicos', score: scoreFreshness, max: 20 },
      { name: 'Concordancia biométrica (App vs. Registro)', score: scoreBiometric, max: 20 },
      { name: 'Biomarcadores y protocolos clínicos', score: scoreClinicalSync, max: 25 },
      { name: 'Seguridad fármaco-nutriente y alergias', score: scoreSafety, max: 15 }
    ]
  };
}

/**
 * Convierte el expediente clínico verificado o ingresado manualmente en documento RAG privado.
 */
export function buildPatientClinicalRagDoc(clinicalRecord, rubric) {
  if (!clinicalRecord || !clinicalRecord.consentGranted) return null;
  const parts = [];
  if (hasPositiveMetric(clinicalRecord.clinicalWeightKg)) parts.push(`Peso clínico ${clinicalRecord.clinicalWeightKg} kg`);
  if (hasPositiveMetric(clinicalRecord.fastingGlucose)) parts.push(`Glucosa en ayunas ${clinicalRecord.fastingGlucose} mg/dL`);
  if (hasPositiveMetric(clinicalRecord.hba1c)) parts.push(`HbA1c ${clinicalRecord.hba1c}%`);
  if (hasPositiveMetric(clinicalRecord.ldlCholesterol)) parts.push(`LDL ${clinicalRecord.ldlCholesterol} mg/dL`);
  if (hasPositiveMetric(clinicalRecord.hdlCholesterol)) parts.push(`HDL ${clinicalRecord.hdlCholesterol} mg/dL`);
  if (hasPositiveMetric(clinicalRecord.triglycerides)) parts.push(`Triglicéridos ${clinicalRecord.triglycerides} mg/dL`);
  if (hasPositiveMetric(clinicalRecord.hemoglobin)) parts.push(`Hemoglobina ${clinicalRecord.hemoglobin} g/dL`);
  if (hasPositiveMetric(clinicalRecord.bloodPressureSys)) {
    parts.push(`Presión arterial ${clinicalRecord.bloodPressureSys}/${clinicalRecord.bloodPressureDia ?? '—'} mmHg`);
  }
  if (parts.length === 0 && !clinicalRecord.allergies && !clinicalRecord.medications) {
    return null;
  }

  return {
    id: `doc-ehr-${clinicalRecord.recordId}`,
    tenantId: 'private-ehr',
    ownerUsername: clinicalRecord.patientEmail,
    fileName: `${clinicalRecord.isRealFhirData ? 'FHIR_R4' : 'Registro_Manual'}_${clinicalRecord.institutionName.slice(0, 24).replace(/\s+/g, '_')}.pdf`,
    sha256Hash: `ehr-${clinicalRecord.recordId}`,
    totalPages: 2,
    totalChunks: 2,
    ocrApplied: false,
    embeddingModel: 'text-embedding-004',
    tempFileDeleted: true,
    indexingStatus: 'INDEXED',
    createdAt: clinicalRecord.examDate,
    chunks: [
      {
        id: `chk-ehr-${clinicalRecord.recordId}-1`,
        pageNumber: 1,
        sectionTitle: `${clinicalRecord.isRealFhirData ? 'Biomarcadores HL7 FHIR R4' : 'Biomarcadores Manuales'} (${clinicalRecord.institutionName})`,
        chunkOrder: 1,
        tokenCount: 420,
        content: `Origen: ${clinicalRecord.verificationLabel || clinicalRecord.institutionName}. Fecha ${clinicalRecord.examDate}: ${parts.join(', ') || 'Sin laboratorios registrados aún'}.`
      },
      {
        id: `chk-ehr-${clinicalRecord.recordId}-2`,
        pageNumber: 2,
        sectionTitle: 'Alergias, Medicación e Indicaciones Clínicas',
        chunkOrder: 2,
        tokenCount: 380,
        content: `Alergias: ${clinicalRecord.allergies || 'No especificadas'}. Medicación: ${clinicalRecord.medications || 'No especificada'}. Notas: ${clinicalRecord.clinicianNotes || 'Sin notas'}. Alertas (${rubric?.totalScore || 0}%): ${[...(rubric?.biomarkerAlerts || []), ...(rubric?.drugNutrientAlerts || [])].join(' ') || 'Sin alertas activas.'}`
      }
    ]
  };
}
