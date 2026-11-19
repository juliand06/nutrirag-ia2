import { computeRealSha256 } from './userStorage';

const SUBSCRIPTION_PREFIX = 'nutristudio_subscription_v1_';
const CONSENT_PREFIX = 'nutristudio_privacy_consents_v1_';
const AUDIT_LOG_PREFIX = 'nutristudio_audit_log_v1_';
const NUTRITIONIST_PREFIX = 'nutristudio_nutritionist_portal_v1_';
const STRUCTURED_LOGS_KEY = 'nutristudio_structured_logs_v1';
const SENTRY_EVENTS_KEY = 'nutristudio_sentry_events_v1';
const ANALYTICS_EVENTS_KEY = 'nutristudio_analytics_events_v1';

const MANDATORY_HEALTH_DISCLAIMER = 'Orientación informativa; no reemplaza a un profesional.';

const PII_KEYS = new Set([
  'email',
  'patientemail',
  'actoremail',
  'name',
  'fullname',
  'password',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'phone',
  'address',
  'documentid'
]);

function safeJsonParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function getStorage() {
  return typeof localStorage !== 'undefined' ? localStorage : null;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  if (typeof btoa === 'function') return btoa(binary);
  return Buffer.from(bytes).toString('base64');
}

function fromBase64(str) {
  if (typeof atob === 'function') {
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  return new Uint8Array(Buffer.from(str, 'base64'));
}

export function sanitizePiiContext(obj) {
  if (!obj || typeof obj !== 'object') return {};
  if (Array.isArray(obj)) {
    return obj.map(item => (typeof item === 'object' ? sanitizePiiContext(item) : item));
  }
  const clean = {};
  for (const [k, v] of Object.entries(obj)) {
    if (PII_KEYS.has(k.toLowerCase())) {
      clean[k] = '[REDACTED_PII]';
    } else if (v && typeof v === 'object') {
      clean[k] = sanitizePiiContext(v);
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

// ============================================================================
// 1. OBSERVABILIDAD: LOGS ESTRUCTURADOS JSON, SENTRY Y ANALÍTICA ANÓNIMA
// ============================================================================

export function logStructuredEvent({ level = 'INFO', category = 'APP', message = '', context = {} }) {
  const sanitizedContext = sanitizePiiContext(context);
  const entry = {
    timestamp: new Date().toISOString(),
    level: String(level).toUpperCase(),
    service: 'nutristudio-web',
    traceId: 'tr-' + Math.random().toString(36).substring(2, 10),
    category,
    message: String(message || ''),
    sanitizedContext
  };
  const storage = getStorage();
  if (storage) {
    const prev = safeJsonParse(storage.getItem(STRUCTURED_LOGS_KEY), []);
    const next = [entry, ...(Array.isArray(prev) ? prev : [])].slice(0, 60);
    storage.setItem(STRUCTURED_LOGS_KEY, JSON.stringify(next));
  }
  return entry;
}

export function getStructuredLogs() {
  const storage = getStorage();
  if (!storage) return [];
  const list = safeJsonParse(storage.getItem(STRUCTURED_LOGS_KEY), []);
  return Array.isArray(list) ? list : [];
}

export function captureSentryError(error, context = {}) {
  const sanitizedContext = sanitizePiiContext(context);
  const msg = error instanceof Error ? error.message : String(error || 'Unknown error');
  const event = {
    eventId: 'snt-' + Math.random().toString(36).substring(2, 11),
    timestamp: new Date().toISOString(),
    level: 'error',
    environment:
      typeof import.meta !== 'undefined' && import.meta.env?.MODE
        ? import.meta.env.MODE
        : 'production',
    dsnConfigured: Boolean(
      typeof import.meta !== 'undefined' && import.meta.env?.VITE_SENTRY_DSN
    ),
    message: msg,
    stack: error instanceof Error ? String(error.stack || '').slice(0, 400) : '',
    tags: sanitizedContext
  };

  const storage = getStorage();
  if (storage) {
    const prev = safeJsonParse(storage.getItem(SENTRY_EVENTS_KEY), []);
    const next = [event, ...(Array.isArray(prev) ? prev : [])].slice(0, 40);
    storage.setItem(SENTRY_EVENTS_KEY, JSON.stringify(next));
  }
  logStructuredEvent({
    level: 'ERROR',
    category: 'SENTRY_CAPTURE',
    message: msg,
    context: sanitizedContext
  });
  return event;
}

export function getSentryEvents() {
  const storage = getStorage();
  if (!storage) return [];
  const list = safeJsonParse(storage.getItem(SENTRY_EVENTS_KEY), []);
  return Array.isArray(list) ? list : [];
}

export async function trackAnonymousProductEvent(eventName, properties = {}, userId = 'anon') {
  const consents = getGranularConsents(userId);
  if (!consents.anonymousProductAnalytics) {
    return {
      tracked: false,
      reason: 'CONSENT_DISABLED',
      eventName
    };
  }

  const anonymousSessionHash = (await computeRealSha256(`anon:${userId}:nutristudio`)).slice(0, 16);
  const cleanProps = sanitizePiiContext(properties);
  const event = {
    id: 'evt-' + Math.random().toString(36).substring(2, 10),
    timestamp: new Date().toISOString(),
    eventName,
    anonymousSessionHash,
    properties: cleanProps
  };

  const storage = getStorage();
  if (storage) {
    const prev = safeJsonParse(storage.getItem(ANALYTICS_EVENTS_KEY), []);
    const next = [event, ...(Array.isArray(prev) ? prev : [])].slice(0, 80);
    storage.setItem(ANALYTICS_EVENTS_KEY, JSON.stringify(next));
  }

  return {
    tracked: true,
    event
  };
}

export function getAnonymousProductEvents() {
  const storage = getStorage();
  if (!storage) return [];
  const list = safeJsonParse(storage.getItem(ANALYTICS_EVENTS_KEY), []);
  return Array.isArray(list) ? list : [];
}

// ============================================================================
// 2. PRIVACIDAD (GDPR / LEY 1581 DE COLOMBIA), CIFRADO AES-256-GCM Y AUDITORÍA
// ============================================================================

export const GRANULAR_CONSENT_CATALOG = [
  {
    key: 'essentialBiometric',
    label: 'Procesamiento esencial de perfil y macros',
    legalBasis: 'Art. 6 Ley 1581 / Art. 6(1)(b) GDPR (Necesario para el servicio)',
    required: true
  },
  {
    key: 'smartOnFhirClinical',
    label: 'Interoperabilidad clínica SMART on FHIR R4',
    legalBasis: 'Consentimiento explícito datos sensibles de salud (Art. 9 GDPR / Art. 6 Ley 1581)',
    required: false
  },
  {
    key: 'aiRagMemory',
    label: 'Personalización de memoria y hábitos en Coach IA',
    legalBasis: 'Consentimiento opt-in revocable en cualquier momento',
    required: false
  },
  {
    key: 'nutritionistSharing',
    label: 'Compartir expediente y notas con nutricionista en Portal Clínico',
    legalBasis: 'Consentimiento explícito del titular',
    required: false
  },
  {
    key: 'anonymousProductAnalytics',
    label: 'Analítica anónima de producto (sin PII ni correos)',
    legalBasis: 'Consentimiento granular opt-in sin datos identificables',
    required: false
  }
];

export const DEFAULT_GRANULAR_CONSENTS = {
  essentialBiometric: true,
  smartOnFhirClinical: false,
  aiRagMemory: true,
  nutritionistSharing: false,
  anonymousProductAnalytics: true,
  updatedAt: new Date().toISOString()
};

export function getGranularConsents(userId = 'default') {
  const storage = getStorage();
  if (!storage) return { ...DEFAULT_GRANULAR_CONSENTS };
  const saved = safeJsonParse(storage.getItem(`${CONSENT_PREFIX}${userId}`), null);
  return {
    ...DEFAULT_GRANULAR_CONSENTS,
    ...(saved || {}),
    essentialBiometric: true
  };
}

export async function updateGranularConsent(userId, key, value, actorEmail = '') {
  const current = getGranularConsents(userId);
  const next = {
    ...current,
    [key]: key === 'essentialBiometric' ? true : Boolean(value),
    updatedAt: new Date().toISOString()
  };
  const storage = getStorage();
  if (storage) {
    storage.setItem(`${CONSENT_PREFIX}${userId}`, JSON.stringify(next));
  }
  await appendAuditLog({
    userId,
    actorEmail,
    action: 'CONSENT_UPDATED',
    details: `Consentimiento "${key}" actualizado a ${Boolean(next[key])}`
  });
  return next;
}

async function deriveAesGcmKey(secretSeed) {
  const material = new TextEncoder().encode(String(secretSeed || 'nutristudio-local-aes-seed'));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', material);
  return globalThis.crypto.subtle.importKey(
    'raw',
    digest,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Cifra datos sensibles con AES-256-GCM (Web Crypto API) e IV aleatorio de 12 bytes.
 */
export async function encryptSensitiveData(plainTextOrObj, secretSeed = 'nutristudio-key-v1') {
  const plain =
    typeof plainTextOrObj === 'string' ? plainTextOrObj : JSON.stringify(plainTextOrObj);

  if (globalThis.crypto?.subtle) {
    const key = await deriveAesGcmKey(secretSeed);
    const iv = new Uint8Array(12);
    globalThis.crypto.getRandomValues(iv);
    const encoded = new TextEncoder().encode(plain);
    const cipherBuf = await globalThis.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );
    return {
      alg: 'AES-256-GCM',
      iv: toBase64(iv),
      ciphertext: toBase64(new Uint8Array(cipherBuf)),
      encryptedAt: new Date().toISOString()
    };
  }

  // Fallback si el runtime carece de crypto.subtle
  const keyBytes = new TextEncoder().encode(await computeRealSha256(secretSeed));
  const plainBytes = new TextEncoder().encode(plain);
  const out = new Uint8Array(plainBytes.length);
  for (let i = 0; i < plainBytes.length; i += 1) {
    out[i] = plainBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return {
    alg: 'XOR-SHA256-FALLBACK',
    iv: toBase64(keyBytes.slice(0, 12)),
    ciphertext: toBase64(out),
    encryptedAt: new Date().toISOString()
  };
}

export async function decryptSensitiveData(bundle, secretSeed = 'nutristudio-key-v1') {
  if (!bundle || !bundle.ciphertext) {
    throw new Error('Paquete cifrado inválido.');
  }

  if (bundle.alg === 'AES-256-GCM' && globalThis.crypto?.subtle) {
    const key = await deriveAesGcmKey(secretSeed);
    const iv = fromBase64(bundle.iv);
    const cipherBytes = fromBase64(bundle.ciphertext);
    const plainBuf = await globalThis.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipherBytes
    );
    return new TextDecoder().decode(plainBuf);
  }

  const keyBytes = new TextEncoder().encode(await computeRealSha256(secretSeed));
  const cipherBytes = fromBase64(bundle.ciphertext);
  const out = new Uint8Array(cipherBytes.length);
  for (let i = 0; i < cipherBytes.length; i += 1) {
    out[i] = cipherBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return new TextDecoder().decode(out);
}

export async function appendAuditLog({ userId = 'default', actorEmail = '', action, details = '' }) {
  const timestamp = new Date().toISOString();
  const prevLogs = getAuditLogs(userId);
  const prevHash = prevLogs[0]?.integrityHash || 'GENESIS';
  const payload = `${timestamp}|${userId}|${action}|${details}|${prevHash}`;
  const integrityHash = await computeRealSha256(payload);

  const entry = {
    id: 'aud-' + Math.random().toString(36).substring(2, 10),
    timestamp,
    action,
    actorEmail: actorEmail || 'usuario@nutristudio.local',
    details,
    integrityHash
  };

  const storage = getStorage();
  if (storage) {
    const next = [entry, ...prevLogs].slice(0, 100);
    storage.setItem(`${AUDIT_LOG_PREFIX}${userId}`, JSON.stringify(next));
  }
  return entry;
}

export function getAuditLogs(userId = 'default') {
  const storage = getStorage();
  if (!storage) return [];
  const logs = safeJsonParse(storage.getItem(`${AUDIT_LOG_PREFIX}${userId}`), []);
  return Array.isArray(logs) ? logs : [];
}

/**
 * Empaqueta todos los datos personales para portabilidad (GDPR Art. 20 / Ley 1581 Colombia).
 */
export async function buildGdprExportPackage({ user, workspace }) {
  if (!user) throw new Error('Usuario requerido para exportar datos.');
  const consents = getGranularConsents(user.id);
  const subscription = getUserSubscriptionState(user.id);
  await appendAuditLog({
    userId: user.id,
    actorEmail: user.email,
    action: 'DATA_EXPORT_GDPR_1581',
    details: 'Exportación portátil de datos personales y clínicos (GDPR Art. 20 / Ley 1581 de Colombia)'
  });
  const auditLogs = getAuditLogs(user.id);
  const { passwordHash: _ph, passwordSalt: _ps, ...safeUser } = user;

  return {
    exportStandard: 'GDPR Art. 15/20 + Ley 1581 de 2012 (Colombia)',
    exportedAt: new Date().toISOString(),
    disclaimer: MANDATORY_HEALTH_DISCLAIMER,
    profile: safeUser,
    consents,
    subscription,
    workspace: workspace || {},
    auditLogs
  };
}

/**
 * Ejecuta el Derecho al Olvido / Supresión total (GDPR Art. 17 / Ley 1581).
 */
export async function purgeAllUserDataGdpr(userId) {
  const storage = getStorage();
  if (!storage || !userId) return { deleted: false };

  const users = safeJsonParse(storage.getItem('nutristudio_users_v3'), []);
  const filtered = (Array.isArray(users) ? users : []).filter(u => u.id !== userId);
  storage.setItem('nutristudio_users_v3', JSON.stringify(filtered));

  storage.removeItem(`nutristudio_workspace_v3_${userId}`);
  storage.removeItem(`${CONSENT_PREFIX}${userId}`);
  storage.removeItem(`${SUBSCRIPTION_PREFIX}${userId}`);
  storage.removeItem(`${AUDIT_LOG_PREFIX}${userId}`);
  storage.removeItem(`${NUTRITIONIST_PREFIX}${userId}`);

  if (storage.getItem('nutristudio_session_v3') === userId) {
    storage.removeItem('nutristudio_session_v3');
  }
  storage.removeItem('nutristudio_jwt_access');
  storage.removeItem('nutristudio_jwt_refresh');

  logStructuredEvent({
    level: 'INFO',
    category: 'PRIVACY_ERASURE',
    message: 'Cuenta y datos de usuario suprimidos completamente bajo GDPR / Ley 1581',
    context: { userIdLength: String(userId).length }
  });

  return {
    deleted: true,
    erasedAt: new Date().toISOString(),
    regulation: 'GDPR Art. 17 / Ley 1581 Colombia'
  };
}

// ============================================================================
// 3. SUSCRIPCIONES STRIPE (FREE / PRO), LÍMITES POR PLAN Y FACTURACIÓN
// ============================================================================

export const SUBSCRIPTION_PLANS = {
  FREE: {
    id: 'FREE',
    name: 'Plan Free',
    monthlyPriceUsd: 0,
    annualPriceUsd: 0,
    maxDailyRagQueries: 5,
    maxDailyVisionScans: 2,
    fhirConnector: false,
    nutritionistPortal: false,
    features: [
      'Hasta 5 consultas IA nutricionales al día',
      'Hasta 2 escaneos de plato o código al día',
      'Diario de comidas, agua, peso y rachas'
    ]
  },
  PRO: {
    id: 'PRO',
    name: 'Plan Pro Clínico',
    monthlyPriceUsd: 9.99,
    annualPriceUsd: 99,
    maxDailyRagQueries: 9999,
    maxDailyVisionScans: 9999,
    fhirConnector: true,
    nutritionistPortal: true,
    features: [
      'Consultas Coach IA y escaneos ilimitados',
      'Conector SMART on FHIR R4 y biomarcadores',
      'Portal para Nutricionistas + reportes PDF clínicos',
      'Exportación GDPR/Ley 1581 cifrada con AES-256-GCM'
    ]
  }
};

export function getUserSubscriptionState(userId = 'default') {
  const storage = getStorage();
  const base = {
    userId,
    planId: 'FREE',
    status: 'active',
    billingCycle: 'monthly',
    stripeCustomerId: '',
    stripeSubscriptionId: '',
    stripeMode: 'STRIPE_SANDBOX_READY',
    currentPeriodEnd: '',
    invoices: []
  };
  if (!storage) return base;
  const saved = safeJsonParse(storage.getItem(`${SUBSCRIPTION_PREFIX}${userId}`), null);
  return { ...base, ...(saved || {}) };
}

export function checkPlanFeatureAccess({ userId, feature, currentDailyCount = 0 }) {
  const sub = getUserSubscriptionState(userId);
  const plan = SUBSCRIPTION_PLANS[sub.planId] || SUBSCRIPTION_PLANS.FREE;

  if (feature === 'ragQuery') {
    const allowed = currentDailyCount < plan.maxDailyRagQueries;
    return {
      allowed,
      planId: plan.id,
      limit: plan.maxDailyRagQueries,
      used: currentDailyCount,
      reason: allowed
        ? ''
        : `Has alcanzado el límite diario de ${plan.maxDailyRagQueries} consultas del ${plan.name}. Actualiza a Plan Pro para consultas ilimitadas.`
    };
  }

  if (feature === 'visionScan') {
    const allowed = currentDailyCount < plan.maxDailyVisionScans;
    return {
      allowed,
      planId: plan.id,
      limit: plan.maxDailyVisionScans,
      used: currentDailyCount,
      reason: allowed
        ? ''
        : `Has alcanzado el límite diario de ${plan.maxDailyVisionScans} escaneos del ${plan.name}. Actualiza a Plan Pro.`
    };
  }

  return {
    allowed: Boolean(plan[feature]),
    planId: plan.id,
    reason: plan[feature] ? '' : `Función disponible en Plan Pro Clínico (actual: ${plan.name}).`
  };
}

export async function startStripeCheckoutSession({
  userId,
  email,
  planId = 'PRO',
  billingCycle = 'monthly',
  apiBaseUrl = ''
}) {
  const plan = SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS.PRO;
  const amountUsd = billingCycle === 'annual' ? plan.annualPriceUsd : plan.monthlyPriceUsd;
  const cleanBase = String(apiBaseUrl || '').replace(/\/$/, '');

  let backendSession = null;
  if (cleanBase) {
    try {
      const token = getStorage()?.getItem('nutristudio_jwt_access') || '';
      const res = await fetch(`${cleanBase}/billing/checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ planId: plan.id, billingCycle })
      });
      if (res.ok) {
        backendSession = await res.json();
      }
    } catch {
      // Continuar con registro sandbox local si el backend remoto no está activo
    }
  }

  const prev = getUserSubscriptionState(userId);
  const periodEnd = new Date(
    Date.now() + (billingCycle === 'annual' ? 365 : 30) * 24 * 60 * 60 * 1000
  )
    .toISOString()
    .slice(0, 10);

  const invoice = {
    id: 'inv_' + Math.random().toString(36).substring(2, 10),
    date: new Date().toISOString().slice(0, 10),
    amountUsd,
    planId: plan.id,
    billingCycle,
    status: backendSession?.mode === 'STRIPE_LIVE' ? 'pending_checkout' : 'paid_sandbox',
    checkoutUrl: backendSession?.checkoutUrl || ''
  };

  const next = {
    userId,
    planId: plan.id,
    status: 'active',
    billingCycle,
    stripeCustomerId:
      backendSession?.customerId || prev.stripeCustomerId || 'cus_sbx_' + userId.slice(0, 8),
    stripeSubscriptionId:
      backendSession?.subscriptionId || 'sub_sbx_' + Math.random().toString(36).substring(2, 9),
    stripeMode: backendSession?.mode || 'STRIPE_TEST_SANDBOX',
    currentPeriodEnd: periodEnd,
    invoices: [invoice, ...(prev.invoices || [])].slice(0, 20)
  };

  const storage = getStorage();
  if (storage) {
    storage.setItem(`${SUBSCRIPTION_PREFIX}${userId}`, JSON.stringify(next));
  }

  await appendAuditLog({
    userId,
    actorEmail: email,
    action: 'STRIPE_PLAN_CHANGED',
    details: `Suscripción actualizada a ${plan.name} (${billingCycle}, $${amountUsd} USD)`
  });

  await trackAnonymousProductEvent('subscription_upgraded', { planId: plan.id, billingCycle }, userId);
  return { subscription: next, checkoutUrl: backendSession?.checkoutUrl || '', invoice };
}

export async function cancelStripeSubscription(userId, email = '') {
  const prev = getUserSubscriptionState(userId);
  const next = {
    ...prev,
    planId: 'FREE',
    status: 'canceled_to_free',
    updatedAt: new Date().toISOString()
  };
  const storage = getStorage();
  if (storage) {
    storage.setItem(`${SUBSCRIPTION_PREFIX}${userId}`, JSON.stringify(next));
  }
  await appendAuditLog({
    userId,
    actorEmail: email,
    action: 'STRIPE_PLAN_CHANGED',
    details: 'Suscripción revertida a Plan Free'
  });
  return next;
}

// ============================================================================
// 4. PORTAL PARA NUTRICIONISTAS: PACIENTES, PLANES, NOTAS SOAP, CHAT Y PDF
// ============================================================================

export function loadNutritionistPortalState(user) {
  const storage = getStorage();
  const userId = user?.id || 'default';
  const saved = storage ? safeJsonParse(storage.getItem(`${NUTRITIONIST_PREFIX}${userId}`), null) : null;
  if (saved && Array.isArray(saved.patients) && saved.patients.length > 0) {
    return saved;
  }

  const initialPatient = {
    id: `pat-${userId}`,
    name: user?.name || 'Paciente Principal',
    email: user?.email || 'paciente@nutristudio.local',
    country: user?.country || 'CO',
    goal: user?.goal || 'mantenimiento',
    weightKg: Number(user?.weightKg) || 0,
    heightCm: Number(user?.heightCm) || 0,
    adherencePct: 82,
    fhirConnected: false,
    assignedPlan: {
      dailyCalories: Number(user?.dailyCalories) || 2000,
      targetProtein: Number(user?.targetProtein) || 130,
      targetCarbs: Number(user?.targetCarbs) || 215,
      targetFat: Number(user?.targetFat) || 65,
      clinicalProtocol:
        Array.isArray(user?.medicalConditions) && user.medicalConditions.length > 0
          ? user.medicalConditions.join(', ')
          : 'Guías generales OMS · FAO · ISSN',
      notes: 'Plan inicial listo para revisión y ajuste por nutricionista clínico.',
      assignedAt: new Date().toISOString().slice(0, 10),
      nutritionistName: 'Dra. Sofía Mendoza (Nutrición Clínica)'
    },
    clinicalNotes: [],
    chatMessages: [
      {
        id: 'chat-init-1',
        senderRole: 'NUTRITIONIST',
        senderName: 'Dra. Sofía Mendoza',
        text: 'Bienvenido al Portal Clínico. Comparte aquí tus dudas sobre porciones, tolerancia digestiva o tus metas de la semana.',
        sentAt: new Date().toISOString()
      }
    ]
  };

  const initialState = {
    nutritionistProfile: {
      name: 'Dra. Sofía Mendoza',
      credential: 'Nutricionista Dietista Clínica · Reg. MINSALUD-4821'
    },
    patients: [initialPatient],
    activePatientId: initialPatient.id
  };

  if (storage) {
    storage.setItem(`${NUTRITIONIST_PREFIX}${userId}`, JSON.stringify(initialState));
  }
  return initialState;
}

function saveNutritionistPortalState(userId, state) {
  const storage = getStorage();
  if (storage) {
    storage.setItem(`${NUTRITIONIST_PREFIX}${userId}`, JSON.stringify(state));
  }
  return state;
}

export function addNutritionistPatient(userId, patientInput) {
  const state = loadNutritionistPortalState({ id: userId });
  const newPatient = {
    id: 'pat-' + Math.random().toString(36).substring(2, 9),
    name: String(patientInput.name || '').trim() || 'Nuevo Paciente',
    email: String(patientInput.email || '').trim().toLowerCase(),
    country: patientInput.country || 'CO',
    goal: patientInput.goal || 'mantenimiento',
    weightKg: Number(patientInput.weightKg) || 0,
    heightCm: Number(patientInput.heightCm) || 0,
    adherencePct: 0,
    fhirConnected: false,
    assignedPlan: {
      dailyCalories: Number(patientInput.dailyCalories) || 2000,
      targetProtein: Number(patientInput.targetProtein) || 120,
      targetCarbs: Number(patientInput.targetCarbs) || 220,
      targetFat: Number(patientInput.targetFat) || 65,
      clinicalProtocol: patientInput.clinicalProtocol || 'Evaluación inicial OMS/FAO',
      notes: '',
      assignedAt: new Date().toISOString().slice(0, 10),
      nutritionistName: state.nutritionistProfile.name
    },
    clinicalNotes: [],
    chatMessages: []
  };

  const next = {
    ...state,
    patients: [...state.patients, newPatient],
    activePatientId: newPatient.id
  };
  saveNutritionistPortalState(userId, next);
  return { state: next, patient: newPatient };
}

export async function assignNutritionPlanToPatient(userId, patientId, planInput, actorEmail = '') {
  const state = loadNutritionistPortalState({ id: userId });
  const nextPatients = state.patients.map(p => {
    if (p.id !== patientId) return p;
    return {
      ...p,
      assignedPlan: {
        ...p.assignedPlan,
        dailyCalories: Number(planInput.dailyCalories) || p.assignedPlan.dailyCalories,
        targetProtein: Number(planInput.targetProtein) || p.assignedPlan.targetProtein,
        targetCarbs: Number(planInput.targetCarbs) || p.assignedPlan.targetCarbs,
        targetFat: Number(planInput.targetFat) || p.assignedPlan.targetFat,
        clinicalProtocol: planInput.clinicalProtocol || p.assignedPlan.clinicalProtocol,
        notes: planInput.notes ?? p.assignedPlan.notes,
        assignedAt: new Date().toISOString().slice(0, 10),
        nutritionistName: state.nutritionistProfile.name
      }
    };
  });
  const next = saveNutritionistPortalState(userId, { ...state, patients: nextPatients });
  await appendAuditLog({
    userId,
    actorEmail,
    action: 'NUTRITIONIST_PLAN_ASSIGNED',
    details: `Plan actualizado para paciente ${patientId}: ${planInput.dailyCalories} kcal (${planInput.clinicalProtocol || 'General'})`
  });
  return next;
}

export function addNutritionistClinicalNote(userId, patientId, { soapSection = 'SOAP', text }) {
  const cleanText = String(text || '').trim();
  if (!cleanText) throw new Error('La nota clínica no puede estar vacía.');
  const state = loadNutritionistPortalState({ id: userId });
  const note = {
    id: 'note-' + Math.random().toString(36).substring(2, 9),
    soapSection,
    text: cleanText,
    author: state.nutritionistProfile.name,
    createdAt: new Date().toISOString()
  };
  const nextPatients = state.patients.map(p =>
    p.id === patientId ? { ...p, clinicalNotes: [note, ...(p.clinicalNotes || [])] } : p
  );
  const next = saveNutritionistPortalState(userId, { ...state, patients: nextPatients });
  return { state: next, note };
}

export function sendNutritionistChatMessage(userId, patientId, { senderRole = 'NUTRITIONIST', senderName, text }) {
  const cleanText = String(text || '').trim();
  if (!cleanText) throw new Error('Escribe un mensaje antes de enviar.');
  const state = loadNutritionistPortalState({ id: userId });
  const message = {
    id: 'msg-' + Math.random().toString(36).substring(2, 9),
    senderRole,
    senderName:
      senderName || (senderRole === 'NUTRITIONIST' ? state.nutritionistProfile.name : 'Paciente'),
    text: cleanText,
    sentAt: new Date().toISOString()
  };
  const nextPatients = state.patients.map(p =>
    p.id === patientId ? { ...p, chatMessages: [...(p.chatMessages || []), message] } : p
  );
  const next = saveNutritionistPortalState(userId, { ...state, patients: nextPatients });
  return { state: next, message };
}

export function buildNutritionistPatientReportHtml(patient, nutritionistProfile) {
  if (!patient) return '';
  const plan = patient.assignedPlan || {};
  const notesHtml = (patient.clinicalNotes || []).length
    ? patient.clinicalNotes
        .map(
          n =>
            `<li><strong>[${escapeHtml(n.soapSection)}] ${escapeHtml(n.createdAt?.slice(0, 10))}:</strong> ${escapeHtml(n.text)} <em>(${escapeHtml(n.author)})</em></li>`
        )
        .join('')
    : '<li>Sin notas clínicas registradas aún.</li>';

  const chatHtml = (patient.chatMessages || []).length
    ? patient.chatMessages
        .slice(-12)
        .map(
          m =>
            `<li><strong>${escapeHtml(m.senderName)} (${escapeHtml(m.senderRole)}):</strong> ${escapeHtml(m.text)}</li>`
        )
        .join('')
    : '<li>Sin mensajes en el hilo clínico.</li>';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Reporte Nutricional Clínico — ${escapeHtml(patient.name)}</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; color: #0f172a; max-width: 820px; margin: 28px auto; padding: 0 18px; line-height: 1.5; }
    h1 { color: #0b7a5c; border-bottom: 2px solid #10b981; padding-bottom: 8px; }
    .box { border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; margin: 14px 0; }
    .disclaimer { background: #fff7ed; border: 1px solid #fdba74; padding: 10px 12px; border-radius: 8px; font-size: 13px; margin-top: 20px; }
  </style>
</head>
<body>
  <h1>Reporte Clínico de Nutrición — NutriStudio AI</h1>
  <p><strong>Profesional:</strong> ${escapeHtml(nutritionistProfile?.name || 'Nutricionista')} · ${escapeHtml(nutritionistProfile?.credential || '')}</p>
  <div class="box">
    <h3>Datos del Paciente</h3>
    <p><strong>Nombre:</strong> ${escapeHtml(patient.name)} · <strong>Correo:</strong> ${escapeHtml(patient.email)}</p>
    <p><strong>País:</strong> ${escapeHtml(patient.country)} · <strong>Objetivo:</strong> ${escapeHtml(patient.goal)} · <strong>Peso:</strong> ${escapeHtml(patient.weightKg)} kg · <strong>FHIR R4:</strong> ${patient.fhirConnected ? 'Conectado' : 'Sin conexión FHIR real activa'}</p>
  </div>
  <div class="box">
    <h3>Plan Nutricional Prescrito</h3>
    <p><strong>Meta diaria:</strong> ${escapeHtml(plan.dailyCalories)} kcal · Proteína: ${escapeHtml(plan.targetProtein)} g · Carbohidratos: ${escapeHtml(plan.targetCarbs)} g · Grasas: ${escapeHtml(plan.targetFat)} g</p>
    <p><strong>Protocolo clínico:</strong> ${escapeHtml(plan.clinicalProtocol)}</p>
    <p><strong>Indicaciones:</strong> ${escapeHtml(plan.notes || 'Sin observaciones adicionales.')}</p>
  </div>
  <div class="box">
    <h3>Notas Clínicas (SOAP)</h3>
    <ul>${notesHtml}</ul>
  </div>
  <div class="box">
    <h3>Resumen de Comunicación Clínico-Paciente</h3>
    <ul>${chatHtml}</ul>
  </div>
  <div class="disclaimer"><strong>Aviso obligatorio:</strong> ${MANDATORY_HEALTH_DISCLAIMER}</div>
</body>
</html>`;
}

export function openPrintableNutritionistPatientReport(patient, nutritionistProfile) {
  const html = buildNutritionistPatientReportHtml(patient, nutritionistProfile);
  if (typeof window === 'undefined') return html;
  const win = window.open('', '_blank', 'width=900,height=780');
  if (!win) return html;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
  return html;
}
