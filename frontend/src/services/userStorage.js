const USERS_KEY = 'nutristudio_users_v3';
const SESSION_KEY = 'nutristudio_session_v3';
const WORKSPACE_PREFIX = 'nutristudio_workspace_v3_';

export const GOAL_OPTIONS = [
  {
    id: 'deficit_calorico',
    label: 'Pérdida de grasa (Déficit calórico)',
    kcalFactor: -400,
    carbsRatio: 0.4,
    proteinRatio: 0.32,
    fatRatio: 0.28
  },
  {
    id: 'mantenimiento',
    label: 'Bienestar y mantenimiento diario',
    kcalFactor: 0,
    carbsRatio: 0.45,
    proteinRatio: 0.27,
    fatRatio: 0.28
  },
  {
    id: 'control_carbohidratos',
    label: 'Control glucémico y carbohidratos',
    kcalFactor: -200,
    carbsRatio: 0.3,
    proteinRatio: 0.35,
    fatRatio: 0.35
  },
  {
    id: 'masa_muscular',
    label: 'Aumento de masa muscular',
    kcalFactor: 350,
    carbsRatio: 0.48,
    proteinRatio: 0.28,
    fatRatio: 0.24
  }
];

export function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getCurrentSessionUser() {
  try {
    const userId = localStorage.getItem(SESSION_KEY);
    if (!userId) return null;
    const users = loadUsers();
    return users.find(u => u.id === userId) || null;
  } catch {
    return null;
  }
}

export function setCurrentSessionUser(userId) {
  if (!userId) {
    localStorage.removeItem(SESSION_KEY);
  } else {
    localStorage.setItem(SESSION_KEY, userId);
  }
}

export function authenticateUser(email, password) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const users = loadUsers();
  const found = users.find(u => u.email.toLowerCase() === cleanEmail);
  if (!found) {
    throw new Error('No existe una cuenta registrada con ese correo electrónico.');
  }
  if (found.password !== password) {
    throw new Error('La contraseña ingresada es incorrecta.');
  }
  setCurrentSessionUser(found.id);
  return found;
}

export function registerNewUser({ name, email, password }) {
  const cleanName = (name || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();

  if (cleanName.length < 2) {
    throw new Error('Por favor ingresa tu nombre completo.');
  }
  if (!cleanEmail.includes('@') || cleanEmail.length < 5) {
    throw new Error('Ingresa un correo electrónico válido.');
  }
  if (!password || password.length < 4) {
    throw new Error('La contraseña debe tener al menos 4 caracteres.');
  }

  const users = loadUsers();
  if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
    throw new Error('Ya existe una cuenta registrada con este correo.');
  }

  // Todo usuario nuevo inicia con sus indicadores y metas en 0 hasta que los registre
  const newUser = {
    id: 'usr-' + Math.random().toString(36).substring(2, 10),
    name: cleanName,
    email: cleanEmail,
    password,
    profileConfigured: false,
    goal: '',
    weightKg: 0,
    heightCm: 0,
    age: 0,
    activityLevel: 'moderado',
    dailyCalories: 0,
    targetCarbs: 0,
    targetProtein: 0,
    targetFat: 0,
    waterGoalMl: 0,
    createdAt: getTodayIso()
  };

  const updated = [...users, newUser];
  saveUsers(updated);
  setCurrentSessionUser(newUser.id);
  getUserWorkspace(newUser);
  return newUser;
}

export function calculateRecommendedTargets({ weightKg, heightCm, age, activityLevel, goal }) {
  const w = Number(weightKg) || 0;
  const h = Number(heightCm) || 0;
  const a = Number(age) || 0;
  if (w <= 0 || h <= 0 || a <= 0) {
    return null;
  }
  // Ecuación de Mifflin-St Jeor promedio + factor de actividad
  const bmr = 10 * w + 6.25 * h - 5 * a;
  const mult =
    activityLevel === 'sedentario'
      ? 1.2
      : activityLevel === 'ligero'
        ? 1.375
        : activityLevel === 'intenso'
          ? 1.725
          : 1.55;
  const goalObj = GOAL_OPTIONS.find(g => g.id === goal) || GOAL_OPTIONS[1];
  const dailyCalories = Math.max(1200, Math.round(bmr * mult + goalObj.kcalFactor));
  const targetCarbs = Math.round((dailyCalories * goalObj.carbsRatio) / 4);
  const targetProtein = Math.round((dailyCalories * goalObj.proteinRatio) / 4);
  const targetFat = Math.round((dailyCalories * goalObj.fatRatio) / 9);
  const waterGoalMl = Math.round(w * 35);

  return {
    dailyCalories,
    targetCarbs,
    targetProtein,
    targetFat,
    waterGoalMl
  };
}

export function updateUserProfile(userId, changes) {
  const users = loadUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return null;
  const updatedUser = {
    ...users[idx],
    ...changes,
    profileConfigured: true
  };
  users[idx] = updatedUser;
  saveUsers(users);
  return updatedUser;
}

function buildEmptyWorkspace(user) {
  // Cuenta recién creada: 100% en 0 (sin comidas, sin conversaciones, sin documentos, sin seguimiento previo)
  return {
    userId: user.id,
    activeConversationId: null,
    conversations: [],
    mealLogs: [],
    documents: [],
    waterLogsByDate: {},
    weightHistory: []
  };
}

export function getUserWorkspace(user) {
  if (!user || !user.id) return null;
  const key = WORKSPACE_PREFIX + user.id;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const initial = buildEmptyWorkspace(user);
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    return {
      ...buildEmptyWorkspace(user),
      ...parsed
    };
  } catch {
    return buildEmptyWorkspace(user);
  }
}

export function saveUserWorkspace(userId, workspace) {
  if (!userId || !workspace) return;
  const key = WORKSPACE_PREFIX + userId;
  localStorage.setItem(key, JSON.stringify(workspace));
}

export async function computeRealSha256(textOrBuffer) {
  try {
    const encoder = new TextEncoder();
    const data =
      typeof textOrBuffer === 'string' ? encoder.encode(textOrBuffer) : textOrBuffer;
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }
}
