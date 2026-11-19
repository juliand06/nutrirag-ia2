import React, { useState, useEffect } from 'react';
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
  GOAL_OPTIONS,
  getTodayIso,
  loadUsers,
  getCurrentSessionUser,
  setCurrentSessionUser,
  authenticateUser,
  registerNewUser,
  calculateRecommendedTargets,
  updateUserProfile,
  getUserWorkspace,
  saveUserWorkspace,
  computeRealSha256
} from './services/userStorage';

// Renderizador limpio de texto con soporte de encabezados (#), negritas (**texto**) y listas
function renderFormattedText(rawText) {
  if (!rawText) return null;
  const lines = String(rawText).split('\n');
  return lines.map((line, lineIdx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return <div key={lineIdx} style={{ height: '8px' }} />;
    }
    const isHeading = /^#{1,4}\s+/.test(trimmed);
    const isBullet = /^[-*•]\s+/.test(trimmed);
    const cleanLine = isHeading
      ? trimmed.replace(/^#{1,4}\s+/, '')
      : isBullet
        ? trimmed.replace(/^[-*•]\s+/, '')
        : line;

    const parts = cleanLine.split(/(\*\*[^*]+\*\*)/g);
    const renderedParts = parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
      }
      return <span key={pIdx}>{part}</span>;
    });

    if (isHeading) {
      return (
        <div
          key={lineIdx}
          style={{
            fontWeight: 600,
            fontSize: '0.94rem',
            marginTop: lineIdx > 0 ? '10px' : 0,
            marginBottom: '4px'
          }}
        >
          {renderedParts}
        </div>
      );
    }

    if (isBullet) {
      return (
        <div
          key={lineIdx}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            paddingLeft: '4px',
            marginTop: '4px'
          }}
        >
          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>•</span>
          <span>{renderedParts}</span>
        </div>
      );
    }

    return (
      <div key={lineIdx} style={{ marginTop: lineIdx > 0 ? '4px' : 0 }}>
        {renderedParts}
      </div>
    );
  });
}

