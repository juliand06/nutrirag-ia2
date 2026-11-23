import { create } from 'zustand';
import i18n from '../i18n';
import { getStoredSessionProfile, saveStoredSessionProfile, logoutSession } from '../api/authClient';
import { buildPersonalizedNutritionSummary } from '../lib/nutritionCalculator';
import { generateWeeklyPlan } from '../lib/mealPlanner';

const ONBOARDING_DRAFT_KEY = 'nutristudio_onboarding_draft_v4';
const WORKSPACE_KEY_PREFIX = 'nutristudio_ws_v4_';

export const DEFAULT_ONBOARDING_DRAFT = {
  step: 1,
  completed: false,
  goal: 'comer_saludable',
  sex: 'femenino',
  age: 29,
  heightUnit: 'cm',
  heightCm: 166,
  heightFeet: 5,
  heightInches: 5,
  weightUnit: 'kg',
  weightVal: 67,
  targetWeightVal: 63,
  activityLevel: 'moderado',
  country: 'CO',
  city: 'Medellín',
  dietType: 'omnivora',
  allergies: [],
  customAllergy: '',
  healthConditions: ['ninguna'],
  mealsPerDay: 4,
  mealSchedule: '7:30 am · 1:00 pm · 4:30 pm · 8:00 pm',
  budgetTier: 'equilibrado',
  cookingTime: '30_min',
  dislikedFoods: ''
};

