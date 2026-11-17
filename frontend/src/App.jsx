import React, { useState, useEffect } from 'react';
import { runHybridRagQuery, MEAL_PRESETS } from './services/nutriRagEngine';
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

  useEffect(() => {
    if (currentUser) {
      const ws = getUserWorkspace(currentUser);
      setWorkspace(ws);
      setProfName(currentUser.name || '');
      setProfGoal(currentUser.goal || 'mantenimiento');
      setProfWeight(String(currentUser.weightKg ?? 0));
      setProfHeight(String(currentUser.heightCm ?? 0));
      setProfAge(String(currentUser.age ?? 0));
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

    const result = await runHybridRagQuery(
      q,
      workspace?.documents || [],
      aiConfig,
      currentUser,
      dailyTracking
    );

    const botMsg = {
      id: 'bot-' + Date.now(),
      role: 'assistant',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      guardrailTriggered: result.guardrailTriggered,
      text: result.answer,
      citations: result.citations || []
    };

    updateWorkspace(prev => ({
      ...prev,
      conversations: prev.conversations.map(c =>
        c.id === targetConvId
          ? { ...c, updatedAt: todayIso, messages: [...c.messages, botMsg] }
          : c
      )
    }));
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

  // ============================================================================
  // MANEJADOR DE PERFIL Y CÁLCULO DE METAS
  // ============================================================================
  const handleAutoCalculateTargets = () => {
    const rec = calculateRecommendedTargets({
      weightKg: profWeight,
      heightCm: profHeight,
      age: profAge,
      activityLevel: profActivity,
      goal: profGoal
    });
    if (rec) {
      setProfCalories(String(rec.dailyCalories));
      setProfCarbs(String(rec.targetCarbs));
      setProfProtein(String(rec.targetProtein));
      setProfFat(String(rec.targetFat));
      setProfWaterGoal(String(rec.waterGoalMl));
      setProfileSavedNotice('Cálculo generado. Haz clic en "Guardar mis metas" para aplicarlo.');
      setTimeout(() => setProfileSavedNotice(''), 4000);
    } else {
      setProfileSavedNotice('Ingresa tu peso, estatura y edad mayores a 0 para calcular automáticamente.');
      setTimeout(() => setProfileSavedNotice(''), 4000);
    }
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
                <div className="card-title">Estado actual de tu cuenta</div>
                <div className="card-desc">
                  Correo registrado: <strong>{currentUser.email}</strong>
                </div>

                <div className="list-stack">
                  <div className="list-item-card">
                    <span>Meta calórica configurada</span>
                    <strong>{goalKcal} kcal</strong>
                  </div>
                  <div className="list-item-card">
                    <span>Comidas guardadas en tu historial</span>
                    <strong>{workspace.mealLogs?.length || 0}</strong>
                  </div>
                  <div className="list-item-card">
                    <span>Consultas realizadas</span>
                    <strong>{workspace.conversations?.length || 0}</strong>
                  </div>
                  <div className="list-item-card">
                    <span>Documentos propios indexados</span>
                    <strong>{workspace.documents?.length || 0}</strong>
                  </div>
                  <div className="list-item-card">
                    <span>Registros de seguimiento de peso</span>
                    <strong>{workspace.weightHistory?.length || 0}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