export default function App() {
  const envGemini = (import.meta.env.VITE_GEMINI_API_KEY || '').trim();
  const envOpenAi = (import.meta.env.VITE_OPENAI_API_KEY || '').trim();
  const validGemini = envGemini && envGemini !== 'TU_API_KEY_AQUI' ? envGemini : '';
  const validOpenAi = envOpenAi && envOpenAi !== 'TU_API_KEY_AQUI' ? envOpenAi : '';

  const [aiConfig] = useState({
    provider: validGemini ? 'GEMINI' : validOpenAi ? 'OPENAI' : 'DEMO',
    openAiKey: validOpenAi,
    geminiKey: validGemini
  });

  // Estado de Autenticación y Cuenta Activa
  const [currentUser, setCurrentUser] = useState(() => getCurrentSessionUser());
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authError, setAuthError] = useState('');

  // Campos de Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Campos de Registro (limpio: la cuenta inicia con todos los datos en 0)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Espacio de trabajo persistente del usuario activo
  const [workspace, setWorkspace] = useState(() =>
    currentUser ? getUserWorkspace(currentUser) : null
  );
  const [activeSection, setActiveSection] = useState('summary'); // 'summary' | 'chat' | 'meals' | 'documents' | 'profile'

  // Estado de Consultas (Chat)
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);

  // Estado de Escáner y Registro de Comidas (inicia vacío hasta que el usuario suba o registre un plato)
  const [mealEntryMode, setMealEntryMode] = useState('photo'); // 'photo' | 'manual'
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

  // Copiloto IA Omnipresente (contextual en toda la plataforma)
  const [copilotOpen, setCopilotOpen] = useState(false);
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
      return next;
    });
  };

  // ============================================================================
  // MANEJADORES DE AUTENTICACIÓN
  // ============================================================================
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const user = authenticateUser(loginEmail, loginPassword);
      setCurrentUser(user);
      setActiveSection('summary');
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const user = registerNewUser({
        name: regName,
        email: regEmail,
        password: regPassword
      });
      setCurrentUser(user);
      setActiveSection('summary');
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleQuickLogin = (email, password) => {
    setAuthError('');
    try {
      const user = authenticateUser(email, password);
      setCurrentUser(user);
      setActiveSection('summary');
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    setCurrentSessionUser(null);
    setCurrentUser(null);
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

      if (aiConfig.provider === 'GEMINI' && aiConfig.geminiKey?.trim() && typeof dataUrl === 'string') {
        try {
          const base64Data = dataUrl.split(',')[1];
          const mimeType = file.type || 'image/jpeg';
          const modelsToTry = ['gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-flash-latest'];
          for (const modelName of modelsToTry) {
            const res = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${aiConfig.geminiKey.trim()}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [
                    {
                      parts: [
                        {
                          text: `Analiza esta imagen para el registro nutricional personal de ${currentUser.name}. Nota: "${customMealNote || file.name}". Devuelve ÚNICAMENTE un JSON válido sin markdown con esta estructura: {"isFoodValid": true o false (false si NO es comida ni bebida), "dishName": "nombre claro del plato", "totalCalories": int, "carbsGrams": int, "proteinGrams": int, "fatGrams": int, "fiberGrams": int, "glycemicLoad": "Baja/Media/Alta", "ingredients": [{"name": "ingrediente y porción", "calories": int, "carbsGrams": int, "proteinGrams": int, "fatGrams": int}], "nutritionalAdvice": "observación nutricional clara y tranquila en español (si isFoodValid es false, invita con calma a subir una foto de comida)"}`
                        },
                        {
                          inline_data: {
                            mime_type: mimeType,
                            data: base64Data
                          }
                        }
                      ]
                    }
                  ]
                })
              }
            );
            if (res.ok) {
              const data = await res.json();
              const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
              const jsonMatch = rawText.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
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
            }
          }
        } catch {
          // Respaldo local si no hay red
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
    updateWorkspace(prev => ({
      ...prev,
      mealLogs: (prev.mealLogs || []).filter(m => m.id !== mealId)
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
      dailyCalories: Math.max(0, Number(profCalories) || 0),
      targetCarbs: Math.max(0, Number(profCarbs) || 0),
      targetProtein: Math.max(0, Number(profProtein) || 0),
      targetFat: Math.max(0, Number(profFat) || 0),
      waterGoalMl: Math.max(0, Number(profWaterGoal) || 0)
    });
    if (updated) {
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
  // VISTA 0: SI NO HAY SESIÓN INICIADA -> LOGIN / REGISTRO PROFESIONAL
  // ============================================================================
  if (!currentUser || !workspace) {
    const existingUsers = loadUsers();
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-brand">
            <div className="auth-mark">N</div>
            <span className="auth-brand-name">NutriStudio</span>
          </div>

          <h1 className="auth-title">
            {authMode === 'login' ? 'Iniciar sesión' : 'Crear una cuenta'}
          </h1>
          <p className="auth-subtitle">
            {authMode === 'login'
              ? 'Ingresa tus credenciales para acceder a tu seguimiento personal.'
              : 'Regístrate para iniciar tu seguimiento nutricional desde cero.'}
          </p>

          <div className="auth-switcher">
            <button
              type="button"
              className={`auth-switch-btn ${authMode === 'login' ? 'active' : ''}`}
              onClick={() => {
                setAuthMode('login');
                setAuthError('');
              }}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              className={`auth-switch-btn ${authMode === 'register' ? 'active' : ''}`}
              onClick={() => {
                setAuthMode('register');
                setAuthError('');
              }}
            >
              Registrarse
            </button>
          </div>

          {authError && <div className="error-banner">{authError}</div>}

          {authMode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="form-stack">
              <div className="field-group">
                <label className="field-label">Correo electrónico</label>
                <input
                  type="email"
                  className="input-clean"
                  placeholder="nombre@correo.com"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  required
                />
              </div>
              <div className="field-group">
                <label className="field-label">Contraseña</label>
                <input
                  type="password"
                  className="input-clean"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn-solid" style={{ marginTop: '6px' }}>
                Entrar
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="form-stack">
              <div className="field-group">
                <label className="field-label">Nombre completo</label>
                <input
                  type="text"
                  className="input-clean"
                  placeholder="Ej. Camilo Restrepo"
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  required
                />
              </div>
              <div className="field-group">
                <label className="field-label">Correo electrónico</label>
                <input
                  type="email"
                  className="input-clean"
                  placeholder="camilo@correo.com"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  required
                />
              </div>
              <div className="field-group">
                <label className="field-label">Contraseña</label>
                <input
                  type="password"
                  className="input-clean"
                  placeholder="Mínimo 4 caracteres"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn-solid" style={{ marginTop: '6px' }}>
                Crear cuenta
              </button>
            </form>
          )}

          {existingUsers.length > 0 && (
            <div className="quick-accounts">
              <div className="quick-accounts-label">
                Cuentas registradas en este navegador:
              </div>
              <div className="quick-account-list">
                {existingUsers.map(u => (
                  <div
                    key={u.id}
                    className="quick-account-item"
                    onClick={() => handleQuickLogin(u.email, u.password)}
                  >
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>{u.name}</strong>
                      <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>
                        ({u.email})
                      </span>
                    </div>
                    <span className="tag-pill">
                      {u.dailyCalories > 0 ? `${u.dailyCalories} kcal` : 'En 0 (Nueva)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
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

  return (
    <div className="workspace-layout">
      {/* BARRA LATERAL MINIMALISTA */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-brand">
            <div className="auth-mark">N</div>
            <span className="auth-brand-name">NutriStudio</span>
          </div>

          <nav className="sidebar-nav">
            <button
              className={`sidebar-link ${activeSection === 'summary' ? 'active' : ''}`}
              onClick={() => setActiveSection('summary')}
            >
              <span>Seguimiento diario</span>
            </button>
            <button
              className={`sidebar-link ${activeSection === 'meals' ? 'active' : ''}`}
              onClick={() => setActiveSection('meals')}
            >
              <span>Comidas</span>
              <span className="sidebar-count">{workspace.mealLogs?.length || 0}</span>
            </button>
            <button
              className={`sidebar-link ${activeSection === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveSection('chat')}
            >
              <span>Consultas</span>
              <span className="sidebar-count">{workspace.conversations?.length || 0}</span>
            </button>
            <button
              className={`sidebar-link ${activeSection === 'documents' ? 'active' : ''}`}
              onClick={() => setActiveSection('documents')}
            >
              <span>Mis documentos</span>
              <span className="sidebar-count">{workspace.documents?.length || 0}</span>
            </button>
            <button
              className={`sidebar-link ${activeSection === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveSection('analytics')}
            >
              <span>Rendimiento e IA</span>
              <span className="sidebar-count">{userMemory.knowledgeScore}%</span>
            </button>
            <button
              className={`sidebar-link ${activeSection === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveSection('profile')}
            >
              <span>Mi cuenta y metas</span>
            </button>
          </nav>
        </div>

        <div className="sidebar-user">
          <div className="user-summary">
            <div className="user-avatar">{userInitials}</div>
            <div style={{ overflow: 'hidden' }}>
              <div className="user-name">{currentUser.name}</div>
              <div className="user-meta">{currentUser.email}</div>
            </div>
          </div>
          <button type="button" className="btn-outline" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </aside>

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
                  {currentGoalLabel} · Peso actual: {currentUser.weightKg || 0} kg · Meta diaria: {goalKcal} kcal
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
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
              <div
                className="card"
                style={{
                  marginBottom: '22px',
                  background: 'var(--bg-surface)',
                  borderLeft: '4px solid var(--accent)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '14px'
                }}
              >
                <div style={{ maxWidth: '680px' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    Soporte nutricional inteligente sobre tu progreso de hoy
                  </div>
                  <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                    Llevas <strong>{consumedKcal} kcal</strong> de <strong>{goalKcal} kcal</strong> ({pctKcal}%) y <strong>{consumedProtein}g</strong> de proteína. Te restan <strong>{Math.max(0, goalKcal - consumedKcal)} kcal</strong> y <strong>{Math.max(0, goalProtein - consumedProtein)}g de proteína</strong> para alcanzar tu objetivo de hoy.
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => {
                    setActiveSection('chat');
                    handleSendQuestion(
                      `Llevo ${consumedKcal} kcal consumidas hoy de mi meta de ${goalKcal} kcal (${consumedCarbs}g carbohidratos y ${consumedProtein}g proteína). ¿Qué comida me recomiendas para completar mis requerimientos de hoy?`
                    );
                  }}
                >
                  Sugerir comida según mis calorías restantes
                </button>
              </div>
            )}

            {/* Tarjetas de progreso calórico y de macronutrientes del día */}
            <div className="stats-row">
              <div className="stat-box">
                <div className="stat-label">Calorías hoy</div>
                <div className="stat-value">
                  {consumedKcal}{' '}
                  <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                    / {goalKcal} kcal
                  </span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${pctKcal}%` }} />
                </div>
                <div className="stat-sub">
                  {goalKcal > 0
                    ? `${Math.max(0, goalKcal - consumedKcal)} kcal restantes hoy`
                    : 'Meta en 0 kcal'}
                </div>
              </div>

              <div className="stat-box">
                <div className="stat-label">Carbohidratos</div>
                <div className="stat-value">
                  {consumedCarbs}g{' '}
                  <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                    / {goalCarbs}g
                  </span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${pctCarbs}%` }} />
                </div>
                <div className="stat-sub">{pctCarbs}% completado</div>
              </div>

              <div className="stat-box">
                <div className="stat-label">Proteínas</div>
                <div className="stat-value">
                  {consumedProtein}g{' '}
                  <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                    / {goalProtein}g
                  </span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${pctProtein}%` }} />
                </div>
                <div className="stat-sub">{pctProtein}% completado</div>
              </div>

              <div className="stat-box">
                <div className="stat-label">Grasas saludables</div>
                <div className="stat-value">
                  {consumedFat}g{' '}
                  <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                    / {goalFat}g
                  </span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${pctFat}%` }} />
                </div>
                <div className="stat-sub">{pctFat}% completado</div>
              </div>
            </div>

            {/* ACOMPAÑAMIENTO ACTIVO DE LA IA EN EL PROCESO (PAÍS + METABOLISMO + POSIBILIDADES) */}
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
            </div>

            {/* MEMORIA DEL AGENTE IA + BASE NUTRICIONAL Y MÉDICA GLOBAL */}
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
                      Nota: Orientación nutricional educativa basada en guías clínicas globales; no sustituye valoración médica profesional.
                    </span>
                  </div>

                  <div className="list-item-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.82rem' }}>
                      <strong>Control y ahorro de tokens (Uso diario continuo)</strong>
                      <span>
                        {todayTokenStats.used.toLocaleString()} / {TOKEN_GOVERNANCE.DAILY_TOKEN_BUDGET.toLocaleString()} tokens
                      </span>
                    </div>
                    <div className="progress-track" style={{ width: '100%' }}>
                      <div className="progress-fill" style={{ width: `${pctTokenBudget}%` }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Compresión activa (máx. {TOKEN_GOVERNANCE.MAX_CONTEXT_TOKENS} tokens entrada / {TOKEN_GOVERNANCE.MAX_OUTPUT_TOKENS} salida), caché de 0 tokens y guardrail local. Ahorro estimado hoy: <strong>{todayTokenStats.saved.toLocaleString()} tokens</strong>.
                    </span>
                  </div>
                </div>
              </div>
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
                  HISTORIAL DE PESO ({workspace.weightHistory?.length || 0})
                </div>
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
          </div>
        )}

        {/* ====================================================================
            SECCIÓN 2: REGISTRO Y ESCÁNER DE COMIDAS POR USUARIO
           ==================================================================== */}
        {activeSection === 'meals' && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Registro de comidas</h1>
                <p className="page-subtitle">
                  Analiza una fotografía de tu plato o ingresa los datos manualmente para sumarlos a tu seguimiento.
                </p>
              </div>
            </div>

            <div className="split-grid">
              <div className="card">
                <div className="auth-switcher" style={{ marginBottom: '18px' }}>
                  <button
                    type="button"
                    className={`auth-switch-btn ${mealEntryMode === 'photo' ? 'active' : ''}`}
                    onClick={() => setMealEntryMode('photo')}
                  >
                    Analizar foto del plato
                  </button>
                  <button
                    type="button"
                    className={`auth-switch-btn ${mealEntryMode === 'manual' ? 'active' : ''}`}
                    onClick={() => setMealEntryMode('manual')}
                  >
                    Registro manual
                  </button>
                </div>

                {mealEntryMode === 'photo' ? (
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
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                              <span className="tag-pill green">{activeVisionResult.totalCalories} kcal</span>
                              <span className="tag-pill">{activeVisionResult.carbsGrams}g Carbohidratos</span>
                              <span className="tag-pill">{activeVisionResult.proteinGrams}g Proteínas</span>
                              <span className="tag-pill">{activeVisionResult.fatGrams}g Grasas</span>
                              <span className="tag-pill">{activeVisionResult.fiberGrams}g Fibra</span>
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
                            SHA-256: {doc.sha256Hash?.slice(0, 24)}… · Copia temporal eliminada
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
        {activeSection === 'analytics' && (() => {
          const telemetryList = Array.isArray(workspace.aiTelemetry) ? workspace.aiTelemetry : [];
          const avgLatency =
            telemetryList.length > 0
              ? Math.round(
                  telemetryList.reduce((acc, ev) => acc + (Number(ev.latencyMs) || 0), 0) /
                    telemetryList.length
                )
              : 0;
          const totalSavedAll = telemetryList.reduce(
            (acc, ev) => acc + (Number(ev.tokensSaved) || 0),
            0
          );
          const zeroTokenCount = telemetryList.filter(ev => Number(ev.tokensUsed || 0) === 0).length;
          const zeroTokenPct =
            telemetryList.length > 0 ? Math.round((zeroTokenCount / telemetryList.length) * 100) : 100;

          const bodyAdherence = Math.round(
            (pctKcal * 0.4 +
              pctProtein * 0.35 +
              (goalWater > 0 ? Math.min(100, Math.round((waterTodayMl / goalWater) * 100)) : 0) *
                0.25)
          );

          return (
            <div>
              <div className="page-header">
                <div>
                  <h1 className="page-title">Rendimiento Corporal, IA y Base Relacional</h1>
                  <p className="page-subtitle">
                    Monitoreo en vivo de tu proceso físico, gasto y rendimiento de la IA, y conexión entre tu historial relacional y las bases globales/país.
                  </p>
                </div>
              </div>

              <div className="stats-row">
                <div className="stat-box">
                  <div className="stat-label">Adherencia de tu proceso hoy</div>
                  <div className="stat-value">{bodyAdherence}%</div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${bodyAdherence}%` }} />
                  </div>
                  <div className="stat-sub">Calorías · Proteína · Hidratación</div>
                </div>

                <div className="stat-box">
                  <div className="stat-label">Conocimiento del Bot sobre ti</div>
                  <div className="stat-value">{userMemory.knowledgeScore}%</div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${userMemory.knowledgeScore}%` }} />
                  </div>
                  <div className="stat-sub">Memoria clínica + hábitos + país</div>
                </div>

                <div className="stat-box">
                  <div className="stat-label">Gasto de tokens hoy</div>
                  <div className="stat-value">
                    {todayTokenStats.used.toLocaleString()}{' '}
                    <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                      / {TOKEN_GOVERNANCE.DAILY_TOKEN_BUDGET.toLocaleString()}
                    </span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pctTokenBudget}%` }} />
                  </div>
                  <div className="stat-sub">Ahorro acumulado: {Math.max(todayTokenStats.saved, totalSavedAll).toLocaleString()} tokens</div>
                </div>

                <div className="stat-box">
                  <div className="stat-label">Eficiencia y latencia IA</div>
                  <div className="stat-value">{avgLatency > 0 ? `${avgLatency} ms` : '<15 ms'}</div>
                  <div className="stat-sub" style={{ marginTop: '8px' }}>
                    {zeroTokenPct}% resuelto a 0 tokens (caché / local / guardrail)
                  </div>
                </div>
              </div>

              <div className="split-grid" style={{ marginTop: '18px' }}>
                <div className="card">
                  <div className="card-title">Arquitectura de Base de Datos Relacional</div>
                  <div className="card-desc">
                    Conexión en tiempo real entre tu base interna de usuario y las bases externas globales y de país (`docker/init-db.sql`).
                  </div>
                  <div className="list-stack">
                    <div className="list-item-card">
                      <div>
                        <strong>Base Interna · Perfil Biométrico</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          `users_biometric_profiles` · {processCoach.metrics ? `TMB ${processCoach.metrics.bmr} · GET ${processCoach.metrics.tdee} · IMC ${processCoach.metrics.bmi}` : 'Pendiente de medidas'}
                        </div>
                      </div>
                      <span className="tag-pill">Activo</span>
                    </div>
                    <div className="list-item-card">
                      <div>
                        <strong>Base Interna · Comidas y Progreso Corporal</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          `daily_meal_logs` ({workspace.mealLogs?.length || 0}) · `body_progress_logs` ({workspace.weightHistory?.length || 0})
                        </div>
                      </div>
                      <span className="tag-pill">Relacional</span>
                    </div>
                    <div className="list-item-card">
                      <div>
                        <strong>Base Externa · Productividad por País</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          `country_food_productivity` → {processCoach.country.name} ({processCoach.country.foods.length} alimentos locales indexados)
                        </div>
                      </div>
                      <span className="tag-pill">{processCoach.country.id}</span>
                    </div>
                    <div className="list-item-card">
                      <div>
                        <strong>Base Externa · Rúbricas Médicas Globales</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          `clinical_nutrition_rubrics` (OMS · FAO · ADA · AHA/DASH · ISSN) · {userMemory.activeProtocols.length} activas en tu perfil
                        </div>
                      </div>
                      <span className="tag-pill">RAG Híbrido</span>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-title">Telemetría reciente de la IA ({telemetryList.length})</div>
                  <div className="card-desc">
                    Registro de cada interacción: pantalla, modo de enrutamiento, latencia y tokens consumidos/ahorrados.
                  </div>
                  {telemetryList.length === 0 ? (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: '14px 0' }}>
                      Aún no hay eventos registrados hoy. Usa el Copiloto IA flotante o haz una consulta para ver la telemetría en vivo.
                    </p>
                  ) : (
                    <div className="list-stack">
                      {telemetryList.slice(0, 6).map(ev => (
                        <div key={ev.id} className="list-item-card">
                          <div>
                            <strong style={{ fontSize: '0.82rem' }}>{ev.mode}</strong>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                              Pantalla: {ev.screen} · {ev.time} · {ev.latencyMs} ms
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', fontSize: '0.75rem' }}>
                            <strong>{ev.tokensUsed} tok</strong>
                            <div style={{ color: 'var(--accent)' }}>-{ev.tokensSaved} ahorrados</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* VINCULACIÓN CLÍNICA / HOSPITALARIA POR CORREO + RÚBRICA DE COORDINACIÓN */}
              <div className="card" style={{ marginTop: '20px' }}>
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
                      Interoperabilidad Clínica / Hospitalaria · Correo verificado: {currentUser.email}
                    </span>
                    <div className="card-title" style={{ marginTop: '8px' }}>
                      Expediente Clínico Real y Rúbrica de Coordinación de Datos
                    </div>
                    <div className="card-desc" style={{ marginBottom: 0 }}>
                      Conecta tus registros de clínicas especializadas u hospitales mediante el mismo Gmail/correo con el que estás registrado. La rúbrica audita la concordancia con tus datos reales para que la IA te guíe con precisión clínica.
                    </div>
                  </div>
                  {clinicalRubric && (
                    <span className="tag-pill" style={{ fontWeight: 600 }}>
                      Concordancia Rúbrica: {clinicalRubric.totalScore}%
                    </span>
                  )}
                </div>

                {!clinicalRecord ? (
                  <div className="form-stack" style={{ marginTop: '12px' }}>
                    <label
                      className="list-item-card"
                      style={{ cursor: 'pointer', alignItems: 'flex-start', gap: '10px', padding: '10px 12px' }}
                    >
                      <input
                        type="checkbox"
                        checked={clinicalConsentChecked}
                        onChange={e => setClinicalConsentChecked(e.target.checked)}
                        style={{ marginTop: '3px' }}
                      />
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        <strong>Consentimiento informado (SMART on FHIR / OAuth2):</strong> Autorizo a NutriStudio a consultar y consolidar mi historial clínico usando mi correo verificado (<strong>{currentUser.email}</strong>) únicamente en clínicas, hospitales y laboratorios autorizados de la red interoperable.
                      </span>
                    </label>

                    <div className="field-row">
                      <div className="field-group">
                        <label className="field-label">Clínica especializada u hospital específico</label>
                        <select
                          className="input-clean"
                          value={selectedInstitutionId}
                          onChange={e => setSelectedInstitutionId(e.target.value)}
                        >
                          {CLINICAL_INSTITUTIONS.map(inst => (
                            <option key={inst.id} value={inst.id}>
                              {inst.name} — {inst.evidenceGrade}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field-group" style={{ justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn-solid"
                          onClick={handleFederatedHospitalDiscovery}
                        >
                          Consolidar toda la Red Federada de Clínicas y Hospitales (FHIR)
                        </button>
                        <button
                          type="button"
                          className="btn-outline"
                          onClick={handleSyncClinicByEmail}
                        >
                          Sincronizar solo la institución seleccionada
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="split-grid" style={{ marginTop: '14px' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.84rem', marginBottom: '8px' }}>
                        Laboratorios y expediente clínico ({clinicalRecord.institutionName})
                      </div>
                      <div className="form-stack">
                        <div className="field-row">
                          <div className="field-group">
                            <label className="field-label">Glucosa ayunas (mg/dL)</label>
                            <input
                              type="number"
                              className="input-clean"
                              value={clinicalRecord.fastingGlucose}
                              onChange={e => handleUpdateClinicalField('fastingGlucose', Number(e.target.value))}
                            />
                          </div>
                          <div className="field-group">
                            <label className="field-label">HbA1c (%)</label>
                            <input
                              type="number"
                              step="0.1"
                              className="input-clean"
                              value={clinicalRecord.hba1c}
                              onChange={e => handleUpdateClinicalField('hba1c', Number(e.target.value))}
                            />
                          </div>
                        </div>
                        <div className="field-row">
                          <div className="field-group">
                            <label className="field-label">Colesterol LDL (mg/dL)</label>
                            <input
                              type="number"
                              className="input-clean"
                              value={clinicalRecord.ldlCholesterol}
                              onChange={e => handleUpdateClinicalField('ldlCholesterol', Number(e.target.value))}
                            />
                          </div>
                          <div className="field-group">
                            <label className="field-label">Triglicéridos (mg/dL)</label>
                            <input
                              type="number"
                              className="input-clean"
                              value={clinicalRecord.triglycerides}
                              onChange={e => handleUpdateClinicalField('triglycerides', Number(e.target.value))}
                            />
                          </div>
                        </div>
                        <div className="field-row">
                          <div className="field-group">
                            <label className="field-label">Hemoglobina (g/dL)</label>
                            <input
                              type="number"
                              step="0.1"
                              className="input-clean"
                              value={clinicalRecord.hemoglobin}
                              onChange={e => handleUpdateClinicalField('hemoglobin', Number(e.target.value))}
                            />
                          </div>
                          <div className="field-group">
                            <label className="field-label">Presión sistólica (mmHg)</label>
                            <input
                              type="number"
                              className="input-clean"
                              value={clinicalRecord.bloodPressureSys}
                              onChange={e => handleUpdateClinicalField('bloodPressureSys', Number(e.target.value))}
                            />
                          </div>
                        </div>
                        <div className="field-row">
                          <div className="field-group">
                            <label className="field-label">Alergias / Intolerancias</label>
                            <input
                              type="text"
                              className="input-clean"
                              value={clinicalRecord.allergies}
                              onChange={e => handleUpdateClinicalField('allergies', e.target.value)}
                            />
                          </div>
                          <div className="field-group">
                            <label className="field-label">Medicación actual</label>
                            <input
                              type="text"
                              className="input-clean"
                              placeholder="Ej. Metformina, Losartán, Levotiroxina..."
                              value={clinicalRecord.medications}
                              onChange={e => handleUpdateClinicalField('medications', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.84rem', marginBottom: '8px' }}>
                        Rúbrica de Coordinación Clínica (5 Criterios · {clinicalRubric?.totalScore || 0}/100)
                      </div>
                      <div className="list-stack">
                        {(clinicalRubric?.criteria || []).map(c => (
                          <div key={c.name} className="list-item-card" style={{ padding: '8px 12px' }}>
                            <span style={{ fontSize: '0.79rem' }}>{c.name}</span>
                            <strong style={{ fontSize: '0.8rem' }}>
                              {c.score} / {c.max}
                            </strong>
                          </div>
                        ))}

                        {clinicalRubric?.biomarkerAlerts?.length > 0 && (
                          <div className="list-item-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                            <strong style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>
                              Alertas de biomarcadores detectadas
                            </strong>
                            {clinicalRubric.biomarkerAlerts.map((a, i) => (
                              <span key={i} style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                                • {a}
                              </span>
                            ))}
                          </div>
                        )}

                        {clinicalRubric?.drugNutrientAlerts?.length > 0 && (
                          <div className="list-item-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                            <strong style={{ fontSize: '0.8rem' }}>Interacciones fármaco-nutriente</strong>
                            {clinicalRubric.drugNutrientAlerts.map((a, i) => (
                              <span key={i} style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                                • {a}
                              </span>
                            ))}
                          </div>
                        )}

                        {clinicalRecord.federatedSources?.length > 0 && (
                          <div className="list-item-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                            <strong style={{ fontSize: '0.8rem' }}>
                              Nodos clínicos consolidados vía HL7 FHIR ({clinicalRecord.federatedSources.length})
                            </strong>
                            {clinicalRecord.federatedSources.map(src => (
                              <span key={src.institutionId} style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                                • <strong>{src.institutionName}:</strong> {src.resources.join(', ')} ({src.status})
                              </span>
                            ))}
                          </div>
                        )}

                        {clinicalRubric?.missingSyncedConditions?.length > 0 && (
                          <button
                            type="button"
                            className="btn-solid"
                            onClick={() =>
                              handleApplyRubricConditionsToProfile(clinicalRubric.detectedConditions)
                            }
                          >
                            Aplicar {clinicalRubric.missingSyncedConditions.length} protocolo(s) clínico(s) detectado(s) a mi perfil IA
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {clinicalSyncNotice && (
                  <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 500 }}>
                    {clinicalSyncNotice}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ====================================================================
            SECCIÓN 5: MI CUENTA Y METAS (CONFIGURACIÓN DESDE 0 + CALCULADORA)
           ==================================================================== */}
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
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* COPILOTO IA OMNIPRESENTE (SABE EN QUÉ PANTALLA ESTÁS Y TE GUÍA EN TODO MOMENTO) */}
      {copilotOpen && (() => {
        const contextualActions =
          activeSection === 'meals'
            ? [
                {
                  label: 'Evaluar si mis platos hoy cumplen mis protocolos médicos',
                  q: 'Evalúa si mis comidas registradas hoy cumplen mis protocolos médicos y mi meta de proteína.'
                },
                {
                  label: `Alternativa más económica en ${processCoach.country.name}`,
                  q: `Dame una alternativa de plato saludable y económica usando la productividad alimenticia de ${processCoach.country.name}.`
                }
              ]
            : activeSection === 'documents'
              ? [
                  {
                    label: 'Cruzar mis PDFs con las guías médicas globales',
                    q: 'Cruza mis documentos guardados con las guías globales OMS/ADA/DASH y dime qué priorizar hoy.'
                  }
                ]
              : activeSection === 'profile'
                ? [
                    {
                      label: 'Explicar mi TMB, GET y metabolismo',
                      q: 'Explícame mi TMB, GET y cómo manejar mi tipo de metabolismo en mi proceso diario.'
                    }
                  ]
                : [
                    {
                      label: `¿Qué comer ahora en ${processCoach.country.name}?`,
                      q: `Según mi país (${processCoach.country.name}), mi metabolismo y lo que me falta hoy, ¿qué comida me recomiendas ahora?`
                    },
                    {
                      label: 'Revisar mi evolución y alertas clínicas',
                      q: 'Revisa mi evolución de peso, promedio de comidas y condiciones médicas para darme el siguiente paso hoy.'
                    }
                  ];

        return (
          <div className="copilot-drawer">
            <div className="copilot-header">
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                  Copiloto IA NutriStudio · {processCoach.country.name}
                </div>
                <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Contexto activo: <strong>{activeSection}</strong> · Memoria {userMemory.knowledgeScore}% · {todayTokenStats.used}/{TOKEN_GOVERNANCE.DAILY_TOKEN_BUDGET} tok
                </div>
              </div>
              <button
                type="button"
                className="btn-ghost"
                style={{ padding: '4px 8px' }}
                onClick={() => setCopilotOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="copilot-body">
              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                Acciones rápidas para donde estás ahora:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {contextualActions.map(act => (
                  <button
                    key={act.label}
                    type="button"
                    className="btn-outline"
                    style={{ textAlign: 'left', fontSize: '0.78rem', padding: '7px 10px' }}
                    onClick={() => handleCopilotAsk(act.q)}
                    disabled={isCopilotLoading}
                  >
                    {act.label}
                  </button>
                ))}
              </div>

              {isCopilotLoading && (
                <div className="copilot-reply">Analizando tu perfil, país y protocolos médicos…</div>
              )}

              {copilotReply && !isCopilotLoading && (
                <div className="copilot-reply">
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Modo: <strong>{copilotReply.mode}</strong> · {copilotReply.tokensUsed} tokens · {copilotReply.latencyMs} ms
                  </div>
                  {renderFormattedText(copilotReply.answer)}
                </div>
              )}
            </div>

            <form
              className="copilot-footer"
              onSubmit={e => {
                e.preventDefault();
                handleCopilotAsk();
              }}
            >
              <input
                type="text"
                className="input-clean"
                style={{ fontSize: '0.8rem', padding: '8px 10px' }}
                placeholder="Pregúntale al Copiloto desde aquí…"
                value={copilotInput}
                onChange={e => setCopilotInput(e.target.value)}
              />
              <button type="submit" className="btn-solid" disabled={isCopilotLoading}>
                Enviar
              </button>
            </form>
          </div>
        );
      })()}

      <button
        type="button"
        className="copilot-fab"
        onClick={() => setCopilotOpen(prev => !prev)}
      >
        <span>{copilotOpen ? 'Cerrar Copiloto IA' : 'Copiloto IA'}</span>
      </button>
    </div>
  );
}