function loadOnboardingDraft() {
  try {
    const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
    if (!raw) return DEFAULT_ONBOARDING_DRAFT;
    return { ...DEFAULT_ONBOARDING_DRAFT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_ONBOARDING_DRAFT;
  }
}

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

function loadWorkspaceForUser(user) {
  if (!user || !user.id) return null;
  const key = WORKSPACE_KEY_PREFIX + user.id;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  const initialPlan = generateWeeklyPlan({
    targetCalories: user.dailyCalories || 1950,
    dietStyle: user.dietType === 'vegetariana' || user.dietType === 'vegana' ? 'vegetariana' : 'equilibrada',
    countryId: user.country || 'CO'
  });

  const initialWs = {
    userId: user.id,
    mealLogs: [],
    waterGlassesByDate: {},
    weightHistory: [
      {
        id: 'w-init',
        date: getTodayIso(),
        weightKg: Number(user.weightKg) || 67,
        note: 'Peso al iniciar mi plan'
      }
    ],
    favoriteFoodIds: ['fd-aguacate', 'fd-huevo', 'fd-trucha'],
    recentFoodIds: ['fd-huevo', 'fd-avena', 'fd-aguacate', 'fd-pollo'],
    weeklyPlan: initialPlan,
    checkedGroceryIds: [],
    chatMessages: [
      {
        id: 'msg-welcome',
        role: 'assistant',
        text: `¡Hola, ${user.name.split(' ')[0]}! Soy tu coach nutricional en NutriStudio. Tengo presente que vives en ${user.city || 'tu ciudad'} (${user.country || 'CO'}), tu meta es de ${user.dailyCalories || 1950} kcal diarias y tus gustos. ¿Qué te provoca comer o revisar hoy?`,
        citations: []
      }
    ],
    notificationsEnabled: true
  };
  localStorage.setItem(key, JSON.stringify(initialWs));
  return initialWs;
}

function persistWorkspace(userId, ws) {
  if (!userId || !ws) return;
  localStorage.setItem(WORKSPACE_KEY_PREFIX + userId, JSON.stringify(ws));
}

export const useNutriStore = create((set, get) => {
  const initialUser = typeof window !== 'undefined' ? getStoredSessionProfile() : null;
  const initialWs = initialUser ? loadWorkspaceForUser(initialUser) : null;

  return {
    themeMode: typeof window !== 'undefined' ? localStorage.getItem('nutristudio_theme') || 'light' : 'light',
    language: typeof window !== 'undefined' ? localStorage.getItem('nutristudio_lang') || 'es' : 'es',
    unitSystem: typeof window !== 'undefined' ? localStorage.getItem('nutristudio_units') || 'metric' : 'metric',
    copilotOpen: false,
    quickAddOpen: false,
    backendOnline: false,
    toast: null,

    onboardingDraft: typeof window !== 'undefined' ? loadOnboardingDraft() : DEFAULT_ONBOARDING_DRAFT,
    currentUser: initialUser,
    workspace: initialWs,

    updateOnboardingDraft: (patch) =>
      set(state => {
        const next = { ...state.onboardingDraft, ...patch };
        try {
          localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return { onboardingDraft: next };
      }),

    resetOnboardingDraft: () =>
      set(() => {
        try {
          localStorage.removeItem(ONBOARDING_DRAFT_KEY);
        } catch {
          // ignore
        }
        return { onboardingDraft: DEFAULT_ONBOARDING_DRAFT };
      }),

    setAuthenticatedUser: (user) =>
      set(() => {
        if (!user) {
          return { currentUser: null, workspace: null };
        }
        saveStoredSessionProfile(user);
        const ws = loadWorkspaceForUser(user);
        return { currentUser: user, workspace: ws };
      }),

    updateUserProfile: (patch) =>
      set(state => {
        if (!state.currentUser) return {};
        const merged = { ...state.currentUser, ...patch };
        const recalculated = buildPersonalizedNutritionSummary({
          ...merged,
          weightVal: merged.weightKg,
          targetWeightVal: merged.targetWeightKg,
          heightUnit: 'cm',
          weightUnit: 'kg'
        });
        const nextUser = {
          ...merged,
          dailyCalories: patch.dailyCalories ?? recalculated.dailyCalories,
          targetCarbs: patch.targetCarbs ?? recalculated.targetCarbs,
          targetProtein: patch.targetProtein ?? recalculated.targetProtein,
          targetFat: patch.targetFat ?? recalculated.targetFat,
          waterGoalMl: patch.waterGoalMl ?? recalculated.waterGoalMl
        };
        saveStoredSessionProfile(nextUser);
        return { currentUser: nextUser };
      }),

    logout: async () => {
      await logoutSession();
      set({ currentUser: null, workspace: null });
    },

    addMealEntry: (mealEntry) =>
      set(state => {
        if (!state.currentUser || !state.workspace) return {};
        const entry = {
          id: `meal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          date: mealEntry.date || getTodayIso(),
          mealType: mealEntry.mealType || 'Almuerzo',
          dishName: mealEntry.dishName || 'Plato casero',
          grams: Number(mealEntry.grams) || 150,
          kcal: Math.round(Number(mealEntry.kcal) || 0),
          carbs: Math.round(Number(mealEntry.carbs) || 0),
          protein: Math.round(Number(mealEntry.protein) || 0),
          fat: Math.round(Number(mealEntry.fat) || 0),
          fiber: Math.round(Number(mealEntry.fiber) || 0),
          image: mealEntry.image || '/img/plato-almuerzo.webp',
          foodId: mealEntry.foodId || null
        };
        const recentFoodIds = entry.foodId
          ? [entry.foodId, ...(state.workspace.recentFoodIds || []).filter(id => id !== entry.foodId)].slice(0, 10)
          : state.workspace.recentFoodIds || [];
        const nextWs = {
          ...state.workspace,
          mealLogs: [entry, ...(state.workspace.mealLogs || [])],
          recentFoodIds
        };
        persistWorkspace(state.currentUser.id, nextWs);
        return {
          workspace: nextWs,
          toast: { message: `"${entry.dishName}" agregado a tu ${entry.mealType.toLowerCase()}.`, tone: 'emerald' }
        };
      }),

    updateMealPortion: (mealId, newGrams) =>
      set(state => {
        if (!state.currentUser || !state.workspace) return {};
        const g = Math.max(10, Number(newGrams) || 100);
        const nextLogs = (state.workspace.mealLogs || []).map(item => {
          if (item.id !== mealId) return item;
          const oldG = Math.max(1, Number(item.grams) || 100);
          const ratio = g / oldG;
          return {
            ...item,
            grams: g,
            kcal: Math.round(item.kcal * ratio),
            carbs: Math.round(item.carbs * ratio),
            protein: Math.round(item.protein * ratio),
            fat: Math.round(item.fat * ratio)
          };
        });
        const nextWs = { ...state.workspace, mealLogs: nextLogs };
        persistWorkspace(state.currentUser.id, nextWs);
        return { workspace: nextWs };
      }),

    deleteMealEntry: (mealId) =>
      set(state => {
        if (!state.currentUser || !state.workspace) return {};
        const nextWs = {
          ...state.workspace,
          mealLogs: (state.workspace.mealLogs || []).filter(m => m.id !== mealId)
        };
        persistWorkspace(state.currentUser.id, nextWs);
        return { workspace: nextWs };
      }),

    copyMealsFromDate: (sourceDate, targetDate) =>
      set(state => {
        if (!state.currentUser || !state.workspace) return {};
        const sourceMeals = (state.workspace.mealLogs || []).filter(m => m.date === sourceDate);
        if (sourceMeals.length === 0) {
          return {
            toast: { message: 'No encontramos comidas registradas en el día anterior para copiar.', tone: 'warm' }
          };
        }
        const cloned = sourceMeals.map(m => ({
          ...m,
          id: `meal-copy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          date: targetDate
        }));
        const nextWs = {
          ...state.workspace,
          mealLogs: [...cloned, ...(state.workspace.mealLogs || [])]
        };
        persistWorkspace(state.currentUser.id, nextWs);
        return {
          workspace: nextWs,
          toast: { message: `Se copiaron ${cloned.length} comidas del día anterior.`, tone: 'emerald' }
        };
      }),

    setWaterGlassesForDate: (date, glasses) =>
      set(state => {
        if (!state.currentUser || !state.workspace) return {};
        const safeG = Math.max(0, Math.min(16, Number(glasses) || 0));
        const nextWs = {
          ...state.workspace,
          waterGlassesByDate: {
            ...(state.workspace.waterGlassesByDate || {}),
            [date]: safeG
          }
        };
        persistWorkspace(state.currentUser.id, nextWs);
        return { workspace: nextWs };
      }),

    toggleFavoriteFood: (foodId) =>
      set(state => {
        if (!state.currentUser || !state.workspace) return {};
        const favs = state.workspace.favoriteFoodIds || [];
        const exists = favs.includes(foodId);
        const nextFavs = exists ? favs.filter(id => id !== foodId) : [foodId, ...favs];
        const nextWs = { ...state.workspace, favoriteFoodIds: nextFavs };
        persistWorkspace(state.currentUser.id, nextWs);
        return { workspace: nextWs };
      }),

    setWeeklyPlan: (weeklyPlan) =>
      set(state => {
        if (!state.currentUser || !state.workspace) return {};
        const nextWs = { ...state.workspace, weeklyPlan };
        persistWorkspace(state.currentUser.id, nextWs);
        return { workspace: nextWs };
      }),

    toggleGroceryItem: (itemId) =>
      set(state => {
        if (!state.currentUser || !state.workspace) return {};
        const checked = state.workspace.checkedGroceryIds || [];
        const nextChecked = checked.includes(itemId)
          ? checked.filter(id => id !== itemId)
          : [...checked, itemId];
        const nextWs = { ...state.workspace, checkedGroceryIds: nextChecked };
        persistWorkspace(state.currentUser.id, nextWs);
        return { workspace: nextWs };
      }),

    appendChatMessage: (msg) =>
      set(state => {
        if (!state.currentUser || !state.workspace) return {};
        const nextWs = {
          ...state.workspace,
          chatMessages: [...(state.workspace.chatMessages || []), msg]
        };
        persistWorkspace(state.currentUser.id, nextWs);
        return { workspace: nextWs };
      }),

    addWeightLog: (weightKg, note = '') =>
      set(state => {
        if (!state.currentUser || !state.workspace) return {};
        const w = Number(weightKg);
        if (!w || w < 25 || w > 300) return {};
        const entry = {
          id: `w-${Date.now()}`,
          date: getTodayIso(),
          weightKg: Number(w.toFixed(1)),
          note: note || 'Registro de seguimiento'
        };
        const nextWs = {
          ...state.workspace,
          weightHistory: [...(state.workspace.weightHistory || []), entry]
        };
        const nextUser = { ...state.currentUser, weightKg: entry.weightKg };
        saveStoredSessionProfile(nextUser);
        persistWorkspace(state.currentUser.id, nextWs);
        return {
          currentUser: nextUser,
          workspace: nextWs,
          toast: { message: `Peso actualizado: ${entry.weightKg} kg.`, tone: 'emerald' }
        };
      }),

    deleteAllUserData: async () => {
      const user = get().currentUser;
      if (user?.id) {
        localStorage.removeItem(WORKSPACE_KEY_PREFIX + user.id);
      }
      localStorage.removeItem(ONBOARDING_DRAFT_KEY);
      await logoutSession();
      set({ currentUser: null, workspace: null, onboardingDraft: DEFAULT_ONBOARDING_DRAFT });
    },

    toggleThemeMode: () =>
      set(state => {
        const next = state.themeMode === 'dark' ? 'light' : 'dark';
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', next);
          localStorage.setItem('nutristudio_theme', next);
        }
        return { themeMode: next };
      }),

    setLanguage: (lang) =>
      set(() => {
        const safe = lang === 'en' ? 'en' : 'es';
        if (typeof window !== 'undefined') {
          localStorage.setItem('nutristudio_lang', safe);
        }
        i18n.changeLanguage(safe);
        return { language: safe };
      }),

    toggleUnitSystem: () =>
      set(state => {
        const next = state.unitSystem === 'imperial' ? 'metric' : 'imperial';
        if (typeof window !== 'undefined') {
          localStorage.setItem('nutristudio_units', next);
        }
        return { unitSystem: next };
      }),

    setCopilotOpen: (val) =>
      set(state => ({
        copilotOpen: typeof val === 'function' ? val(state.copilotOpen) : Boolean(val)
      })),

    setQuickAddOpen: (val) =>
      set(state => ({
        quickAddOpen: typeof val === 'function' ? val(state.quickAddOpen) : Boolean(val)
      })),

    setBackendOnline: (online) => set({ backendOnline: Boolean(online) }),

    showToast: (message, tone = 'emerald') => set({ toast: { message, tone } }),
    clearToast: () => set({ toast: null })
  };
});
