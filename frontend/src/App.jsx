import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useNutriStore } from './store/useNutriStore';
import { formatWeight } from './i18n';
import { Skeleton, Toast } from './design-system';
import {
  apiLogin,
  apiRegister,
  apiLogout,
  apiUpdateProfile,
  apiCreateMeal,
  apiDeleteMeal,
  apiCreateProgress
} from './api/client';
import { runHybridRagQuery, MEAL_PRESETS, TOKEN_GOVERNANCE } from './services/nutriRagEngine';
import {
  COUNTRY_OPTIONS,
  BUDGET_OPTIONS,
  METABOLISM_OPTIONS,
  SEX_OPTIONS,
  buildProcessCoachPlan,
  computeMetabolicMetrics,
  getCountryProfile
} from './services/countryNutritionData';
import {
  MEDICAL_CONDITIONS,
  buildUserMemoryProfile,
  getActiveMedicalProtocols
} from './services/clinicalKnowledgeBase';
import {
  CLINICAL_INSTITUTIONS,
  buildInitialClinicalRecordForEmail,
  runFederatedClinicalDiscovery,
  evaluateClinicalReconciliationRubric
} from './services/clinicalSyncService';
import {
  FOOD_CATEGORIES,
  DIET_PRESETS,
  searchFoodDatabase,
  scaleFoodPortion,
  generateDailyMenuFromDatabase
} from './services/foodDatabase';
import {
  computeAiProgressIntelligence,
  evaluateDailyMealsWithAi,
  buildSmartShoppingList,
  computeAdaptiveTdeeCheckIn,
  openPrintableClinicalReport,
  computeProactiveDashboardInsights
} from './services/aiWorkflowEngine';
import { MIN_SAFE_DAILY_KCAL } from './services/clinicalSafetyGuard';
import {
  GOAL_OPTIONS,
  getTodayIso,
  loadUsers,
  getCurrentSessionUser,
  setCurrentSessionUser,
  authenticateUser,
  loginQuickAccount,
  registerNewUser,
  calculateRecommendedTargets,
  updateUserProfile,
  getUserWorkspace,
  saveUserWorkspace,
  computeRealSha256
} from './services/userStorage';
import HealthDisclaimer from './components/HealthDisclaimer';
import { renderFormattedText } from './components/FormattedText';
import LandingPage from './components/LandingPage';
import AuthOnboarding from './components/AuthOnboarding';
import SidebarNav from './components/SidebarNav';
import CopilotDrawer from './components/CopilotDrawer';
import HealthProgressSection from './components/HealthProgressSection';
import CalorieRing from './components/CalorieRing';
import WaterGlasses from './components/WaterGlasses';
import RetentionHubSection from './components/RetentionHubSection';
import WeeklyPlannerAndRecipes from './components/WeeklyPlannerAndRecipes';
import MobileBottomNav from './components/MobileBottomNav';
import { saveWorkspaceToIndexedDb } from './services/retentionEngine';
import { searchOpenFoodFactsCatalog } from './services/openFoodFactsService';

const BarcodeScannerPanel = lazy(() => import('./components/BarcodeScannerPanel'));
const NutritionChartsPanel = lazy(() => import('./components/NutritionChartsPanel'));

