// Cliente de Autenticación de NutriStudio AI (JWT: /api/auth/register, /login, /refresh, /logout)
// REGLA ESTRICTA DE SEGURIDAD: NUNCA se guardan contraseñas en texto plano en localStorage.
// Cuando el backend Spring Boot (/api/auth/*) no está disponible localmente, utiliza una
// implementación simulada marcada con TODO que verifica credenciales mediante hash unidireccional
// SHA-256 con salt aleatorio y emite tokens JWT de sesión.

import { apiFetch, setJwtTokens, clearJwtTokens, getAccessToken, getRefreshToken } from './client';
import { computeRealSha256 } from '../services/userStorage';
import { getLocalTodayIso } from '../lib/nutritionCalculator';

const ACCOUNTS_INDEX_KEY = 'nutristudio_accounts_v4';
const ACTIVE_PROFILE_KEY = 'nutristudio_active_profile_v4';

function generateSalt() {
  try {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

async function deriveVerifier(password, salt) {
  let hash = await computeRealSha256(`nutristudio-v4:${salt}:${password}`);
  // Estiramiento iterativo de clave en cliente para reforzar el verificador local
  for (let i = 0; i < 16; i += 1) {
    hash = await computeRealSha256(`${hash}:${salt}:${i}`);
  }
  return hash;
}

function createSimulatedJwt(userId, email) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: userId,
      email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24
    })
  );
  return `${header}.${payload}.simulated-signature`;
}

