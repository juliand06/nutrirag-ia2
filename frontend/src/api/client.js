// Cliente HTTP con interceptor JWT (access + refresh automático)
// Conecta el frontend React con el backend Java Spring Boot (/api/*)
// manteniendo localStorage únicamente como caché offline de respaldo.

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api').replace(/\/$/, '');
const ACCESS_TOKEN_KEY = 'nutristudio_jwt_access';
const REFRESH_TOKEN_KEY = 'nutristudio_jwt_refresh';

export function getAccessToken() {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function getRefreshToken() {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setJwtTokens(accessToken, refreshToken) {
  try {
    if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } catch {
    // Ignore storage quota errors
  }
}

export function clearJwtTokens() {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // Ignore
  }
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    if (!res.ok) {
      clearJwtTokens();
      return false;
    }
    const data = await res.json();
    if (data?.accessToken) {
      setJwtTokens(data.accessToken, data.refreshToken || refreshToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Fetch autenticado con reintento automático tras refrescar el JWT (401).
 */
export async function apiFetch(path, options = {}, retryOn401 = true) {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || 3500;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...options, headers, signal: controller.signal });
    clearTimeout(timer);

    if (res.status === 401 && retryOn401) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return apiFetch(path, options, false);
      }
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `HTTP ${res.status}`);
    }
    return res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// Endpoints de Autenticación JWT + Google OAuth2
export async function apiRegister(payload) {
  const data = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  }, false);
  if (data?.accessToken) setJwtTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function apiLogin(email, password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }, false);
  if (data?.accessToken) setJwtTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function apiGoogleLogin(email, name, idToken = '') {
  const data = await apiFetch('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ email, name, idToken })
  }, false);
  if (data?.accessToken) setJwtTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function apiLogout() {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await apiFetch('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken })
      }, false);
    }
  } catch {
    // Offline logout
  } finally {
    clearJwtTokens();
  }
}

// Endpoints de Datos del Usuario en Postgres
export const apiGetProfile = () => apiFetch('/me/profile');
export const apiUpdateProfile = (body) =>
  apiFetch('/me/profile', { method: 'PUT', body: JSON.stringify(body) });
export const apiListMeals = () => apiFetch('/me/meals');
export const apiCreateMeal = (body) =>
  apiFetch('/me/meals', { method: 'POST', body: JSON.stringify(body) });
export const apiDeleteMeal = (mealId) =>
  apiFetch(`/me/meals/${encodeURIComponent(mealId)}`, { method: 'DELETE' });
export const apiListProgress = () => apiFetch('/me/progress');
export const apiCreateProgress = (body) =>
  apiFetch('/me/progress', { method: 'POST', body: JSON.stringify(body) });
export const apiRagQuery = (question, tenantId) =>
  apiFetch('/rag/query', { method: 'POST', body: JSON.stringify({ question, tenantId }) });