export default function App() {
  // SEGURIDAD: Ninguna clave de API se expone en el navegador; el backend proxy maneja las llamadas LLM si está activo.
  const [aiConfig] = useState({
    backendUrl: (import.meta.env.VITE_API_BASE_URL || '').trim()
  });

  const navigate = useNavigate();
  const location = useLocation();
  const themeMode = useNutriStore(s => s.themeMode);
  const toggleThemeMode = useNutriStore(s => s.toggleThemeMode);
  const unitSystem = useNutriStore(s => s.unitSystem);
  const copilotOpen = useNutriStore(s => s.copilotOpen);
  const setCopilotOpen = useNutriStore(s => s.setCopilotOpen);
  const quickAddOpen = useNutriStore(s => s.quickAddOpen);
  const setQuickAddOpen = useNutriStore(s => s.setQuickAddOpen);
  const toast = useNutriStore(s => s.toast);
  const showToast = useNutriStore(s => s.showToast);
  const clearToast = useNutriStore(s => s.clearToast);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  const sectionFromPath = (pathname) => {
    if (pathname.startsWith('/comidas')) return 'meals';
    if (pathname.startsWith('/asistente')) return 'chat';
    if (pathname.startsWith('/planes')) return 'documents';
    if (pathname.startsWith('/salud')) return 'analytics';
    if (pathname.startsWith('/perfil')) return 'profile';
    return 'summary';
  };

  const pathForSection = (sec) => {
    const map = {
      summary: '/dashboard',
      meals: '/comidas',
      chat: '/asistente',
      documents: '/planes',
      analytics: '/salud',
      profile: '/perfil'
    };
    return map[sec] || '/dashboard';
  };

  // Estado de Autenticación y Cuenta Activa
  const [currentUser, setCurrentUser] = useState(() => getCurrentSessionUser());
  const [showLanding, setShowLanding] = useState(true);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authError, setAuthError] = useState('');

  // Campos de Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Campos de Registro + Onboarding Biométrico en 3 pasos (estilo MyFitnessPal)
  const [regStep, setRegStep] = useState(1); // 1: Cuenta/País | 2: Cuerpo/Metabolismo | 3: Objetivo/Salud
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regCountry, setRegCountry] = useState('CO');
  const [regBudget, setRegBudget] = useState('equilibrado');
  const [regSex, setRegSex] = useState('no_especificado');
  const [regAge, setRegAge] = useState('');
  const [regWeight, setRegWeight] = useState('');
  const [regHeight, setRegHeight] = useState('');
  const [regActivity, setRegActivity] = useState('moderado');
  const [regMetabolism, setRegMetabolism] = useState('equilibrado');
  const [regGoal, setRegGoal] = useState('mantenimiento');
  const [regConditions, setRegConditions] = useState([]);

  // Espacio de trabajo persistente del usuario activo
  const [workspace, setWorkspace] = useState(() =>
    currentUser ? getUserWorkspace(currentUser) : null
  );
  const [activeSection, setActiveSectionState] = useState(() => sectionFromPath(location.pathname));
  const setActiveSection = (sec) => {
    setActiveSectionState(sec);
    const targetPath = pathForSection(sec);
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
  };
  useEffect(() => {
    if (currentUser) {
      setActiveSectionState(sectionFromPath(location.pathname));
    }
  }, [location.pathname, currentUser]);
  const [summaryTab, setSummaryTab] = useState('process'); // 'process' | 'tracking' | 'memory'
  const [analyticsTab, setAnalyticsTab] = useState('fhir'); // 'fhir' | 'telemetry'

  // Estado de Consultas (Chat)
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);

  // Estado de Escáner y Registro de Comidas (inicia vacío hasta que el usuario suba o registre un plato)
  const [mealEntryMode, setMealEntryMode] = useState('photo'); // 'photo' | 'database' | 'manual'
  const [foodSearchQuery, setFoodSearchQuery] = useState('');
  const [foodCategoryFilter, setFoodCategoryFilter] = useState('Todos');
  const [foodPortionById, setFoodPortionById] = useState({});
  const [externalOffFoods, setExternalOffFoods] = useState([]);
  const [isSearchingOff, setIsSearchingOff] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedDietPreset, setSelectedDietPreset] = useState('equilibrada');
  const [generatedMenu, setGeneratedMenu] = useState(null);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [customImagePreview, setCustomImagePreview] = useState(null);
  const [customMealNote, setCustomMealNote] = useState('');
  const [mealType, setMealType] = useState('Almuerzo');
  const [activeVisionResult, setActiveVisionResult] = useState(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [mealSavedNotice, setMealSavedNotice] = useState('');

  // Campos para registro manual de comida
  const [manualDishName, setManualDishName] = useState('');
  const [manualCalories, setManualCalories] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualFat, setManualFat] = useState('');

  // Estado de Documentos PDF del Usuario
  const [newDocName, setNewDocName] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [isIndexingDoc, setIsIndexingDoc] = useState(false);
  const [docIndexedNotice, setDocIndexedNotice] = useState('');

  // Estado de Edición de Perfil y Seguimiento Corporal (inicia en 0 para cuentas nuevas)
  const [profName, setProfName] = useState('');
  const [profGoal, setProfGoal] = useState('mantenimiento');
  const [profWeight, setProfWeight] = useState('0');
  const [profHeight, setProfHeight] = useState('0');
  const [profAge, setProfAge] = useState('0');
  const [profSex, setProfSex] = useState('no_especificado');
  const [profMetabolism, setProfMetabolism] = useState('equilibrado');
  const [profCountry, setProfCountry] = useState('CO');
  const [profBudget, setProfBudget] = useState('equilibrado');
  const [profMedicalConditions, setProfMedicalConditions] = useState([]);
  const [profPhysicalNotes, setProfPhysicalNotes] = useState('');
  const [profActivity, setProfActivity] = useState('moderado');
  const [profCalories, setProfCalories] = useState('0');
  const [profCarbs, setProfCarbs] = useState('0');
  const [profProtein, setProfProtein] = useState('0');
  const [profFat, setProfFat] = useState('0');
  const [profWaterGoal, setProfWaterGoal] = useState('0');
  const [profileSavedNotice, setProfileSavedNotice] = useState('');

  // Seguimiento de peso nuevo
  const [newWeightInput, setNewWeightInput] = useState('');
  const [newWeightNote, setNewWeightNote] = useState('');

  // Copiloto IA Omnipresente (estado global copilotOpen manejado por Zustand)
  const [copilotInput, setCopilotInput] = useState('');
  const [copilotReply, setCopilotReply] = useState(null);
  const [isCopilotLoading, setIsCopilotLoading] = useState(false);

  // Vinculación Clínica / Hospitalaria por correo (Gmail/Email)
  const [selectedInstitutionId, setSelectedInstitutionId] = useState(CLINICAL_INSTITUTIONS[0].id);
  const [clinicalConsentChecked, setClinicalConsentChecked] = useState(true);
  const [clinicalSyncNotice, setClinicalSyncNotice] = useState('');

  useEffect(() => {
    if (currentUser) {
      const ws = getUserWorkspace(currentUser);
      setWorkspace(ws);
      setProfName(currentUser.name || '');
      setProfGoal(currentUser.goal || 'mantenimiento');
      setProfWeight(String(currentUser.weightKg ?? 0));
      setProfHeight(String(currentUser.heightCm ?? 0));
      setProfAge(String(currentUser.age ?? 0));
      setProfSex(currentUser.sex || 'no_especificado');
      setProfMetabolism(currentUser.metabolismType || 'equilibrado');
      setProfCountry(currentUser.country || 'CO');
      setProfBudget(currentUser.budgetTier || 'equilibrado');
      setProfMedicalConditions(Array.isArray(currentUser.medicalConditions) ? currentUser.medicalConditions : []);
      setProfPhysicalNotes(currentUser.physicalNotes || '');
      setProfActivity(currentUser.activityLevel || 'moderado');
      setProfCalories(String(currentUser.dailyCalories ?? 0));
      setProfCarbs(String(currentUser.targetCarbs ?? 0));
      setProfProtein(String(currentUser.targetProtein ?? 0));
      setProfFat(String(currentUser.targetFat ?? 0));
      setProfWaterGoal(String(currentUser.waterGoalMl ?? 0));
      setActiveVisionResult(null);
      setCustomImagePreview(null);
    } else {
      setWorkspace(null);
    }
  }, [currentUser]);

  const updateWorkspace = (updater) => {
    if (!currentUser) return;
    setWorkspace(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveUserWorkspace(currentUser.id, next);
      saveWorkspaceToIndexedDb(currentUser.id, next);
      return next;
    });
  };

  // ============================================================================
  // MANEJADORES DE AUTENTICACIÓN
  // ============================================================================
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      // Intenta autenticación JWT real contra Spring Boot; si está offline usa caché local con hash SHA-256
      try {
        const apiRes = await apiLogin(loginEmail, loginPassword);
        if (apiRes?.user) {
          setCurrentUser(apiRes.user);
          setActiveSection('summary');
          return;
        }
      } catch {
        // Fallback offline a caché local
      }
      const user = await authenticateUser(loginEmail, loginPassword);
      setCurrentUser(user);
      setActiveSection('summary');
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const payload = {
        name: regName,
        email: regEmail,
        password: regPassword,
        country: regCountry,
        budgetTier: regBudget,
        sex: regSex,
        age: Number(regAge) || 0,
        weightKg: Number(regWeight) || 0,
        heightCm: Number(regHeight) || 0,
        activityLevel: regActivity,
        metabolismType: regMetabolism,
        goal: regGoal,
        medicalConditions: regConditions
      };
      // Sincroniza registro en Postgres/Spring Security (BCrypt + JWT) si el backend está online
      apiRegister(payload).catch(() => {});
      const user = await registerNewUser(payload);
      setCurrentUser(user);
      setRegStep(1);
      setActiveSection('summary');
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleQuickLogin = (userId) => {
    setAuthError('');
    try {
      const user = loginQuickAccount(userId);
      setCurrentUser(user);
      setActiveSection('summary');
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    apiLogout();
    setCurrentSessionUser(null);
    setCurrentUser(null);
    setShowLanding(true);
    navigate('/');
    setLoginEmail('');
    setLoginPassword('');
    setRegName('');
    setRegEmail('');
    setRegPassword('');
  };

  // ============================================================================
  // CÁLCULO DE PROGRESO DIARIO DEL USUARIO (EMPIEZA EN 0)
  // ============================================================================
  const todayIso = getTodayIso();
  const mealsToday = (workspace?.mealLogs || []).filter(m => m.date === todayIso);
  const consumedKcal = mealsToday.reduce((acc, m) => acc + Number(m.totalCalories || 0), 0);
  const consumedCarbs = mealsToday.reduce((acc, m) => acc + Number(m.carbsGrams || 0), 0);
  const consumedProtein = mealsToday.reduce((acc, m) => acc + Number(m.proteinGrams || 0), 0);
  const consumedFat = mealsToday.reduce((acc, m) => acc + Number(m.fatGrams || 0), 0);
  const waterTodayMl = Number(workspace?.waterLogsByDate?.[todayIso] || 0);

  // ============================================================================
  // MANEJADORES DE CONVERSACIONES Y CHAT NUTRICIONAL
  // ============================================================================
  const activeConversation =
    workspace?.conversations?.find(c => c.id === workspace.activeConversationId) ||
    workspace?.conversations?.[0] ||
    null;

  const handleNewConversation = () => {
    const newId = 'conv-' + Math.random().toString(36).substring(2, 8);
    const newThread = {
      id: newId,
      title: 'Nueva consulta nutricional',
      updatedAt: todayIso,
      messages: [
        {
          id: 'msg-' + Date.now(),
          role: 'assistant',
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          guardrailTriggered: false,
          text: `Hola, **${currentUser.name.split(' ')[0]}**. Estoy conectado a tu seguimiento diario (${consumedKcal} / ${currentUser.dailyCalories || 0} kcal registradas hoy). ¿En qué te puedo orientar sobre tus comidas, macronutrientes o documentos?`,
          citations: []
        }
      ]
    };
    updateWorkspace(prev => ({
      ...prev,
      activeConversationId: newId,
      conversations: [newThread, ...(prev.conversations || [])]
    }));
  };

  const handleDeleteConversation = (convId) => {
    updateWorkspace(prev => {
      const filtered = (prev.conversations || []).filter(c => c.id !== convId);
      const nextActive =
        prev.activeConversationId === convId
          ? filtered[0]?.id || null
          : prev.activeConversationId;
      return {
        ...prev,
        activeConversationId: nextActive,
        conversations: filtered
      };
    });
  };

  const handleSendQuestion = async (forcedQuestion) => {
    const q = (forcedQuestion !== undefined ? forcedQuestion : chatInput).trim();
    if (!q || isSendingChat) return;

    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = {
      id: 'usr-' + Date.now(),
      role: 'user',
      createdAt: timeNow,
      text: q
    };

    if (forcedQuestion === undefined) setChatInput('');
    setIsSendingChat(true);

    let targetConvId = activeConversation?.id;

    if (!targetConvId) {
      targetConvId = 'conv-' + Math.random().toString(36).substring(2, 8);
      const firstThread = {
        id: targetConvId,
        title: q.slice(0, 42) + (q.length > 42 ? '…' : ''),
        updatedAt: todayIso,
        messages: [userMsg]
      };
      updateWorkspace(prev => ({
        ...prev,
        activeConversationId: targetConvId,
        conversations: [firstThread, ...(prev.conversations || [])]
      }));
    } else {
      updateWorkspace(prev => ({
        ...prev,
        conversations: prev.conversations.map(c => {
          if (c.id !== targetConvId) return c;
          const shouldRename = c.title === 'Nueva consulta nutricional';
          return {
            ...c,
            title: shouldRename ? q.slice(0, 42) + (q.length > 42 ? '…' : '') : c.title,
            updatedAt: todayIso,
            messages: [...c.messages, userMsg]
          };
        })
      }));
    }

    const dailyTracking = {
      consumedKcal,
      consumedCarbs,
      consumedProtein,
      consumedFat,
      waterTodayMl,
      mealsTodayCount: mealsToday.length
    };

    const currentMemory = buildUserMemoryProfile({
      userProfile: currentUser,
      workspace,
      dailyTracking
    });

    const todayTokenStats = workspace?.tokenUsageByDate?.[todayIso] || {
      used: 0,
      saved: 0,
      queries: 0
    };

    const activeClinicalRec = workspace?.clinicalRecord || null;
    const activeClinicalRubric = evaluateClinicalReconciliationRubric({
      userProfile: currentUser,
      clinicalRecord: activeClinicalRec
    });

    const t0 = performance.now();
    const result = await runHybridRagQuery(
      q,
      workspace?.documents || [],
      aiConfig,
      currentUser,
      dailyTracking,
      currentMemory,
      { tokensUsedToday: todayTokenStats.used },
      activeClinicalRec ? { clinicalRecord: activeClinicalRec, rubric: activeClinicalRubric } : null
    );
    const latencyMs = Math.max(1, Math.round(performance.now() - t0));

    const botMsg = {
      id: 'bot-' + Date.now(),
      role: 'assistant',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      guardrailTriggered: result.guardrailTriggered,
      text: result.answer,
      citations: result.citations || [],
      tokenMetrics: result.tokenMetrics || null
    };

    const deltaUsed = Number(result.tokenMetrics?.tokensUsed || 0);
    const deltaSaved = Number(result.tokenMetrics?.tokensSaved || 0);
    const routingMode = result.tokenMetrics?.mode || 'rag-local-0-tokens';

    updateWorkspace(prev => {
      const prevDay = prev.tokenUsageByDate?.[todayIso] || { used: 0, saved: 0, queries: 0 };
      const prevTelemetry = Array.isArray(prev.aiTelemetry) ? prev.aiTelemetry : [];
      const newEvent = {
        id: 'tel-' + Date.now(),
        date: todayIso,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        screen: activeSection,
        mode: routingMode,
        tokensUsed: deltaUsed,
        tokensSaved: deltaSaved,
        latencyMs
      };
      return {
        ...prev,
        aiTelemetry: [newEvent, ...prevTelemetry].slice(0, 60),
        tokenUsageByDate: {
          ...(prev.tokenUsageByDate || {}),
          [todayIso]: {
            used: prevDay.used + deltaUsed,
            saved: prevDay.saved + deltaSaved,
            queries: prevDay.queries + 1
          }
        },
        conversations: prev.conversations.map(c =>
          c.id === targetConvId
            ? { ...c, updatedAt: todayIso, messages: [...c.messages, botMsg] }
            : c
        )
      };
    });
    setIsSendingChat(false);
  };

  // ============================================================================
  // MANEJADORES DE ANÁLISIS Y REGISTRO DE COMIDAS POR USUARIO
  // ============================================================================
  const handleSelectMealPreset = (preset) => {
    setCustomImagePreview(null);
    setActiveVisionResult(preset.analysis);
    setMealSavedNotice('');
  };

  const handleUploadCustomMealImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      setCustomImagePreview(dataUrl);
      setIsAnalyzingImage(true);
      setMealSavedNotice('');

      const lowerName = (file.name + ' ' + customMealNote).toLowerCase();

      if (aiConfig.backendUrl) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('note', customMealNote || '');
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2200);
          const res = await fetch(`${aiConfig.backendUrl.replace(/\/$/, '')}/vision/analyze`, {
            method: 'POST',
            body: formData,
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (res.ok) {
            const parsed = await res.json();
            setIsAnalyzingImage(false);
            setActiveVisionResult({
              isFoodValid: Boolean(parsed.isFoodValid),
              dishName: parsed.dishName || file.name,
              totalCalories: Number(parsed.totalCalories || 0),
              carbsGrams: Number(parsed.carbsGrams || 0),
              proteinGrams: Number(parsed.proteinGrams || 0),
              fatGrams: Number(parsed.fatGrams || 0),
              fiberGrams: Number(parsed.fiberGrams || 0),
              glycemicLoad: parsed.glycemicLoad || 'Media',
              ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
              nutritionalAdvice: parsed.nutritionalAdvice || 'Análisis completado.'
            });
            return;
          }
        } catch {
          // Respaldo local si el backend no está disponible
        }
      }

      setTimeout(() => {
        setIsAnalyzingImage(false);
        if (
          lowerName.includes('error') ||
          lowerName.includes('codigo') ||
          lowerName.includes('auto') ||
          lowerName.includes('no-comida')
        ) {
          setActiveVisionResult(MEAL_PRESETS[4].analysis);
        } else if (lowerName.includes('salmon') || lowerName.includes('pescado')) {
          setActiveVisionResult(MEAL_PRESETS[1].analysis);
        } else if (lowerName.includes('avena') || lowerName.includes('desayuno')) {
          setActiveVisionResult(MEAL_PRESETS[2].analysis);
        } else if (lowerName.includes('hamburguesa') || lowerName.includes('pizza')) {
          setActiveVisionResult(MEAL_PRESETS[3].analysis);
        } else {
          setActiveVisionResult({
            ...MEAL_PRESETS[0].analysis,
            dishName: customMealNote.trim() || `Plato analizado (${file.name})`
          });
        }
      }, 450);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveMealToAccount = () => {
    if (!activeVisionResult || !activeVisionResult.isFoodValid) return;
    const newEntry = {
      id: 'meal-' + Date.now(),
      date: todayIso,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mealType,
      dishName: activeVisionResult.dishName,
      totalCalories: activeVisionResult.totalCalories,
      carbsGrams: activeVisionResult.carbsGrams,
      proteinGrams: activeVisionResult.proteinGrams,
      fatGrams: activeVisionResult.fatGrams,
      fiberGrams: activeVisionResult.fiberGrams || 0,
      glycemicLoad: activeVisionResult.glycemicLoad || 'Media',
      nutritionalAdvice: activeVisionResult.nutritionalAdvice,
      imagePreview: customImagePreview || null
    };

    updateWorkspace(prev => ({
      ...prev,
      mealLogs: [newEntry, ...(prev.mealLogs || [])]
    }));
    apiCreateMeal(newEntry).catch(() => {});
    setMealSavedNotice('Comida guardada en tu seguimiento diario.');
    setTimeout(() => setMealSavedNotice(''), 3500);
  };

  const handleSaveManualMeal = (e) => {
    e.preventDefault();
    if (!manualDishName.trim()) return;
    const newEntry = {
      id: 'meal-' + Date.now(),
      date: todayIso,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mealType,
      dishName: manualDishName.trim(),
      totalCalories: Math.max(0, Number(manualCalories) || 0),
      carbsGrams: Math.max(0, Number(manualCarbs) || 0),
      proteinGrams: Math.max(0, Number(manualProtein) || 0),
      fatGrams: Math.max(0, Number(manualFat) || 0),
      fiberGrams: 0,
      glycemicLoad: 'Registrado manualmente',
      nutritionalAdvice: 'Registro ingresado de forma manual por el usuario.',
      imagePreview: null
    };

    updateWorkspace(prev => ({
      ...prev,
      mealLogs: [newEntry, ...(prev.mealLogs || [])]
    }));
    setManualDishName('');
    setManualCalories('');
    setManualCarbs('');
    setManualProtein('');
    setManualFat('');
    setMealSavedNotice('Comida agregada a tu seguimiento.');
    setTimeout(() => setMealSavedNotice(''), 3500);
  };

  const handleDeleteMealLog = (mealId) => {
    apiDeleteMeal(mealId).catch(() => {});
    updateWorkspace(prev => ({
      ...prev,
      mealLogs: (prev.mealLogs || []).filter(m => m.id !== mealId)
    }));
  };

  const handleAddFoodFromDb = (food) => {
    const grams = Number(foodPortionById[food.id]) || food.defaultGrams || 100;
    const scaled = scaleFoodPortion(food, grams);
    const newEntry = {
      id: 'meal-db-' + Date.now(),
      date: todayIso,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mealType,
      dishName: `${food.name} (${scaled.grams}g)`,
      totalCalories: scaled.kcal,
      carbsGrams: scaled.carbs,
      proteinGrams: scaled.protein,
      fatGrams: scaled.fat,
      fiberGrams: scaled.fiber,
      sodiumMg: scaled.sodiumMg,
      potassiumMg: scaled.potassiumMg,
      vitaminCMg: scaled.vitaminCMg,
      qualityScore: food.qualityScore,
      nutriGrade: food.nutriGrade,
      glycemicLoad: `IG ${food.glycemicIndex} · NOVA ${food.novaGroup}`,
      nutritionalAdvice: food.clinicalTag,
      imagePreview: null
    };
    updateWorkspace(prev => ({
      ...prev,
      mealLogs: [newEntry, ...(prev.mealLogs || [])]
    }));
    apiCreateMeal(newEntry).catch(() => {});
    setMealSavedNotice(`"${food.name}" (${scaled.grams}g · Nutri-Score ${food.nutriGrade}) agregado a tu día.`);
    setTimeout(() => setMealSavedNotice(''), 3500);
  };

  const handleAddGeneratedMealToDay = (genMeal) => {
    const newEntry = {
      id: 'meal-gen-' + Date.now() + Math.random().toString(36).slice(2, 5),
      date: todayIso,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mealType: genMeal.mealType,
      dishName: genMeal.dishName,
      totalCalories: genMeal.kcal,
      carbsGrams: genMeal.carbs,
      proteinGrams: genMeal.protein,
      fatGrams: genMeal.fat,
      fiberGrams: genMeal.fiber,
      sodiumMg: genMeal.sodiumMg,
      potassiumMg: genMeal.potassiumMg,
      vitaminCMg: genMeal.vitaminCMg,
      qualityScore: genMeal.avgQuality,
      nutriGrade: genMeal.nutriGrade,
      glycemicLoad: `Menú IA · Calidad ${genMeal.avgQuality}/100`,
      nutritionalAdvice: `Generado automáticamente por NutriStudio según tu país y meta calórica.`,
      imagePreview: null
    };
    updateWorkspace(prev => ({
      ...prev,
      mealLogs: [newEntry, ...(prev.mealLogs || [])]
    }));
  };

  const handleAdjustWater = (deltaMl) => {
    updateWorkspace(prev => {
      const current = Number(prev.waterLogsByDate?.[todayIso] || 0);
      const nextVal = Math.max(0, current + deltaMl);
      return {
        ...prev,
        waterLogsByDate: {
          ...(prev.waterLogsByDate || {}),
          [todayIso]: nextVal
        }
      };
    });
  };

  const handleAddWeightRecord = (e) => {
    e.preventDefault();
    const w = Number(newWeightInput);
    if (!w || w <= 20) return;

    const record = {
      id: 'w-' + Date.now(),
      date: todayIso,
      weightKg: w,
      note: newWeightNote.trim() || 'Control periódico'
    };

    updateWorkspace(prev => ({
      ...prev,
      weightHistory: [record, ...(prev.weightHistory || [])]
    }));

    const updatedUser = updateUserProfile(currentUser.id, { weightKg: w });
    if (updatedUser) setCurrentUser(updatedUser);

    setNewWeightInput('');
    setNewWeightNote('');
  };

  // ============================================================================
  // MANEJADORES DE DOCUMENTOS PDF PRIVADOS POR USUARIO
  // ============================================================================
  const handleFileUploadPdf = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewDocName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const raw = decoder.decode(buffer);
      const readable = raw
        .replace(/[^\x20-\x7EáéíóúÁÉÍÓÚñÑüÜ.,;:()\-/%+\n]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (readable.length > 80 && !file.name.toLowerCase().endsWith('.pdf')) {
        setNewDocContent(readable.slice(0, 2000));
      } else if (!newDocContent.trim()) {
        setNewDocContent(
          `Documento cargado por ${currentUser.name} (${file.name}). Pautas nutricionales registradas para consulta personal.`
        );
      }
    } catch {
      // Mantiene contenido actual
    }
  };

  const handleAddDocumentToAccount = async (e) => {
    e.preventDefault();
    const content = newDocContent.trim();
    if (!content) return;

    setIsIndexingDoc(true);
    setDocIndexedNotice('');

    const rawName = newDocName.trim() || 'Plan_Nutricional_Personal.pdf';
    const finalName = rawName.endsWith('.pdf') ? rawName : `${rawName}.pdf`;
    const sha256 = await computeRealSha256(finalName + content);

    const paragraphs = content
      .split(/\n+/)
      .map(p => p.trim())
      .filter(Boolean);
    const chunks = (paragraphs.length > 0 ? paragraphs : [content]).map((text, idx) => ({
      id: `chk-${Date.now()}-${idx}`,
      pageNumber: idx + 1,
      sectionTitle: `Sección ${idx + 1}`,
      chunkOrder: idx + 1,
      tokenCount: Math.max(120, text.split(/\s+/).length * 2),
      content: text
    }));

    const newDoc = {
      id: 'doc-' + Date.now(),
      tenantId: currentUser.id,
      ownerUsername: currentUser.email,
      fileName: finalName,
      sha256Hash: sha256,
      totalPages: chunks.length,
      totalChunks: chunks.length,
      ocrApplied: false,
      tempFileDeleted: true,
      createdAt: todayIso,
      chunks
    };

    setTimeout(() => {
      updateWorkspace(prev => ({
        ...prev,
        documents: [newDoc, ...(prev.documents || [])]
      }));
      setIsIndexingDoc(false);
      setNewDocName('');
      setNewDocContent('');
      setDocIndexedNotice('Documento indexado en tu cuenta (copia temporal eliminada).');
      setTimeout(() => setDocIndexedNotice(''), 4000);
    }, 350);
  };

  const handleDeleteDocument = (docId) => {
    updateWorkspace(prev => ({
      ...prev,
      documents: (prev.documents || []).filter(d => d.id !== docId)
    }));
  };

  const handleCopilotAsk = async (forcedText) => {
    const q = (forcedText !== undefined ? forcedText : copilotInput).trim();
    if (!q || isCopilotLoading || !currentUser || !workspace) return;
    if (forcedText === undefined) setCopilotInput('');
    setIsCopilotLoading(true);

    const dailyTracking = {
      consumedKcal,
      consumedCarbs,
      consumedProtein,
      consumedFat,
      waterTodayMl,
      mealsCount: mealsToday.length
    };
    const currentMemory = buildUserMemoryProfile({
      userProfile: currentUser,
      workspace,
      dailyTracking
    });
    const todayStats = workspace?.tokenUsageByDate?.[todayIso] || { used: 0, saved: 0, queries: 0 };

    const activeClinicalRec = workspace?.clinicalRecord || null;
    const activeClinicalRubric = evaluateClinicalReconciliationRubric({
      userProfile: currentUser,
      clinicalRecord: activeClinicalRec
    });

    const t0 = performance.now();
    const res = await runHybridRagQuery(
      q,
      workspace?.documents || [],
      aiConfig,
      currentUser,
      dailyTracking,
      currentMemory,
      { tokensUsedToday: todayStats.used },
      activeClinicalRec ? { clinicalRecord: activeClinicalRec, rubric: activeClinicalRubric } : null
    );
    const latencyMs = Math.max(1, Math.round(performance.now() - t0));
    const deltaUsed = Number(res.tokenMetrics?.tokensUsed || 0);
    const deltaSaved = Number(res.tokenMetrics?.tokensSaved || 0);

    setCopilotReply({
      question: q,
      answer: res.answer,
      mode: res.tokenMetrics?.mode || 'rag-local-0-tokens',
      tokensUsed: deltaUsed,
      latencyMs
    });

    updateWorkspace(prev => {
      const prevDay = prev.tokenUsageByDate?.[todayIso] || { used: 0, saved: 0, queries: 0 };
      const prevTel = Array.isArray(prev.aiTelemetry) ? prev.aiTelemetry : [];
      return {
        ...prev,
        aiTelemetry: [
          {
            id: 'tel-cop-' + Date.now(),
            date: todayIso,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            screen: `copilot:${activeSection}`,
            mode: res.tokenMetrics?.mode || 'rag-local-0-tokens',
            tokensUsed: deltaUsed,
            tokensSaved: deltaSaved,
            latencyMs
          },
          ...prevTel
        ].slice(0, 60),
        tokenUsageByDate: {
          ...(prev.tokenUsageByDate || {}),
          [todayIso]: {
            used: prevDay.used + deltaUsed,
            saved: prevDay.saved + deltaSaved,
            queries: prevDay.queries + 1
          }
        }
      };
    });
    setIsCopilotLoading(false);
  };

  const handleSyncClinicByEmail = () => {
    if (!currentUser) return;
    if (!clinicalConsentChecked) {
      setClinicalSyncNotice(
        'Debes autorizar el consentimiento informado (SMART on FHIR) antes de consultar tu expediente.'
      );
      return;
    }
    const synced = buildInitialClinicalRecordForEmail({
      email: currentUser.email,
      institutionId: selectedInstitutionId,
      userWeightKg: currentUser.weightKg
    });
    updateWorkspace(prev => ({
      ...prev,
      clinicalRecord: synced
    }));
    setClinicalSyncNotice(
      `Expediente clínico vinculado mediante ${currentUser.email} (${synced.institutionName}).`
    );
    setTimeout(() => setClinicalSyncNotice(''), 4500);
  };

  const handleFederatedHospitalDiscovery = () => {
    if (!currentUser) return;
    try {
      const consolidated = runFederatedClinicalDiscovery({
        email: currentUser.email,
        userWeightKg: currentUser.weightKg,
        consentGranted: clinicalConsentChecked
      });
      updateWorkspace(prev => ({
        ...prev,
        clinicalRecord: consolidated
      }));
      setClinicalSyncNotice(
        `Red Federada HL7 FHIR consultada con éxito para ${currentUser.email}: ${consolidated.federatedSources.length} instituciones consolidadas.`
      );
      setTimeout(() => setClinicalSyncNotice(''), 5000);
    } catch (err) {
      setClinicalSyncNotice(err.message);
    }
  };

  const handleUpdateClinicalField = (field, value) => {
    updateWorkspace(prev => {
      if (!prev.clinicalRecord) return prev;
      return {
        ...prev,
        clinicalRecord: {
          ...prev.clinicalRecord,
          [field]: value
        }
      };
    });
  };

  const handleApplyRubricConditionsToProfile = (detectedConditions) => {
    if (!currentUser || !Array.isArray(detectedConditions) || detectedConditions.length === 0) return;
    const merged = Array.from(
      new Set([...(currentUser.medicalConditions || []), ...detectedConditions])
    );
    const updated = updateUserProfile(currentUser.id, { medicalConditions: merged });
    if (updated) {
      setCurrentUser(updated);
      setProfMedicalConditions(merged);
      setClinicalSyncNotice('Protocolos detectados por la rúbrica aplicados a tu perfil IA.');
      setTimeout(() => setClinicalSyncNotice(''), 4000);
    }
  };

  const handleToggleFastingWindow = (protocolHours = 14) => {
    updateWorkspace(prev => {
      const currentFast = prev.fastingState || { active: false, startedAt: null, targetHours: 14 };
      if (currentFast.active) {
        return {
          ...prev,
          fastingState: { active: false, startedAt: null, targetHours: currentFast.targetHours || 14 }
        };
      }
      return {
        ...prev,
        fastingState: {
          active: true,
          startedAt: new Date().toISOString(),
          targetHours: protocolHours
        }
      };
    });
  };

  const handleExportAccountBackupJson = () => {
    if (!currentUser || !workspace) return;
    const payload = {
      exportedAt: new Date().toISOString(),
      platform: 'NutriStudio AI',
      profile: { ...currentUser, password: '***' },
      workspace
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nutristudio-respaldo-${currentUser.email.split('@')[0]}-${todayIso}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ============================================================================
  // MANEJADOR DE PERFIL Y CÁLCULO DE METAS
  // ============================================================================
  const handleAutoCalculateTargets = () => {
    const rec = calculateRecommendedTargets({
      weightKg: profWeight,
      heightCm: profHeight,
      age: profAge,
      sex: profSex,
      metabolismType: profMetabolism,
      activityLevel: profActivity,
      goal: profGoal
    });
    if (rec) {
      setProfCalories(String(rec.dailyCalories));
      setProfCarbs(String(rec.targetCarbs));
      setProfProtein(String(rec.targetProtein));
      setProfFat(String(rec.targetFat));
      setProfWaterGoal(String(rec.waterGoalMl));
      setProfileSavedNotice(
        `Cálculo generado (TMB ${rec.bmr} kcal · GET ${rec.tdee} kcal). Haz clic en "Guardar mis metas" para aplicarlo.`
      );
      setTimeout(() => setProfileSavedNotice(''), 5000);
    } else {
      setProfileSavedNotice('Ingresa tu peso, estatura y edad mayores a 0 para calcular automáticamente.');
      setTimeout(() => setProfileSavedNotice(''), 4000);
    }
  };

  const toggleMedicalCondition = (condId) => {
    setProfMedicalConditions(prev =>
      prev.includes(condId) ? prev.filter(id => id !== condId) : [...prev, condId]
    );
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    const w = Math.max(0, Number(profWeight) || 0);
    const updated = updateUserProfile(currentUser.id, {
      name: profName.trim() || currentUser.name,
      goal: profGoal,
      weightKg: w,
      heightCm: Math.max(0, Number(profHeight) || 0),
      age: Math.max(0, Number(profAge) || 0),
      sex: profSex,
      metabolismType: profMetabolism,
      country: profCountry,
      budgetTier: profBudget,
      medicalConditions: profMedicalConditions,
      physicalNotes: profPhysicalNotes.trim(),
      activityLevel: profActivity,
      dailyCalories:
        Number(profCalories) > 0
          ? Math.max(MIN_SAFE_DAILY_KCAL, Number(profCalories))
          : 0,
      targetCarbs: Math.max(0, Number(profCarbs) || 0),
      targetProtein: Math.max(0, Number(profProtein) || 0),
      targetFat: Math.max(0, Number(profFat) || 0),
      waterGoalMl: Math.max(0, Number(profWaterGoal) || 0)
    });
    if (updated) {
      apiUpdateProfile(updated).catch(() => {});
      apiCreateProgress({ date: todayIso, weightKg: w, waterMl: waterTodayMl, note: 'Actualización de perfil' }).catch(() => {});
      setCurrentUser(updated);
      if (w > 0 && (workspace.weightHistory || []).length === 0) {
        updateWorkspace(prev => ({
          ...prev,
          weightHistory: [
            {
              id: 'w-init-' + Date.now(),
              date: todayIso,
              weightKg: w,
              note: 'Peso inicial registrado'
            }
          ]
        }));
      }
      setProfileSavedNotice('Tus datos y metas de seguimiento se han guardado.');
      setTimeout(() => setProfileSavedNotice(''), 3500);
    }
  };

  // ============================================================================
  // VISTA 0: PORTADA EDITORIAL + LOGIN / ONBOARDING BIOMÉTRICO EN 3 PASOS
  if (!currentUser || !workspace) {
    if (showLanding) {
      return (
        <LandingPage
          onOpenLogin={() => {
            setAuthMode('login');
            setShowLanding(false);
          }}
          onOpenRegister={() => {
            setAuthMode('register');
            setRegStep(1);
            setShowLanding(false);
          }}
        />
      );
    }

    return (
      <AuthOnboarding
        authMode={authMode}
        setAuthMode={setAuthMode}
        authError={authError}
        setAuthError={setAuthError}
        onBackToLanding={() => setShowLanding(true)}
        loginEmail={loginEmail}
        setLoginEmail={setLoginEmail}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        onLoginSubmit={handleLoginSubmit}
        regStep={regStep}
        setRegStep={setRegStep}
        regName={regName}
        setRegName={setRegName}
        regEmail={regEmail}
        setRegEmail={setRegEmail}
        regPassword={regPassword}
        setRegPassword={setRegPassword}
        regCountry={regCountry}
        setRegCountry={setRegCountry}
        regBudget={regBudget}
        setRegBudget={setRegBudget}
        regSex={regSex}
        setRegSex={setRegSex}
        regAge={regAge}
        setRegAge={setRegAge}
        regWeight={regWeight}
        setRegWeight={setRegWeight}
        regHeight={regHeight}
        setRegHeight={setRegHeight}
        regActivity={regActivity}
        setRegActivity={setRegActivity}
        regMetabolism={regMetabolism}
        setRegMetabolism={setRegMetabolism}
        regGoal={regGoal}
        setRegGoal={setRegGoal}
        regConditions={regConditions}
        setRegConditions={setRegConditions}
        onRegisterSubmit={handleRegisterSubmit}
        existingUsers={loadUsers()}
        onQuickLogin={handleQuickLogin}
      />
    );
  }

  const goalKcal = Number(currentUser.dailyCalories || 0);
  const goalCarbs = Number(currentUser.targetCarbs || 0);
  const goalProtein = Number(currentUser.targetProtein || 0);
  const goalFat = Number(currentUser.targetFat || 0);
  const goalWater = Number(currentUser.waterGoalMl || 0);

  const pctKcal = goalKcal > 0 ? Math.min(100, Math.round((consumedKcal / goalKcal) * 100)) : 0;
  const pctCarbs = goalCarbs > 0 ? Math.min(100, Math.round((consumedCarbs / goalCarbs) * 100)) : 0;
  const pctProtein = goalProtein > 0 ? Math.min(100, Math.round((consumedProtein / goalProtein) * 100)) : 0;
  const pctFat = goalFat > 0 ? Math.min(100, Math.round((consumedFat / goalFat) * 100)) : 0;

  const userInitials = currentUser.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const currentGoalLabel = currentUser.goal
    ? GOAL_OPTIONS.find(g => g.id === currentUser.goal)?.label
    : 'Sin objetivo configurado aún';

  const processCoach = buildProcessCoachPlan({
    userProfile: currentUser,
    dailyTracking: {
      consumedKcal,
      consumedCarbs,
      consumedProtein,
      consumedFat,
      waterTodayMl,
      mealsCount: mealsToday.length
    }
  });

  const liveProfileMetrics = computeMetabolicMetrics({
    weightKg: profWeight,
    heightCm: profHeight,
    age: profAge,
    sex: profSex,
    metabolismType: profMetabolism,
    activityLevel: profActivity
  });
  const liveSelectedCountry = getCountryProfile(profCountry);
  const liveActiveProtocols = getActiveMedicalProtocols(profMedicalConditions);
  const todayTokenStats = workspace.tokenUsageByDate?.[todayIso] || {
    used: 0,
    saved: 0,
    queries: 0
  };
  const pctTokenBudget = Math.min(
    100,
    Math.round((todayTokenStats.used / TOKEN_GOVERNANCE.DAILY_TOKEN_BUDGET) * 100)
  );

  const userMemory = buildUserMemoryProfile({
    userProfile: currentUser,
    workspace,
    dailyTracking: {
      consumedKcal,
      consumedCarbs,
      consumedProtein,
      consumedFat,
      waterTodayMl,
      mealsCount: mealsToday.length
    }
  });
  const clinicalRecord = workspace.clinicalRecord || null;
  const clinicalRubric = evaluateClinicalReconciliationRubric({
    userProfile: currentUser,
    clinicalRecord
  });
  const aiProgress = computeAiProgressIntelligence({
    userProfile: currentUser,
    workspace,
    dailyTracking: { consumedKcal, consumedProtein }
  });
  const liveMealAiFeedback = evaluateDailyMealsWithAi({
    mealsToday,
    userProfile: currentUser,
    clinicalRecord
  });
  const adaptiveCheckIn = computeAdaptiveTdeeCheckIn({
    userProfile: currentUser,
    workspace,
    metrics: processCoach.metrics
  });
  const proactiveInsights = computeProactiveDashboardInsights({
    workspace,
    userProfile: currentUser,
    waterTodayMl,
    goalWater
  });

  return (
    <div className="workspace-layout">
      <SidebarNav
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        mealLogsCount={workspace.mealLogs?.length || 0}
        conversationsCount={workspace.conversations?.length || 0}
        documentsCount={workspace.documents?.length || 0}
        knowledgeScore={userMemory.knowledgeScore}
        userInitials={userInitials}
        currentUser={currentUser}
        themeMode={themeMode}
        onToggleTheme={toggleThemeMode}
        onLogout={handleLogout}
      />

      {/* ÁREA PRINCIPAL DE CONTENIDO */}
      <main className="main-area">
        {/* ====================================================================
            SECCIÓN 1: SEGUIMIENTO DIARIO (EMPIEZA EN 0 HASTA REGISTRAR DATOS)
           ==================================================================== */}
        {activeSection === 'summary' && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Hola, {currentUser.name.split(' ')[0]}</h1>
                <p className="page-subtitle">
                  {currentGoalLabel} · Peso actual: {formatWeight(currentUser.weightKg || 0, unitSystem)} · Meta diaria: {goalKcal} kcal
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() =>
                    openPrintableClinicalReport({
                      userProfile: currentUser,
                      metrics: processCoach.metrics,
                      countryName: processCoach.country.name,
                      activeProtocols: userMemory.activeProtocols,
                      clinicalRecord,
                      clinicalRubric,
                      adaptiveCheckIn,
                      mealsToday,
                      userMemory
                    })
                  }
                >
                  Exportar Reporte Clínico (PDF)
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setActiveSection('meals')}
                >
                  Registrar comida
                </button>
                <button
                  type="button"
                  className="btn-solid"
                  onClick={() => setActiveSection('profile')}
                >
                  {goalKcal === 0 ? 'Configurar mis metas' : 'Actualizar metas'}
                </button>
              </div>
            </div>

            {goalKcal === 0 ? (
              <div
                className="card"
                style={{
                  marginBottom: '22px',
                  background: 'var(--accent-soft)',
                  borderColor: 'var(--border-strong)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '14px'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.94rem', color: 'var(--accent)' }}>
                    Tu cuenta ha sido creada con todos los indicadores en 0
                  </div>
                  <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                    Registra tu peso, estatura y objetivo en "Mi cuenta y metas" para calcular tus requerimientos y comenzar tu seguimiento diario.
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-solid"
                  onClick={() => setActiveSection('profile')}
                >
                  Configurar perfil inicial
                </button>
              </div>
            ) : (
              <div className="hero-clinical-banner">
                <div style={{ maxWidth: '680px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <span className="tag-pill">País: {processCoach.country.name}</span>
                    <span className="tag-pill">Memoria IA: {userMemory.knowledgeScore}%</span>
                    <span className="tag-pill">
                      Medicina: {userMemory.activeProtocols.length > 0 ? `${userMemory.activeProtocols.length} protocolos` : 'OMS · ESPEN · ADA'}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>
                    {processCoach.nextActionTitle}
                  </div>
                  <div style={{ fontSize: '0.83rem', opacity: 0.92, marginTop: '4px' }}>
                    Llevas <strong>{consumedKcal} / {goalKcal} kcal</strong> ({pctKcal}%) · Restan{' '}
                    <strong>{Math.max(0, goalKcal - consumedKcal)} kcal</strong> y{' '}
                    <strong>{Math.max(0, goalProtein - consumedProtein)}g de proteína</strong> hoy.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => setCopilotOpen(true)}
                  >
                    Abrir Copiloto IA
                  </button>
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => {
                      setActiveSection('chat');
                      handleSendQuestion(
                        `Llevo ${consumedKcal} kcal consumidas hoy de mi meta de ${goalKcal} kcal (${consumedCarbs}g carbohidratos y ${consumedProtein}g proteína). ¿Qué comida local de ${processCoach.country.name} me recomiendas ahora?`
                      );
                    }}
                  >
                    Sugerir siguiente comida
                  </button>
                </div>
              </div>
            )}

            {/* ANILLO DE CALORÍAS + MACROS DE COLOR + HIDRATACIÓN VISUAL (ANIMADO) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28 }}
              className="dashboard-ring-grid"
            >
              <CalorieRing
                goalKcal={goalKcal}
                consumedKcal={consumedKcal}
                pctKcal={pctKcal}
                consumedCarbs={consumedCarbs}
                goalCarbs={goalCarbs}
                pctCarbs={pctCarbs}
                consumedProtein={consumedProtein}
                goalProtein={goalProtein}
                pctProtein={pctProtein}
                consumedFat={consumedFat}
                goalFat={goalFat}
                pctFat={pctFat}
                streakDays={aiProgress.streakDays}
                consistencyPct={aiProgress.consistencyPct}
              />
              <WaterGlasses
                waterTodayMl={waterTodayMl}
                goalWater={goalWater}
                onAdjustWater={handleAdjustWater}
                mealsCount={mealsToday.length}
                countryName={processCoach.country.name}
                onOpenFoodSearch={() => {
                  setMealEntryMode('database');
                  setActiveSection('meals');
                }}
                fastingState={workspace.fastingState}
                onToggleFasting={handleToggleFastingWindow}
              />
            </motion.div>

            {/* INSIGHT DESTACADO DEL DÍA (PROACTIVO) */}
            {proactiveInsights.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                {proactiveInsights.map(ins => (
                  <div
                    key={ins.title}
                    className="list-item-card ds-card-warm"
                    style={{
                      borderLeft: `4px solid ${ins.type === 'warning' ? 'var(--danger-text)' : 'var(--warm-accent)'}`,
                      alignItems: 'flex-start',
                      gap: '10px'
                    }}
                  >
                    <span style={{ fontSize: '1.1rem' }} aria-hidden="true">{ins.icon}</span>
                    <div>
                      <strong style={{ fontSize: '0.82rem' }}>{ins.title}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {ins.detail}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* SUB-TABS COMPACTAS PARA MANTENER EL PANEL ROBUSTO Y SIN SCROLL EXCESIVO */}
            <div className="subtab-bar">
              <button
                type="button"
                className={`subtab-btn ${summaryTab === 'process' ? 'active' : ''}`}
                onClick={() => setSummaryTab('process')}
              >
                Plan y Proceso IA ({processCoach.country.name})
              </button>
              <button
                type="button"
                className={`subtab-btn ${summaryTab === 'menu' ? 'active' : ''}`}
                onClick={() => setSummaryTab('menu')}
              >
                Menú Automático IA
              </button>
              <button
                type="button"
                className={`subtab-btn ${summaryTab === 'tracking' ? 'active' : ''}`}
                onClick={() => setSummaryTab('tracking')}
              >
                Comidas, Micros y Agua ({mealsToday.length})
              </button>
              <button
                type="button"
                className={`subtab-btn ${summaryTab === 'memory' ? 'active' : ''}`}
                onClick={() => setSummaryTab('memory')}
              >
                Memoria Clínica IA ({userMemory.knowledgeScore}%)
              </button>
            </div>

            {/* PLANIFICADOR SEMANAL CON RESTRICCIONES + RECETAS "LO QUE TENGO EN LA NEVERA" */}
            {summaryTab === 'menu' && (
              <WeeklyPlannerAndRecipes
                goalKcal={goalKcal || 2000}
                countryId={currentUser.country || 'CO'}
                countryName={processCoach.country.name}
                budgetId={processCoach.budget.id}
                onAddMealToDay={handleAddGeneratedMealToDay}
              />
            )}

            {/* ACOMPAÑAMIENTO ACTIVO DE LA IA EN EL PROCESO (PAÍS + METABOLISMO + POSIBILIDADES) */}
            {summaryTab === 'process' && (
            <div className="card" style={{ marginBottom: '20px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px',
                  flexWrap: 'wrap',
                  marginBottom: '12px'
                }}
              >
                <div>
                  <span className="tag-pill">
                    Acompañamiento IA en tu Proceso · {processCoach.stageBadge}
                  </span>
                  <div className="card-title" style={{ marginTop: '8px' }}>
                    {processCoach.nextActionTitle}
                  </div>
                  <div className="card-desc" style={{ marginBottom: 0 }}>
                    {processCoach.nextActionDetail}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-solid"
                    onClick={() => {
                      setActiveSection('chat');
                      handleSendQuestion(
                        `Guíame en mi proceso de hoy en ${processCoach.country.name} con presupuesto ${processCoach.budget.id} y ${processCoach.meta.label}. Llevo ${consumedKcal} kcal y ${consumedProtein}g de proteína; ¿qué plan paso a paso me recomiendas para el resto del día?`
                      );
                    }}
                  >
                    Guiarme en mi proceso hoy
                  </button>
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => {
                      setActiveSection('chat');
                      handleSendQuestion(
                        `¿Qué alimentos de la productividad alimenticia de ${processCoach.country.name} me dan el mejor plus nutricional para mi presupuesto ${processCoach.budget.id} y mi metabolismo?`
                      );
                    }}
                  >
                    Plus alimenticios de {processCoach.country.name}
                  </button>
                </div>
              </div>

              <div className="split-grid" style={{ marginTop: '14px' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.84rem', marginBottom: '8px' }}>
                    Productividad alimenticia de {processCoach.country.name} (acorde a tus posibilidades: {processCoach.budget.id})
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                    {processCoach.country.nutritionalPlus}
                  </div>
                  <div className="list-stack">
                    {processCoach.prioritizedFoods.map(food => (
                      <div key={food.name} className="list-item-card">
                        <div>
                          <div style={{ fontWeight: 500, fontSize: '0.84rem' }}>{food.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {food.plus}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, fontSize: '0.76rem' }}>
                          <strong>{food.kcal100g} kcal</strong>
                          <div style={{ color: 'var(--text-muted)' }}>
                            P: {food.protein100g}g · C: {food.carbs100g}g
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.84rem', marginBottom: '8px' }}>
                    Factores físicos, metabolismo y avance del proceso
                  </div>
                  <div className="list-item-card" style={{ marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.83rem' }}>
                        {processCoach.meta.label}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                        {processCoach.meta.strategy}
                      </div>
                      {processCoach.metrics && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: '6px', fontWeight: 500 }}>
                          TMB: {processCoach.metrics.bmr} kcal · GET: {processCoach.metrics.tdee} kcal · IMC: {processCoach.metrics.bmi} ({processCoach.metrics.bmiCategory})
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="list-stack">
                    {processCoach.checklist.map(step => (
                      <div key={step.label} className="list-item-card" style={{ padding: '8px 12px' }}>
                        <span style={{ fontSize: '0.8rem' }}>
                          {step.done ? '✓ ' : '○ '}
                          {step.label}
                        </span>
                        <span className="tag-pill">{step.done ? 'Listo' : 'Pendiente'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* EVOLUCIÓN SEMANAL 7 DÍAS + RACHA + PRONÓSTICO CORPORAL IA A 30 DÍAS */}
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                  <div>
                    <strong style={{ fontSize: '0.85rem' }}>{aiProgress.forecastTitle}</strong>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {aiProgress.forecastDetail}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span className="tag-pill">Racha: {aiProgress.streakDays} día(s)</span>
                    <span className="tag-pill">Consistencia 7d: {aiProgress.consistencyPct}%</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', alignItems: 'end', height: '74px', paddingTop: '8px' }}>
                  {aiProgress.last7Days.map(day => (
                    <div key={day.iso} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <div
                        title={`${day.iso}: ${day.kcal} kcal (${day.protein}g proteína)`}
                        style={{
                          width: '100%',
                          maxWidth: '34px',
                          height: `${Math.max(8, Math.round((Math.min(100, day.pct) / 100) * 44))}px`,
                          borderRadius: '6px',
                          background: day.kcal > 0 ? 'var(--accent-gradient)' : 'var(--bg-subtle)',
                          border: day.isToday ? '1px solid var(--accent)' : '1px solid var(--border)'
                        }}
                      />
                      <span style={{ fontSize: '0.7rem', color: day.isToday ? 'var(--accent)' : 'var(--text-muted)', fontWeight: day.isToday ? 600 : 400 }}>
                        {day.dayLabel}
                      </span>
                    </div>
                  ))}
                </div>

                {/* MOTOR METABÓLICO ADAPTATIVO SEMANAL (ESTILO MACROFACTOR) */}
                <div
                  className="list-item-card"
                  style={{
                    marginTop: '14px',
                    background: 'var(--accent-soft)',
                    borderColor: 'var(--border-strong)',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--accent)' }}>
                      {adaptiveCheckIn.headline}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {adaptiveCheckIn.explanation}
                    </div>
                  </div>
                  {adaptiveCheckIn.ready && adaptiveCheckIn.deltaKcal !== 0 && (
                    <button
                      type="button"
                      className="btn-solid"
                      style={{ padding: '7px 12px', fontSize: '0.76rem' }}
                      onClick={() => {
                        const updated = updateUserProfile(currentUser.id, {
                          dailyCalories: adaptiveCheckIn.suggestedCalories
                        });
                        if (updated) {
                          setCurrentUser(updated);
                          setProfCalories(String(adaptiveCheckIn.suggestedCalories));
                        }
                      }}
                    >
                      Aplicar ajuste ({adaptiveCheckIn.suggestedCalories} kcal)
                    </button>
                  )}
                </div>
              </div>
            </div>
            )}

            {/* MEMORIA DEL AGENTE IA + BASE NUTRICIONAL Y MÉDICA GLOBAL */}
            {summaryTab === 'memory' && (
            <div className="card" style={{ marginBottom: '20px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px',
                  flexWrap: 'wrap',
                  marginBottom: '12px'
                }}
              >
                <div>
                  <span className="tag-pill">
                    Memoria IA del Usuario · Conocimiento acumulado: {userMemory.knowledgeScore}%
                  </span>
                  <div className="card-title" style={{ marginTop: '8px' }}>
                    Lo que tu Agente IA ya conoce de ti y Base Clínica Global (OMS · ADA · AHA/DASH · ISSN)
                  </div>
                  <div className="card-desc" style={{ marginBottom: 0 }}>
                    El asistente recuerda tu evolución de peso, promedio real de comidas, país, metabolismo y protocolos médicos para adelantarse y guiarte mejor cada día.
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => {
                    setActiveSection('chat');
                    handleSendQuestion(
                      'Analiza todo lo que conoces de mi historial (peso, comidas recientes, país, metabolismo y condiciones médicas) y dame una guía personalizada con los ajustes clave que debo hacer hoy.'
                    );
                  }}
                >
                  Evaluar mi historial y guiarme hoy
                </button>
              </div>

              <div className="progress-track" style={{ marginBottom: '14px' }}>
                <div className="progress-fill" style={{ width: `${userMemory.knowledgeScore}%` }} />
              </div>

              <div className="split-grid">
                <div className="list-stack">
                  <div className="list-item-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                    <strong style={{ fontSize: '0.82rem' }}>Evolución y patrones detectados</strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {userMemory.weightTrendText}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {userMemory.statsCount.meals > 0
                        ? `Promedio por plato registrado: ${userMemory.avgMealKcal} kcal · ${userMemory.avgMealProtein}g proteína · ${userMemory.avgMealCarbs}g carbs.`
                        : 'Registra tus comidas para que el bot aprenda tus hábitos y platos frecuentes.'}
                    </span>
                  </div>
                  <div className="list-item-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                    <strong style={{ fontSize: '0.82rem' }}>Alertas y recomendaciones proactivas</strong>
                    {userMemory.proactiveInsights.map((insight, idx) => (
                      <span key={idx} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        • {insight}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="list-stack">
                  <div className="list-item-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                    <strong style={{ fontSize: '0.82rem' }}>
                      Protocolos médicos activos ({userMemory.activeProtocols.length})
                    </strong>
                    {userMemory.activeProtocols.length === 0 ? (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        Base nutricional global activa (OMS/FAO/ISSN). Puedes activar condiciones médicas específicas (insulina, hipertensión, colesterol, digestión, anemia) en <strong>Mi cuenta y metas</strong>.
                      </span>
                    ) : (
                      userMemory.activeProtocols.map(proto => (
                        <div key={proto.id} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>{proto.label}</strong>{' '}
                          <span style={{ color: 'var(--accent)' }}>({proto.source})</span>: {proto.keyRules}
                        </div>
                      ))
                    )}
                    <span style={{ fontSize: '0.71rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Nota: Orientación nutricional educativa basada en guías médicas; no sustituye valoración médica profesional.
                    </span>
                  </div>
                </div>
              </div>
            </div>
            )}

            {summaryTab === 'tracking' && (() => {
              const fiberToday = mealsToday.reduce((a, m) => a + (Number(m.fiberGrams) || 0), 0);
              const sodiumToday = mealsToday.reduce((a, m) => a + (Number(m.sodiumMg) || 0), 0);
              const potassiumToday = mealsToday.reduce((a, m) => a + (Number(m.potassiumMg) || 0), 0);
              const vitCToday = mealsToday.reduce((a, m) => a + (Number(m.vitaminCMg) || 0), 0);
              const qualityScores = mealsToday
                .map(m => Number(m.qualityScore || 0))
                .filter(v => v > 0);
              const avgQualityToday =
                qualityScores.length > 0
                  ? Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length)
                  : null;

              return (
              <div>
                <div className="card" style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                    <div className="card-title" style={{ marginBottom: 0 }}>
                      Micronutrientes y Calidad Nutricional Hoy (Cronometer · Yuka)
                    </div>
                    <span className="tag-pill">
                      Calidad Yuka hoy: {avgQualityToday !== null ? `${avgQualityToday}/100` : 'Registra desde Base de Alimentos'}
                    </span>
                  </div>
                  <div className="stats-row" style={{ marginBottom: 0 }}>
                    <div className="stat-box" style={{ padding: '12px' }}>
                      <div className="stat-label">Fibra (meta 30g)</div>
                      <div className="stat-value" style={{ fontSize: '1.05rem' }}>{fiberToday}g</div>
                    </div>
                    <div className="stat-box" style={{ padding: '12px' }}>
                      <div className="stat-label">Sodio (límite DASH 2000mg)</div>
                      <div className="stat-value" style={{ fontSize: '1.05rem' }}>{sodiumToday} mg</div>
                    </div>
                    <div className="stat-box" style={{ padding: '12px' }}>
                      <div className="stat-label">Potasio (meta 3500mg)</div>
                      <div className="stat-value" style={{ fontSize: '1.05rem' }}>{potassiumToday} mg</div>
                    </div>
                    <div className="stat-box" style={{ padding: '12px' }}>
                      <div className="stat-label">Vitamina C (meta 90mg)</div>
                      <div className="stat-value" style={{ fontSize: '1.05rem' }}>{vitCToday} mg</div>
                    </div>
                  </div>
                </div>

                {/* DIARIO VISUAL POR TIEMPOS DE COMIDA (MYFITNESSPAL / FITIA / YAZIO) */}
                <div className="meal-slots-grid">
                  {[
                    { slot: 'Desayuno', icon: '☀️', hint: 'Energía y proteína inicial' },
                    { slot: 'Almuerzo', icon: '🥗', hint: 'Comida principal balanceada' },
                    { slot: 'Merienda', icon: '🍎', hint: 'Snack saciante / fibra' },
                    { slot: 'Cena', icon: '🌙', hint: 'Proteína ligera nocturna' }
                  ].map(({ slot, icon, hint }) => {
                    const slotMeals = mealsToday.filter(m =>
                      (m.mealType || '').toLowerCase().includes(slot.toLowerCase())
                    );
                    const slotKcal = slotMeals.reduce((acc, m) => acc + (Number(m.totalCalories) || 0), 0);
                    const slotKey = slot.toLowerCase();
                    return (
                      <div key={slot} className={`meal-slot-card meal-slot-${slotKey}`}>
                        <div className="meal-slot-head">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="meal-slot-badge">{icon}</div>
                            <div>
                              <strong style={{ fontSize: '0.88rem' }}>{slot}</strong>
                              <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                                {slotMeals.length > 0 ? `${slotKcal} kcal · ${slotMeals.length} plato(s)` : hint}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="meal-slot-add-btn"
                            title={`Agregar a ${slot}`}
                            onClick={() => {
                              setMealType(slot === 'Merienda' ? 'Merienda' : slot);
                              setMealEntryMode('database');
                              setActiveSection('meals');
                            }}
                          >
                            +
                          </button>
                        </div>
                        {slotMeals.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '4px', borderTop: '1px solid var(--border)' }}>
                            {slotMeals.map(m => (
                              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.77rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>{m.dishName}</span>
                                <strong>{m.totalCalories} kcal</strong>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
            <div className="split-grid">
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <div className="card-title">Comidas registradas hoy ({mealsToday.length})</div>
                    <div className="card-desc" style={{ marginBottom: 0 }}>
                      Fecha de seguimiento: {todayIso}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => setActiveSection('meals')}
                  >
                    + Registrar plato
                  </button>
                </div>

                {mealsToday.length === 0 ? (
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', padding: '18px 0' }}>
                    0 comidas registradas hoy. Cuando registres o analices tus platos, aparecerán aquí y sumarán a tu progreso diario.
                  </p>
                ) : (
                  <div className="list-stack">
                    {mealsToday.map(meal => (
                      <div key={meal.id} className="list-item-card">
                        <div>
                          <span className="tag-pill">{meal.mealType} · {meal.time}</span>
                          <div style={{ fontWeight: 500, fontSize: '0.9rem', marginTop: '6px' }}>
                            {meal.dishName}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                            {meal.carbsGrams}g carbohidratos · {meal.proteinGrams}g proteína · {meal.fatGrams}g grasas
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{meal.totalCalories} kcal</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <div className="card-title">Hidratación y control de peso</div>
                <div className="card-desc">
                  Registra tu consumo de agua de hoy y la evolución de tu peso corporal.
                </div>

                <div className="list-item-card" style={{ marginBottom: '18px', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Agua consumida hoy
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 600, marginTop: '2px' }}>
                      {waterTodayMl} ml{' '}
                      <span style={{ fontSize: '0.82rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                        / {goalWater} ml
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => handleAdjustWater(-250)}
                    >
                      -250 ml
                    </button>
                    <button
                      type="button"
                      className="btn-solid"
                      onClick={() => handleAdjustWater(250)}
                    >
                      +250 ml
                    </button>
                  </div>
                </div>

                <form onSubmit={handleAddWeightRecord} style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                  <input
                    type="number"
                    step="0.1"
                    className="input-clean"
                    placeholder="Peso hoy (kg)"
                    value={newWeightInput}
                    onChange={e => setNewWeightInput(e.target.value)}
                    style={{ maxWidth: '130px' }}
                  />
                  <input
                    type="text"
                    className="input-clean"
                    placeholder="Nota (ej. Ayunas)"
                    value={newWeightNote}
                    onChange={e => setNewWeightNote(e.target.value)}
                  />
                  <button type="submit" className="btn-outline" style={{ flexShrink: 0 }}>
                    Guardar peso
                  </button>
                </form>

                <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  GRÁFICA Y HISTORIAL DE PESO ({workspace.weightHistory?.length || 0})
                </div>
                {(workspace.weightHistory || []).length >= 2 && (() => {
                  const pts = [...workspace.weightHistory].slice(0, 8).reverse();
                  const vals = pts.map(p => Number(p.weightKg) || 0);
                  const minV = Math.min(...vals) - 1;
                  const maxV = Math.max(...vals) + 1;
                  const span = Math.max(1, maxV - minV);
                  const polyPoints = vals
                    .map((v, i) => {
                      const x = Math.round((i / Math.max(1, vals.length - 1)) * 280 + 10);
                      const y = Math.round(62 - ((v - minV) / span) * 48);
                      return `${x},${y}`;
                    })
                    .join(' ');
                  return (
                    <div
                      style={{
                        background: 'var(--bg-page)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        padding: '8px 10px',
                        marginBottom: '10px'
                      }}
                    >
                      <svg viewBox="0 0 300 72" style={{ width: '100%', height: '66px', display: 'block' }}>
                        <polyline
                          fill="none"
                          stroke="#0f6b56"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={polyPoints}
                        />
                        {vals.map((v, i) => {
                          const x = Math.round((i / Math.max(1, vals.length - 1)) * 280 + 10);
                          const y = Math.round(62 - ((v - minV) / span) * 48);
                          return <circle key={i} cx={x} cy={y} r="3.5" fill="#0f6b56" />;
                        })}
                      </svg>
                    </div>
                  );
                })()}
                {(workspace.weightHistory || []).length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    0 registros de peso. Ingresa tu peso arriba para iniciar la gráfica de seguimiento.
                  </p>
                ) : (
                  <div className="list-stack">
                    {(workspace.weightHistory || []).slice(0, 4).map(w => (
                      <div key={w.id} className="list-item-card" style={{ padding: '10px 12px' }}>
                        <div>
                          <strong>{w.weightKg} kg</strong>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                            {w.note}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{w.date}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <Suspense fallback={<Skeleton height="240px" style={{ marginTop: '18px' }} />}>
              <NutritionChartsPanel workspace={workspace} userProfile={currentUser} />
            </Suspense>
              </div>
              );
            })()}
          </div>
        )}

        {/* ====================================================================
            SECCIÓN 2: REGISTRO Y ESCÁNER DE COMIDAS POR USUARIO
           ==================================================================== */}
        {activeSection === 'meals' && (
          <div>
            <div className="section-photo-banner banner-meals">
              <div>
                <span className="tag-pill" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}>
                  Visión IA · Base 40+ Alimentos · Nutri-Score A–E
                </span>
                <h1 className="page-title" style={{ color: '#ffffff', marginTop: '6px' }}>
                  Registro y Escáner Inteligente de Comidas
                </h1>
                <p style={{ fontSize: '0.85rem', opacity: 0.92, marginTop: '3px' }}>
                  Sube una foto de tu plato, busca en la base con calidad Yuka/Cronometer o registra manualmente con evaluación IA en tiempo real.
                </p>
              </div>
              <span className="nutri-badge nutri-grade-A" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                {mealsToday.length} plato(s) hoy · {consumedKcal} kcal
              </span>
            </div>

            {/* EVALUACIÓN IA EN VIVO DE TUS COMIDAS + SMART SWAPS (0 TOKENS LLM) */}
            <div
              className="card"
              style={{
                marginBottom: '18px',
                borderLeft: `4px solid ${liveMealAiFeedback.status === 'warning' ? 'var(--danger-text)' : 'var(--accent)'}`,
                padding: '14px 18px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <strong style={{ fontSize: '0.86rem' }}>{liveMealAiFeedback.headline}</strong>
                <span className="tag-pill">IA Integrada en Seguimiento · Tiempo real</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {liveMealAiFeedback.feedback}
              </div>
              {liveMealAiFeedback.smartSwap && (
                <div style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 500 }}>
                  Sustitución inteligente sugerida (Smart Swap): cambia por <strong>{liveMealAiFeedback.smartSwap.to}</strong> — {liveMealAiFeedback.smartSwap.benefit}
                </div>
              )}
              <HealthDisclaimer compact />
            </div>

            <div className="split-grid">
              <div className="card">
                <div className="auth-switcher" style={{ marginBottom: '18px', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  <button
                    type="button"
                    className={`auth-switch-btn ${mealEntryMode === 'photo' ? 'active' : ''}`}
                    onClick={() => setMealEntryMode('photo')}
                  >
                    📷 Foto IA
                  </button>
                  <button
                    type="button"
                    className={`auth-switch-btn ${mealEntryMode === 'barcode' ? 'active' : ''}`}
                    onClick={() => setMealEntryMode('barcode')}
                  >
                    🏷️ Barras
                  </button>
                  <button
                    type="button"
                    className={`auth-switch-btn ${mealEntryMode === 'database' ? 'active' : ''}`}
                    onClick={() => setMealEntryMode('database')}
                  >
                    🔍 Alimentos
                  </button>
                  <button
                    type="button"
                    className={`auth-switch-btn ${mealEntryMode === 'manual' ? 'active' : ''}`}
                    onClick={() => setMealEntryMode('manual')}
                  >
                    ✏️ Manual
                  </button>
                </div>

                {mealEntryMode === 'barcode' ? (
                  <Suspense fallback={<Skeleton height="180px" />}>
                    <BarcodeScannerPanel
                      mealType={mealType}
                      onAddBarcodeMeal={(entry) => {
                        const fullEntry = {
                          ...entry,
                          date: todayIso,
                          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        };
                        updateWorkspace(prev => ({
                          ...prev,
                          mealLogs: [fullEntry, ...(prev.mealLogs || [])]
                        }));
                        apiCreateMeal(fullEntry).catch(() => {});
                        setMealSavedNotice(`"${entry.dishName}" agregado desde escáner de código de barras.`);
                        setTimeout(() => setMealSavedNotice(''), 3500);
                      }}
                    />
                  </Suspense>
                ) : mealEntryMode === 'database' ? (() => {
                  const favIds = workspace.favoriteFoodIds || [];
                  const localMatched = searchFoodDatabase({
                    query: foodSearchQuery,
                    category: foodCategoryFilter,
                    countryId: currentUser.country || 'CO'
                  });
                  const combinedFoods = [...externalOffFoods, ...localMatched].filter(
                    f => !showFavoritesOnly || favIds.includes(f.id)
                  );
                  return (
                    <div>
                      <div className="form-stack" style={{ marginBottom: '12px' }}>
                        <div className="field-row">
                          <div className="field-group">
                            <label className="field-label">Buscar en base nutricional (USDA · ICBF · Open Food Facts)</label>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <input
                                type="text"
                                className="input-clean"
                                placeholder="Ej. pollo, aguacate, frijol, avena, yogur..."
                                value={foodSearchQuery}
                                onChange={e => setFoodSearchQuery(e.target.value)}
                              />
                              <button
                                type="button"
                                className="btn-outline"
                                style={{ flexShrink: 0, fontSize: '0.76rem' }}
                                disabled={isSearchingOff || foodSearchQuery.trim().length < 3}
                                onClick={async () => {
                                  setIsSearchingOff(true);
                                  const res = await searchOpenFoodFactsCatalog(foodSearchQuery);
                                  setExternalOffFoods(res);
                                  setIsSearchingOff(false);
                                }}
                              >
                                {isSearchingOff ? '…' : '+ OpenFoodFacts'}
                              </button>
                            </div>
                          </div>
                          <div className="field-group">
                            <label className="field-label">Momento del día</label>
                            <select
                              className="input-clean"
                              value={mealType}
                              onChange={e => setMealType(e.target.value)}
                            >
                              <option value="Desayuno">Desayuno</option>
                              <option value="Almuerzo">Almuerzo</option>
                              <option value="Merienda">Merienda / Snack</option>
                              <option value="Cena">Cena</option>
                            </select>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          <button
                            type="button"
                            className="copilot-chip"
                            style={
                              showFavoritesOnly
                                ? { background: '#f59e0b', color: '#fff', borderColor: '#f59e0b' }
                                : undefined
                            }
                            onClick={() => setShowFavoritesOnly(prev => !prev)}
                          >
                            ⭐ Favoritos ({favIds.length})
                          </button>
                          {FOOD_CATEGORIES.map(cat => (
                            <button
                              key={cat}
                              type="button"
                              className="copilot-chip"
                              style={
                                foodCategoryFilter === cat
                                  ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                                  : undefined
                              }
                              onClick={() => setFoodCategoryFilter(cat)}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>

                      {mealSavedNotice && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 500, marginBottom: '10px' }}>
                          {mealSavedNotice}
                        </div>
                      )}

                      <div className="list-stack" style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                        {combinedFoods.slice(0, 20).map(food => {
                          const grams = Number(foodPortionById[food.id]) || food.defaultGrams || 100;
                          const scaled = scaleFoodPortion(food, grams);
                          const isWarning = food.qualityScore < 50;
                          const isFav = favIds.includes(food.id);
                          return (
                            <div key={food.id} className="list-item-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                                    <button
                                      type="button"
                                      aria-label="Marcar como favorito"
                                      onClick={() =>
                                        updateWorkspace(prev => {
                                          const prevFavs = prev.favoriteFoodIds || [];
                                          const nextFavs = prevFavs.includes(food.id)
                                            ? prevFavs.filter(id => id !== food.id)
                                            : [...prevFavs, food.id];
                                          return { ...prev, favoriteFoodIds: nextFavs };
                                        })
                                      }
                                      style={{
                                        border: 'none',
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        marginRight: '6px',
                                        fontSize: '0.9rem'
                                      }}
                                    >
                                      {isFav ? '⭐' : '☆'}
                                    </button>
                                    {food.name}
                                  </div>
                                  <div style={{ fontSize: '0.73rem', color: isWarning ? 'var(--danger-text)' : 'var(--text-secondary)', marginTop: '2px' }}>
                                    {food.clinicalTag} · NOVA {food.novaGroup} · IG {food.glycemicIndex}
                                  </div>
                                </div>
                                <span className={`nutri-badge nutri-grade-${food.nutriGrade}`}>
                                  Nutri-Score {food.nutriGrade} · {food.qualityScore}/100
                                </span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  <strong>{scaled.kcal} kcal</strong> · P: {scaled.protein}g · C: {scaled.carbs}g · G: {scaled.fat}g · Fibra: {scaled.fiber}g · Na: {scaled.sodiumMg}mg · K: {scaled.potassiumMg}mg
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <input
                                    type="number"
                                    min="10"
                                    max="1000"
                                    className="input-clean"
                                    style={{ width: '74px', padding: '5px 8px', fontSize: '0.78rem' }}
                                    value={grams}
                                    onChange={e =>
                                      setFoodPortionById(prev => ({ ...prev, [food.id]: e.target.value }))
                                    }
                                  />
                                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>g</span>
                                  <button
                                    type="button"
                                    className="btn-solid"
                                    style={{ padding: '6px 10px', fontSize: '0.76rem' }}
                                    onClick={() => handleAddFoodFromDb(food)}
                                  >
                                    + Agregar
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })() : mealEntryMode === 'photo' ? (
                  <>
                    <div className="form-stack" style={{ marginBottom: '16px' }}>
                      <div className="field-row">
                        <div className="field-group">
                          <label className="field-label">Momento del día</label>
                          <select
                            className="input-clean"
                            value={mealType}
                            onChange={e => setMealType(e.target.value)}
                          >
                            <option value="Desayuno">Desayuno</option>
                            <option value="Almuerzo">Almuerzo</option>
                            <option value="Merienda">Merienda / Snack</option>
                            <option value="Cena">Cena</option>
                          </select>
                        </div>
                        <div className="field-group">
                          <label className="field-label">Descripción opcional</label>
                          <input
                            type="text"
                            className="input-clean"
                            placeholder="Ej. Almuerzo casero..."
                            value={customMealNote}
                            onChange={e => setCustomMealNote(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="field-group">
                        <label className="field-label">Seleccionar imagen (.jpg, .png, .webp)</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadCustomMealImage}
                          className="input-clean"
                          style={{ padding: '7px 10px' }}
                        />
                      </div>
                    </div>

                    {isAnalyzingImage && (
                      <p style={{ fontSize: '0.84rem', color: 'var(--accent)', marginBottom: '14px' }}>
                        Analizando imagen y estimando calorías y carbohidratos...
                      </p>
                    )}

                    {customImagePreview && (
                      <div style={{ marginBottom: '16px' }}>
                        <img
                          src={customImagePreview}
                          alt="Comida subida"
                          style={{
                            width: '100%',
                            maxHeight: '190px',
                            objectFit: 'cover',
                            borderRadius: '10px',
                            border: '1px solid var(--border)'
                          }}
                        />
                      </div>
                    )}

                    {activeVisionResult ? (
                      <div
                        style={{
                          padding: '16px',
                          borderRadius: '10px',
                          background: activeVisionResult.isFoodValid
                            ? 'var(--bg-page)'
                            : 'var(--amber-soft)',
                          border: `1px solid ${
                            activeVisionResult.isFoodValid ? 'var(--border)' : 'var(--amber-border)'
                          }`
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: '0.96rem', marginBottom: '6px' }}>
                          {activeVisionResult.dishName}
                        </div>

                        {activeVisionResult.isFoodValid ? (
                          <>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
                              <span className="tag-pill green">{activeVisionResult.totalCalories} kcal</span>
                              <span className="tag-pill">{activeVisionResult.carbsGrams}g Carbohidratos</span>
                              <span className="tag-pill">{activeVisionResult.proteinGrams}g Proteínas</span>
                              <span className="tag-pill">{activeVisionResult.fatGrams}g Grasas</span>
                              <span className="tag-pill">{activeVisionResult.fiberGrams}g Fibra</span>
                              <span className="nutri-badge nutri-grade-A">
                                Confianza IA: {activeVisionResult.confidencePct || 91}%
                              </span>
                            </div>

                            {/* Edición de porción y "Corregir y aprender" */}
                            <div
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '6px',
                                alignItems: 'center',
                                marginBottom: '12px',
                                padding: '8px 10px',
                                borderRadius: '9px',
                                background: 'var(--bg-subtle)'
                              }}
                            >
                              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Ajustar porción:</span>
                              {[0.75, 1.25, 1.5].map(mult => (
                                <button
                                  key={mult}
                                  type="button"
                                  className="copilot-chip"
                                  onClick={() =>
                                    setActiveVisionResult(prev =>
                                      prev
                                        ? {
                                            ...prev,
                                            totalCalories: Math.round(prev.totalCalories * mult),
                                            carbsGrams: Math.round(prev.carbsGrams * mult),
                                            proteinGrams: Math.round(prev.proteinGrams * mult),
                                            fatGrams: Math.round(prev.fatGrams * mult),
                                            confidencePct: 98
                                          }
                                        : prev
                                    )
                                  }
                                >
                                  {mult}x
                                </button>
                              ))}
                              <button
                                type="button"
                                className="copilot-chip"
                                onClick={() => {
                                  updateWorkspace(prev => ({
                                    ...prev,
                                    learnedCorrections: [
                                      {
                                        dishName: activeVisionResult.dishName,
                                        totalCalories: activeVisionResult.totalCalories,
                                        proteinGrams: activeVisionResult.proteinGrams,
                                        savedAt: todayIso
                                      },
                                      ...(prev.learnedCorrections || [])
                                    ].slice(0, 30)
                                  }));
                                  setMealSavedNotice('Corrección guardada: tu asistente aprenderá esta porción para futuras fotos.');
                                  setTimeout(() => setMealSavedNotice(''), 3500);
                                }}
                              >
                                ✓ Corregir y aprender
                              </button>
                            </div>

                            {activeVisionResult.ingredients?.length > 0 && (
                              <table className="clean-table" style={{ marginBottom: '12px' }}>
                                <thead>
                                  <tr>
                                    <th>Ingrediente</th>
                                    <th>Kcal</th>
                                    <th>Carbs</th>
                                    <th>Prot</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {activeVisionResult.ingredients.map((ing, i) => (
                                    <tr key={i}>
                                      <td>{ing.name}</td>
                                      <td>{ing.calories}</td>
                                      <td>{ing.carbsGrams}g</td>
                                      <td>{ing.proteinGrams}g</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}

                            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                              {activeVisionResult.nutritionalAdvice}
                            </p>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                              <button
                                type="button"
                                className="btn-solid"
                                onClick={handleSaveMealToAccount}
                              >
                                Guardar en mi seguimiento
                              </button>
                              {mealSavedNotice && (
                                <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 500 }}>
                                  {mealSavedNotice}
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          <p style={{ fontSize: '0.84rem', color: 'var(--amber-text)' }}>
                            {activeVisionResult.nutritionalAdvice}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: '18px',
                          borderRadius: '10px',
                          background: 'var(--bg-page)',
                          border: '1px dashed var(--border-strong)',
                          fontSize: '0.83rem',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        Sube la foto de un plato arriba para calcular sus calorías, carbohidratos, proteínas y grasas, o selecciona uno de los ejemplos de abajo.
                      </div>
                    )}

                    <div style={{ marginTop: '20px' }}>
                      <div className="field-label" style={{ marginBottom: '8px' }}>
                        Ejemplos rápidos para probar el analizador:
                      </div>
                      <div className="list-stack">
                        {MEAL_PRESETS.map(preset => (
                          <div
                            key={preset.id}
                            className="list-item-card"
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleSelectMealPreset(preset)}
                          >
                            <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{preset.title}</div>
                            <span className="tag-pill">{preset.badge}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <form onSubmit={handleSaveManualMeal} className="form-stack">
                    <div className="field-group">
                      <label className="field-label">Momento del día</label>
                      <select
                        className="input-clean"
                        value={mealType}
                        onChange={e => setMealType(e.target.value)}
                      >
                        <option value="Desayuno">Desayuno</option>
                        <option value="Almuerzo">Almuerzo</option>
                        <option value="Merienda">Merienda / Snack</option>
                        <option value="Cena">Cena</option>
                      </select>
                    </div>
                    <div className="field-group">
                      <label className="field-label">Nombre del plato o alimento</label>
                      <input
                        type="text"
                        className="input-clean"
                        placeholder="Ej. Pechuga a la plancha con ensalada y arroz"
                        value={manualDishName}
                        onChange={e => setManualDishName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="field-row">
                      <div className="field-group">
                        <label className="field-label">Calorías (kcal)</label>
                        <input
                          type="number"
                          className="input-clean"
                          placeholder="0"
                          value={manualCalories}
                          onChange={e => setManualCalories(e.target.value)}
                          required
                        />
                      </div>
                      <div className="field-group">
                        <label className="field-label">Carbohidratos (g)</label>
                        <input
                          type="number"
                          className="input-clean"
                          placeholder="0"
                          value={manualCarbs}
                          onChange={e => setManualCarbs(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="field-row">
                      <div className="field-group">
                        <label className="field-label">Proteínas (g)</label>
                        <input
                          type="number"
                          className="input-clean"
                          placeholder="0"
                          value={manualProtein}
                          onChange={e => setManualProtein(e.target.value)}
                        />
                      </div>
                      <div className="field-group">
                        <label className="field-label">Grasas (g)</label>
                        <input
                          type="number"
                          className="input-clean"
                          placeholder="0"
                          value={manualFat}
                          onChange={e => setManualFat(e.target.value)}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                      <button type="submit" className="btn-solid">
                        Registrar comida
                      </button>
                      {mealSavedNotice && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 500 }}>
                          {mealSavedNotice}
                        </span>
                      )}
                    </div>
                  </form>
                )}
              </div>

              <div className="card">
                <div className="card-title">
                  Historial de comidas registradas ({workspace.mealLogs?.length || 0})
                </div>
                <div className="card-desc">
                  Todos los platos que guardes quedan asociados a tu cuenta para tu seguimiento diario.
                </div>

                {(workspace.mealLogs || []).length === 0 ? (
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', padding: '16px 0' }}>
                    0 comidas registradas en tu cuenta. Sube una foto o registra tu primera comida a la izquierda.
                  </p>
                ) : (
                  <div className="list-stack">
                    {(workspace.mealLogs || []).map(item => (
                      <div key={item.id} className="list-item-card">
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                          {item.imagePreview && (
                            <img
                              src={item.imagePreview}
                              alt={item.dishName}
                              style={{
                                width: '54px',
                                height: '54px',
                                borderRadius: '8px',
                                objectFit: 'cover',
                                border: '1px solid var(--border)',
                                flexShrink: 0
                              }}
                            />
                          )}
                          <div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <span className="tag-pill">{item.mealType}</span>
                              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                {item.date} · {item.time}
                              </span>
                            </div>
                            <div style={{ fontWeight: 600, fontSize: '0.88rem', marginTop: '5px' }}>
                              {item.dishName}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                              <strong>{item.totalCalories} kcal</strong> · {item.carbsGrams}g carbs · {item.proteinGrams}g prot · {item.fatGrams}g grasas
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => handleDeleteMealLog(item.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            SECCIÓN 3: CONSULTAS NUTRICIONALES (INICIA EN 0 CONVERSACIONES)
           ==================================================================== */}
        {activeSection === 'chat' && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Consultas nutricionales</h1>
                <p className="page-subtitle">
                  Asesoría conectada en tiempo real a tus metas ({goalKcal} kcal), comidas registradas hoy ({consumedKcal} kcal) y documentos personales.
                </p>
              </div>
              <button type="button" className="btn-solid" onClick={handleNewConversation}>
                + Nueva consulta
              </button>
            </div>

            <div className="chat-layout">
              <div className="card" style={{ padding: '16px' }}>
                <div className="card-title" style={{ fontSize: '0.86rem' }}>
                  Mis conversaciones ({workspace.conversations?.length || 0})
                </div>
                {(workspace.conversations || []).length === 0 ? (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '10px' }}>
                    0 consultas guardadas. Escribe tu primera pregunta a la derecha para iniciar.
                  </p>
                ) : (
                  <div className="thread-list">
                    {(workspace.conversations || []).map(conv => (
                      <div
                        key={conv.id}
                        className={`thread-item ${
                          activeConversation && activeConversation.id === conv.id ? 'active' : ''
                        }`}
                        onClick={() =>
                          updateWorkspace(prev => ({ ...prev, activeConversationId: conv.id }))
                        }
                      >
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '8px' }}>
                          {conv.title}
                        </div>
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ padding: '2px 6px', fontSize: '0.74rem' }}
                          onClick={e => {
                            e.stopPropagation();
                            handleDeleteConversation(conv.id);
                          }}
                          title="Eliminar conversación"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="chat-box">
                <div className="chat-feed">
                  {!activeConversation || (activeConversation.messages || []).length === 0 ? (
                    <div style={{ margin: 'auto', textAlign: 'center', maxWidth: '440px', color: 'var(--text-secondary)' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.96rem', color: 'var(--text-primary)', marginBottom: '6px' }}>
                        Inicia tu consulta nutricional personalizada
                      </div>
                      <p style={{ fontSize: '0.83rem' }}>
                        Pregunta sobre tus calorías restantes de hoy, ideas de desayuno o cena, tablas de alimentos o los documentos PDF que hayas guardado en tu cuenta.
                      </p>
                    </div>
                  ) : (
                    activeConversation.messages.map(m => (
                      <div key={m.id} className={`bubble-row ${m.role}`}>
                        <div
                          className={`bubble ${m.role} ${m.guardrailTriggered ? 'guardrail' : ''}`}
                        >
                          <div>{renderFormattedText(m.text)}</div>
                          {m.role === 'assistant' && !m.guardrailTriggered && (
                            <>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                                <button
                                  type="button"
                                  className="copilot-chip"
                                  onClick={() => {
                                    setMealEntryMode('database');
                                    setActiveSection('meals');
                                  }}
                                >
                                  ➕ Agregar al diario
                                </button>
                                <button
                                  type="button"
                                  className="copilot-chip"
                                  onClick={() => {
                                    setSummaryTab('menu');
                                    setActiveSection('summary');
                                  }}
                                >
                                  🍳 Crear receta
                                </button>
                                <button
                                  type="button"
                                  className="copilot-chip"
                                  onClick={() =>
                                    handleSendQuestion(
                                      `Dame una sustitución más saludable o económica en ${processCoach.country.name} para tu recomendación anterior.`
                                    )
                                  }
                                >
                                  🔄 Sustituir ingrediente
                                </button>
                              </div>
                              <HealthDisclaimer compact />
                            </>
                          )}

                          {m.citations && m.citations.length > 0 && (
                            <div className="source-list">
                              {m.citations.map((cit, i) => (
                                <div key={i} className="source-tag">
                                  Referencia de tu biblioteca: <strong>{cit.documentName}</strong> (Pág. {cit.pageNumber})
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {m.createdAt && <div className="bubble-meta">{m.createdAt}</div>}
                      </div>
                    ))
                  )}
                </div>

                <div className="suggestion-bar">
                  <button
                    type="button"
                    className="chip-minimal"
                    onClick={() =>
                      handleSendQuestion(
                        '¿Cómo voy hoy con mis calorías y qué me recomiendas para mi próxima comida?'
                      )
                    }
                  >
                    Evaluar mi progreso de hoy
                  </button>
                  <button
                    type="button"
                    className="chip-minimal"
                    onClick={() =>
                      handleSendQuestion(
                        '¿Qué alimentos aportan carbohidratos complejos y cuántas calorías tienen 100g de avena, arroz y pollo?'
                      )
                    }
                  >
                    Calorías de avena, arroz y pollo
                  </button>
                  <button
                    type="button"
                    className="chip-minimal"
                    onClick={() =>
                      handleSendQuestion(
                        '¿Qué opciones de cena ligera recomiendas para cuidar la glucosa?'
                      )
                    }
                  >
                    Opciones de cena ligera
                  </button>
                  <button
                    type="button"
                    className="chip-minimal"
                    onClick={() =>
                      handleSendQuestion(
                        '¿Quién ganó el partido de fútbol de la Champions ayer?'
                      )
                    }
                  >
                    Probar pregunta fuera de tema
                  </button>
                </div>

                <form
                  className="chat-composer"
                  onSubmit={e => {
                    e.preventDefault();
                    handleSendQuestion();
                  }}
                >
                  <input
                    type="text"
                    className="input-clean"
                    placeholder="Escribe tu consulta sobre alimentación, calorías o bienestar..."
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                  />
                  <button type="submit" className="btn-solid" disabled={isSendingChat}>
                    {isSendingChat ? 'Analizando...' : 'Enviar'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            SECCIÓN 4: MIS DOCUMENTOS Y GUÍAS PDF (INICIA EN 0 DOCUMENTOS)
           ==================================================================== */}
        {activeSection === 'documents' && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Mis documentos</h1>
                <p className="page-subtitle">
                  Sube tus propios planes nutricionales o guías en PDF. Se indexan en tu cuenta y la copia temporal se elimina del servidor.
                </p>
              </div>
            </div>

            <div className="split-grid">
              <div className="card">
                <div className="card-title">Subir e indexar documento personal</div>
                <div className="card-desc">
                  Carga un archivo desde tu computador o pega las indicaciones de tu plan nutricional.
                </div>

                <form onSubmit={handleAddDocumentToAccount} className="form-stack">
                  <div className="field-group">
                    <label className="field-label">Archivo desde tu computador (.pdf, .txt)</label>
                    <input
                      type="file"
                      accept=".pdf,.txt,.md"
                      onChange={handleFileUploadPdf}
                      className="input-clean"
                      style={{ padding: '7px 10px' }}
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">Nombre del documento</label>
                    <input
                      type="text"
                      className="input-clean"
                      placeholder="Ej. Mi_Plan_Nutricional.pdf"
                      value={newDocName}
                      onChange={e => setNewDocName(e.target.value)}
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">Contenido o pautas del documento</label>
                    <textarea
                      rows={5}
                      className="input-clean"
                      placeholder="Pega o escribe el contenido de tu plan para poder consultarlo desde el chat..."
                      value={newDocContent}
                      onChange={e => setNewDocContent(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <button type="submit" className="btn-solid" disabled={isIndexingDoc}>
                      {isIndexingDoc ? 'Indexando...' : 'Guardar en mi biblioteca'}
                    </button>
                    {docIndexedNotice && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 500 }}>
                        {docIndexedNotice}
                      </span>
                    )}
                  </div>
                </form>
              </div>

              <div className="card">
                <div className="card-title">
                  Biblioteca de {currentUser.name.split(' ')[0]} ({workspace.documents?.length || 0})
                </div>
                <div className="card-desc">
                  Documentos indexados exclusivamente en tu cuenta.
                </div>

                {(workspace.documents || []).length === 0 ? (
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', padding: '16px 0' }}>
                    0 documentos registrados en tu cuenta. Sube tu primer plan o guía a la izquierda cuando lo necesites.
                  </p>
                ) : (
                  <div className="list-stack">
                    {(workspace.documents || []).map(doc => (
                      <div key={doc.id} className="list-item-card">
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{doc.fileName}</div>
                          <div style={{ fontSize: '0.77rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                            {doc.totalPages} páginas · {doc.totalChunks} secciones · Subido: {doc.createdAt}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                            🔒 Guardado de forma privada en tu cuenta
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => handleDeleteDocument(doc.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            SECCIÓN 4.5: RENDIMIENTO CORPORAL, TELEMETRÍA IA Y BASE RELACIONAL
           ==================================================================== */}
        {activeSection === 'analytics' && (
          <>
          <HealthProgressSection
            currentUser={currentUser}
            bodyAdherence={Math.round(
              pctKcal * 0.4 +
                pctProtein * 0.35 +
                (goalWater > 0 ? Math.min(100, Math.round((waterTodayMl / goalWater) * 100)) : 0) *
                  0.25
            )}
            userMemory={userMemory}
            aiProgress={aiProgress}
            clinicalRecord={clinicalRecord}
            clinicalRubric={clinicalRubric}
            clinicalConsentChecked={clinicalConsentChecked}
            setClinicalConsentChecked={setClinicalConsentChecked}
            selectedInstitutionId={selectedInstitutionId}
            setSelectedInstitutionId={setSelectedInstitutionId}
            clinicalSyncNotice={clinicalSyncNotice}
            onFederatedDiscovery={handleFederatedHospitalDiscovery}
            onUpdateClinicalField={handleUpdateClinicalField}
            onApplyRubricConditions={handleApplyRubricConditionsToProfile}
            onExportPdf={() =>
              openPrintableClinicalReport({
                userProfile: currentUser,
                metrics: processCoach.metrics,
                countryName: processCoach.country.name,
                activeProtocols: userMemory.activeProtocols,
                clinicalRecord,
                clinicalRubric,
                adaptiveCheckIn,
                mealsToday,
                userMemory
              })
            }
          />
          <RetentionHubSection
            currentUser={currentUser}
            workspace={workspace}
            countryName={processCoach.country.name}
            aiProgress={aiProgress}
            waterTodayMl={waterTodayMl}
            goalWater={goalWater}
            onSaveWellnessLog={(entry) =>
              updateWorkspace(prev => ({
                ...prev,
                wellnessLogs: [entry, ...(prev.wellnessLogs || [])]
              }))
            }
            onSaveReminders={(nextRem) =>
              updateWorkspace(prev => ({
                ...prev,
                reminders: nextRem
              }))
            }
            onImportCsvData={({ importedMeals, importedWellness }) =>
              updateWorkspace(prev => ({
                ...prev,
                mealLogs: [...importedMeals, ...(prev.mealLogs || [])],
                wellnessLogs: [...importedWellness, ...(prev.wellnessLogs || [])]
              }))
            }
          />
          <Suspense fallback={<Skeleton height="240px" style={{ marginTop: '18px' }} />}>
            <NutritionChartsPanel workspace={workspace} userProfile={currentUser} />
          </Suspense>
          </>
        )}

        {activeSection === 'profile' && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Mi cuenta y metas nutricionales</h1>
                <p className="page-subtitle">
                  Registra tus medidas y calcula o define tus metas diarias para el seguimiento de tu cuenta.
                </p>
              </div>
            </div>

            <div className="split-grid">
              <div className="card">
                <div className="card-title">Datos físicos y metas de seguimiento</div>
                <div className="card-desc">
                  Ingresa tu peso, estatura y edad para calcular tus metas automáticamente o escríbelas tú mismo.
                </div>

                <form onSubmit={handleSaveProfile} className="form-stack">
                  <div className="field-group">
                    <label className="field-label">Nombre completo</label>
                    <input
                      type="text"
                      className="input-clean"
                      value={profName}
                      onChange={e => setProfName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="field-row">
                    <div className="field-group">
                      <label className="field-label">Peso actual (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="input-clean"
                        value={profWeight}
                        onChange={e => setProfWeight(e.target.value)}
                      />
                    </div>
                    <div className="field-group">
                      <label className="field-label">Estatura (cm)</label>
                      <input
                        type="number"
                        className="input-clean"
                        value={profHeight}
                        onChange={e => setProfHeight(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="field-row">
                    <div className="field-group">
                      <label className="field-label">Edad (años)</label>
                      <input
                        type="number"
                        className="input-clean"
                        value={profAge}
                        onChange={e => setProfAge(e.target.value)}
                      />
                    </div>
                    <div className="field-group">
                      <label className="field-label">Nivel de actividad física</label>
                      <select
                        className="input-clean"
                        value={profActivity}
                        onChange={e => setProfActivity(e.target.value)}
                      >
                        <option value="sedentario">Sedentario (poco ejercicio)</option>
                        <option value="ligero">Ligero (1-3 días/semana)</option>
                        <option value="moderado">Moderado (3-5 días/semana)</option>
                        <option value="intenso">Intenso (6-7 días/semana)</option>
                      </select>
                    </div>
                  </div>

                  <div className="field-row">
                    <div className="field-group">
                      <label className="field-label">País (productividad alimenticia local)</label>
                      <select
                        className="input-clean"
                        value={profCountry}
                        onChange={e => setProfCountry(e.target.value)}
                      >
                        {COUNTRY_OPTIONS.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field-group">
                      <label className="field-label">Posibilidades / presupuesto alimenticio</label>
                      <select
                        className="input-clean"
                        value={profBudget}
                        onChange={e => setProfBudget(e.target.value)}
                      >
                        {BUDGET_OPTIONS.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="field-row">
                    <div className="field-group">
                      <label className="field-label">Sexo biológico (para cálculo TMB)</label>
                      <select
                        className="input-clean"
                        value={profSex}
                        onChange={e => setProfSex(e.target.value)}
                      >
                        {SEX_OPTIONS.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field-group">
                      <label className="field-label">Tipo de metabolismo</label>
                      <select
                        className="input-clean"
                        value={profMetabolism}
                        onChange={e => setProfMetabolism(e.target.value)}
                      >
                        {METABOLISM_OPTIONS.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="field-group">
                    <label className="field-label">
                      Condiciones médicas o enfoques clínicos (Base Global OMS · ADA · AHA/DASH · ISSN)
                    </label>
                    <div className="list-stack" style={{ marginTop: '4px' }}>
                      {MEDICAL_CONDITIONS.map(cond => {
                        const checked = profMedicalConditions.includes(cond.id);
                        return (
                          <label
                            key={cond.id}
                            className="list-item-card"
                            style={{ cursor: 'pointer', alignItems: 'flex-start', gap: '10px', padding: '10px 12px' }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleMedicalCondition(cond.id)}
                              style={{ marginTop: '3px' }}
                            />
                            <div>
                              <div style={{ fontWeight: 500, fontSize: '0.82rem' }}>{cond.label}</div>
                              <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                                {cond.source}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="field-group">
                    <label className="field-label">Factores físicos o notas para la IA (opcional)</label>
                    <input
                      type="text"
                      className="input-clean"
                      placeholder="Ej. Resistencia a la insulina, entreno en ayunas, intolerancia a la lactosa..."
                      value={profPhysicalNotes}
                      onChange={e => setProfPhysicalNotes(e.target.value)}
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">Objetivo nutricional</label>
                    <select
                      className="input-clean"
                      value={profGoal}
                      onChange={e => setProfGoal(e.target.value)}
                    >
                      {GOAL_OPTIONS.map(g => (
                        <option key={g.id} value={g.id}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={handleAutoCalculateTargets}
                      style={{ width: '100%' }}
                    >
                      Calcular mis calorías y macronutrientes según mis datos
                    </button>
                  </div>

                  <div className="field-row">
                    <div className="field-group">
                      <label className="field-label">Meta de calorías diarias (kcal)</label>
                      <input
                        type="number"
                        className="input-clean"
                        value={profCalories}
                        onChange={e => setProfCalories(e.target.value)}
                      />
                    </div>
                    <div className="field-group">
                      <label className="field-label">Meta de agua diaria (ml)</label>
                      <input
                        type="number"
                        className="input-clean"
                        value={profWaterGoal}
                        onChange={e => setProfWaterGoal(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="field-row">
                    <div className="field-group">
                      <label className="field-label">Meta carbohidratos (g/día)</label>
                      <input
                        type="number"
                        className="input-clean"
                        value={profCarbs}
                        onChange={e => setProfCarbs(e.target.value)}
                      />
                    </div>
                    <div className="field-group">
                      <label className="field-label">Meta proteínas (g/día)</label>
                      <input
                        type="number"
                        className="input-clean"
                        value={profProtein}
                        onChange={e => setProfProtein(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="field-group">
                    <label className="field-label">Meta grasas saludables (g/día)</label>
                    <input
                      type="number"
                      className="input-clean"
                      value={profFat}
                      onChange={e => setProfFat(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                    <button type="submit" className="btn-solid">
                      Guardar mis metas
                    </button>
                    {profileSavedNotice && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 500 }}>
                        {profileSavedNotice}
                      </span>
                    )}
                  </div>
                </form>
              </div>

              <div className="card">
                <div className="card-title">Diagnóstico físico, metabólico y país</div>
                <div className="card-desc">
                  Correo registrado: <strong>{currentUser.email}</strong> · País seleccionado:{' '}
                  <strong>{liveSelectedCountry.name}</strong>
                </div>

                <div className="list-stack">
                  <div className="list-item-card">
                    <span>Tasa Metabólica Basal (TMB)</span>
                    <strong>{liveProfileMetrics ? `${liveProfileMetrics.bmr} kcal/día` : 'Completa peso/estatura/edad'}</strong>
                  </div>
                  <div className="list-item-card">
                    <span>Gasto Energético Total (GET)</span>
                    <strong>{liveProfileMetrics ? `${liveProfileMetrics.tdee} kcal/día` : 'Pendiente'}</strong>
                  </div>
                  <div className="list-item-card">
                    <span>Índice de Masa Corporal (IMC)</span>
                    <strong>
                      {liveProfileMetrics
                        ? `${liveProfileMetrics.bmi} (${liveProfileMetrics.bmiCategory})`
                        : 'Pendiente'}
                    </strong>
                  </div>
                  <div className="list-item-card">
                    <span>Meta calórica configurada</span>
                    <strong>{goalKcal} kcal</strong>
                  </div>
                  <div className="list-item-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                    <strong>Plus alimenticio de {liveSelectedCountry.name}</strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {liveSelectedCountry.productivityFocus}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--accent)' }}>
                      {liveSelectedCountry.nutritionalPlus}
                    </span>
                  </div>
                  <div className="list-item-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                    <strong>Protocolos clínicos activos ({liveActiveProtocols.length})</strong>
                    {liveActiveProtocols.length === 0 ? (
                      <span style={{ fontSize: '0.77rem', color: 'var(--text-secondary)' }}>
                        Ninguna condición médica marcada (guías generales OMS/FAO/ISSN activas).
                      </span>
                    ) : (
                      liveActiveProtocols.map(p => (
                        <span key={p.id} style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                          • <strong>{p.label}:</strong> {p.alertRule}
                        </span>
                      ))
                    )}
                  </div>
                  <div className="list-item-card">
                    <span>Comidas / Consultas / Documentos</span>
                    <strong>
                      {workspace.mealLogs?.length || 0} / {workspace.conversations?.length || 0} / {workspace.documents?.length || 0}
                    </strong>
                  </div>
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={handleExportAccountBackupJson}
                  >
                    Descargar respaldo completo de mis datos (JSON)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <CopilotDrawer
        copilotOpen={copilotOpen}
        onToggleOpen={setCopilotOpen}
        activeSection={activeSection}
        countryName={processCoach.country.name}
        copilotInput={copilotInput}
        onChangeInput={setCopilotInput}
        copilotReply={copilotReply}
        isCopilotLoading={isCopilotLoading}
        onAsk={handleCopilotAsk}
        onNavigate={setActiveSection}
      />

      <MobileBottomNav
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        quickAddOpen={quickAddOpen}
        setQuickAddOpen={setQuickAddOpen}
        onQuickFoodSearch={() => {
          setMealEntryMode('database');
          setActiveSection('meals');
        }}
        onQuickPhotoScan={() => {
          setMealEntryMode('photo');
          setActiveSection('meals');
        }}
        onQuickBarcodeScan={() => {
          setMealEntryMode('barcode');
          setActiveSection('meals');
        }}
        onQuickAddWater={() => {
          handleAdjustWater(250);
          showToast('💧 +250 ml sumados a tu hidratación de hoy');
          setTimeout(() => clearToast(), 2800);
        }}
      />

      <Toast message={toast?.message} tone={toast?.tone} onDismiss={clearToast} />
    </div>
  );
}