function loadAccounts() {
  try {
    const raw = localStorage.getItem(ACCOUNTS_INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAccounts(accounts) {
  // Garantizar que ningún objeto lleve jamás 'password' o 'confirmPassword'
  const clean = accounts.map(({ password: _p, confirmPassword: _cp, ...safe }) => safe);
  localStorage.setItem(ACCOUNTS_INDEX_KEY, JSON.stringify(clean));
}

export function getStoredSessionProfile() {
  try {
    const raw = localStorage.getItem(ACTIVE_PROFILE_KEY);
    if (!raw) return null;
    const profile = JSON.parse(raw);
    if (!profile || !profile.id) return null;
    const { password: _p, verifier: _v, salt: _s, ...safe } = profile;
    return safe;
  } catch {
    return null;
  }
}

export function saveStoredSessionProfile(profile) {
  if (!profile) {
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
    return;
  }
  const { password: _p, confirmPassword: _cp, verifier: _v, salt: _s, ...safe } = profile;
  localStorage.setItem(ACTIVE_PROFILE_KEY, JSON.stringify(safe));
  // Sincronizar también en el índice de cuentas
  const accounts = loadAccounts();
  const idx = accounts.findIndex(a => a.id === safe.id || a.email === safe.email);
  if (idx >= 0) {
    accounts[idx] = { ...accounts[idx], ...safe };
    saveAccounts(accounts);
  }
}

export function evaluatePasswordStrength(password = '') {
  const pwd = String(password);
  let score = 0;
  if (pwd.length >= 8) score += 1;
  if (pwd.length >= 11) score += 1;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
  if (/\d/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

  const normalized = Math.min(4, score);
  const labels = ['Muy corta (mín. 8 caracteres)', 'Sencilla', 'Aceptable', 'Buena y segura', 'Excelente'];
  return {
    score: normalized,
    valid: pwd.length >= 8,
    label: pwd.length < 8 ? labels[0] : labels[normalized]
  };
}

/**
 * POST /api/auth/register
 * Registra al usuario y vuelca los datos de su onboarding al perfil.
 */
export async function registerWithOnboarding({
  name,
  email,
  password,
  acceptTerms,
  emailReminders = false,
  onboardingData = {},
  computedPlan = {}
}) {
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (cleanName.length < 2) {
    throw new Error('Cuéntanos cómo te llamas (al menos 2 letras).');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('Revisa tu correo electrónico; parece que le falta el @ o el dominio.');
  }
  if (!password || String(password).length < 8) {
    throw new Error('Tu contraseña debe tener al menos 8 caracteres para cuidar tu cuenta.');
  }
  if (!acceptTerms) {
    throw new Error('Para crear tu cuenta necesitas aceptar los términos y la política de privacidad.');
  }

  const profilePayload = {
    name: cleanName,
    email: cleanEmail,
    emailReminders: Boolean(emailReminders),
    goal: onboardingData.goal || 'comer_saludable',
    sex: onboardingData.sex || 'femenino',
    age: Number(onboardingData.age) || 28,
    heightCm: Number(computedPlan.heightCm || onboardingData.heightCm) || 168,
    weightKg: Number(computedPlan.weightKg || onboardingData.weightVal) || 68,
    targetWeightKg: Number(computedPlan.targetWeightKg || onboardingData.targetWeightVal) || 65,
    activityLevel: onboardingData.activityLevel || 'moderado',
    country: onboardingData.country || 'CO',
    city: onboardingData.city || 'Bogotá',
    dietType: onboardingData.dietType || 'omnivora',
    allergies: Array.isArray(onboardingData.allergies) ? onboardingData.allergies : [],
    customAllergy: onboardingData.customAllergy || '',
    healthConditions: Array.isArray(onboardingData.healthConditions) ? onboardingData.healthConditions : [],
    mealsPerDay: Number(onboardingData.mealsPerDay) || 4,
    mealSchedule: onboardingData.mealSchedule || '7:30 am · 1:00 pm · 4:30 pm · 8:00 pm',
    budgetTier: onboardingData.budgetTier || 'equilibrado',
    cookingTime: onboardingData.cookingTime || '30_min',
    dislikedFoods: onboardingData.dislikedFoods || '',
    dailyCalories: Number(computedPlan.dailyCalories) || 1950,
    targetCarbs: Number(computedPlan.targetCarbs) || 210,
    targetProtein: Number(computedPlan.targetProtein) || 125,
    targetFat: Number(computedPlan.targetFat) || 62,
    waterGoalMl: Number(computedPlan.waterGoalMl) || 2200,
    bmi: Number(computedPlan.bmi) || 22.8,
    safetyAdvisoryActive: Boolean(computedPlan.safetyAdvisoryActive),
    safetyMessage: computedPlan.safetyMessage || null,
    profileConfigured: true,
    createdAt: getLocalTodayIso()
  };

  try {
    const res = await apiFetch(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ ...profilePayload, password }),
        timeoutMs: 1800
      },
      false
    );
    if (res?.accessToken) {
      setJwtTokens(res.accessToken, res.refreshToken || '');
      const userObj = { id: res.user?.id || `usr-${Date.now()}`, ...profilePayload, ...(res.user || {}) };
      saveStoredSessionProfile(userObj);
      return { user: userObj, accessToken: res.accessToken, mode: 'backend' };
    }
  } catch {
    // TODO: El backend /api/auth/register no está corriendo localmente.
    // Se ejecuta el registro simulado con la misma interfaz y verificación SHA-256 sin guardar password.
  }

  const accounts = loadAccounts();
  if (accounts.some(a => a.email === cleanEmail)) {
    throw new Error('Ya existe una cuenta con ese correo. Puedes iniciar sesión directamente.');
  }

  const salt = generateSalt();
  const verifier = await deriveVerifier(password, salt);
  const userId = `usr-${Math.random().toString(36).slice(2, 10)}`;
  const accessToken = createSimulatedJwt(userId, cleanEmail);
  const refreshToken = createSimulatedJwt(userId, `${cleanEmail}:refresh`);

  const storedAccount = {
    id: userId,
    ...profilePayload,
    salt,
    verifier
  };

  saveAccounts([...accounts, storedAccount]);
  setJwtTokens(accessToken, refreshToken);
  const { salt: _s, verifier: _v, ...safeUser } = storedAccount;
  saveStoredSessionProfile(safeUser);

  return { user: safeUser, accessToken, mode: 'simulated-jwt' };
}

/**
 * POST /api/auth/login
 */
export async function loginWithEmail(email, password) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !password) {
    throw new Error('Ingresa tu correo y tu contraseña para entrar.');
  }

  try {
    const res = await apiFetch(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail, password }),
        timeoutMs: 1800
      },
      false
    );
    if (res?.accessToken) {
      setJwtTokens(res.accessToken, res.refreshToken || '');
      saveStoredSessionProfile(res.user);
      return { user: res.user, accessToken: res.accessToken, mode: 'backend' };
    }
  } catch {
    // TODO: Fallback simulado cuando el backend local está apagado
  }

  const accounts = loadAccounts();
  const found = accounts.find(a => a.email === cleanEmail);
  if (!found) {
    throw new Error('No encontramos una cuenta con ese correo. ¿Quieres crear tu plan primero?');
  }

  const candidateVerifier = await deriveVerifier(password, found.salt || '');
  if (candidateVerifier !== found.verifier) {
    throw new Error('La contraseña no coincide. Intenta de nuevo o usa "¿Olvidaste tu contraseña?".');
  }

  const accessToken = createSimulatedJwt(found.id, cleanEmail);
  const refreshToken = createSimulatedJwt(found.id, `${cleanEmail}:refresh`);
  setJwtTokens(accessToken, refreshToken);

  const { salt: _s, verifier: _v, ...safeUser } = found;
  saveStoredSessionProfile(safeUser);
  return { user: safeUser, accessToken, mode: 'simulated-jwt' };
}

/**
 *Continuar con Google (OAuth2 o simulación local marcada con TODO)
 */
export async function continueWithGoogleAccount({ onboardingData = {}, computedPlan = {} } = {}) {
  const demoEmail = 'camila.restrepo@gmail.com';
  const accounts = loadAccounts();
  let existing = accounts.find(a => a.email === demoEmail);

  if (!existing) {
    const res = await registerWithOnboarding({
      name: 'Camila Restrepo',
      email: demoEmail,
      password: 'GoogleOAuthTokenVerified2026!',
      acceptTerms: true,
      onboardingData,
      computedPlan
    });
    return res;
  }

  const accessToken = createSimulatedJwt(existing.id, demoEmail);
  setJwtTokens(accessToken, createSimulatedJwt(existing.id, `${demoEmail}:refresh`));
  const { salt: _s, verifier: _v, ...safeUser } = existing;
  saveStoredSessionProfile(safeUser);
  return { user: safeUser, accessToken, mode: 'simulated-google' };
}

/**
 * POST /api/auth/refresh
 */
export async function refreshSessionToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await apiFetch(
      '/auth/refresh',
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
        timeoutMs: 1500
      },
      false
    );
    if (res?.accessToken) {
      setJwtTokens(res.accessToken, res.refreshToken || refreshToken);
      return res.accessToken;
    }
  } catch {
    // TODO: Renovación simulada local
  }
  const profile = getStoredSessionProfile();
  if (!profile) return null;
  const nextAccess = createSimulatedJwt(profile.id, profile.email);
  setJwtTokens(nextAccess, refreshToken);
  return nextAccess;
}

/**
 * POST /api/auth/logout
 */
export async function logoutSession() {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await apiFetch(
        '/auth/logout',
        {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
          timeoutMs: 1200
        },
        false
      );
    }
  } catch {
    // TODO: Cierre de sesión local cuando el backend está desconectado
  } finally {
    clearJwtTokens();
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
  }
}

export async function requestPasswordRecovery(email) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('Escribe un correo electrónico válido para enviarte las instrucciones.');
  }
  return {
    sent: true,
    message: `Si ${cleanEmail} está registrado, recibirás un enlace para crear una nueva contraseña en los próximos minutos.`
  };
}

export function isAuthenticated() {
  return Boolean(getStoredSessionProfile() && getAccessToken());
}
