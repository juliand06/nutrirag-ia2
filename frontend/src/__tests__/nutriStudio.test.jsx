import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '../i18n';
import { formatWeight, formatHeight } from '../i18n';
import { Button, Card, Chip, Toast, Skeleton } from '../design-system';
import HealthDisclaimer from '../components/HealthDisclaimer';
import LandingPage from '../pages/LandingPage';
import ProtectedRoute from '../components/layout/ProtectedRoute';
import NutritionistPortalSection from '../components/NutritionistPortalSection';
import BillingPrivacyObservabilitySection from '../components/BillingPrivacyObservabilitySection';
import { buildPersonalizedNutritionSummary } from '../lib/nutritionCalculator';
import {
  generateProactiveDailyRoadmap,
  evaluateFoodPersonalCompatibility,
  getSafeFoodsForUser
} from '../lib/proactiveAiEngine';
import { GLOBAL_FOOD_DATABASE } from '../lib/foodDatabase';
import {
  registerWithOnboarding,
  loginWithEmail,
  evaluatePasswordStrength
} from '../api/authClient';
import { useNutriStore } from '../store/useNutriStore';
import { registerNewUser, authenticateUser, loadUsers } from '../services/userStorage';
import { searchFoodDatabase, scaleFoodPortion, generateDailyMenuFromDatabase } from '../services/foodDatabase';
import { evaluateNutritionGuardrail } from '../services/nutriRagEngine';
import { parseNutritionCsvImport } from '../services/openFoodFactsService';
import { computeGamificationState, computeWellnessCorrelations } from '../services/retentionEngine';
import { evaluateClinicalSafety } from '../services/clinicalSafetyGuard';
import { runRagEvaluationBenchmark } from '../services/ragEvaluationDataset';
import {
  connectSmartOnFhirSandbox,
  buildInitialClinicalRecordForEmail,
  runFederatedClinicalDiscovery
} from '../services/clinicalSyncService';
import {
  loadNutritionistPortalState,
  addNutritionistPatient,
  assignNutritionPlanToPatient,
  addNutritionistClinicalNote,
  sendNutritionistChatMessage,
  buildNutritionistPatientReportHtml,
  checkPlanFeatureAccess,
  startStripeCheckoutSession,
  cancelStripeSubscription,
  encryptSensitiveData,
  decryptSensitiveData,
  updateGranularConsent,
  getAuditLogs,
  buildGdprExportPackage,
  purgeAllUserDataGdpr,
  trackAnonymousProductEvent,
  logStructuredEvent
} from '../services/enterprisePlatformService';

describe('NutriStudio AI — Reconstrucción Editorial + Suite Completa', () => {
  beforeEach(() => {
    localStorage.clear();
    useNutriStore.setState({ currentUser: null, workspace: null });
  });

  it('calcula calorías, macros, agua e IMC en src/lib/nutritionCalculator.js', () => {
    const plan = buildPersonalizedNutritionSummary({
      goal: 'deficit_calorico',
      sex: 'femenino',
      age: 30,
      heightUnit: 'cm',
      heightCm: 165,
      weightUnit: 'kg',
      weightVal: 68,
      targetWeightVal: 62,
      activityLevel: 'moderado',
      country: 'CO'
    });
    expect(plan.dailyCalories).toBeGreaterThanOrEqual(1200);
    expect(plan.targetProtein).toBeGreaterThan(80);
    expect(plan.targetCarbs).toBeGreaterThan(100);
    expect(plan.waterGlasses).toBeGreaterThanOrEqual(7);
    expect(plan.bmi).toBeCloseTo(25.0, 1);
    expect(plan.safetyAdvisoryActive).toBe(false);
  });

  it('genera guía proactiva diaria 360° con los 13 puntos del perfil y excluye alergias/disgustos', () => {
    const profile = {
      name: 'Camila Restrepo',
      goal: 'control_condicion',
      country: 'CO',
      city: 'Medellín',
      dietType: 'sin_lactosa',
      allergies: ['Lactosa / Lácteos'],
      dislikedFoods: 'brócoli, sardinas',
      healthConditions: ['diabetes', 'hipertension'],
      cookingTime: '15_min',
      budgetTier: 'economico',
      dailyCalories: 1850,
      targetProtein: 130,
      targetCarbs: 180,
      targetFat: 60,
      waterGoalMl: 2100
    };

    const roadmap = generateProactiveDailyRoadmap(profile, { mealLogs: [], waterGlassesByDate: {} }, 13);
    expect(roadmap.immediateActions.length).toBeGreaterThanOrEqual(2);
    expect(roadmap.protocols.some(p => p.id === 'resistencia_insulina_diabetes')).toBe(true);
    expect(roadmap.protocols.some(p => p.id === 'hipertension_cardiovascular')).toBe(true);
    expect(roadmap.recommendedMeal.dishName.toLowerCase()).not.toContain('brócoli');
    expect(roadmap.recommendedMeal.dishName.toLowerCase()).not.toContain('queso');

    const queso = GLOBAL_FOOD_DATABASE.find(f => f.id === 'fd-queso-campesino');
    const compatQueso = evaluateFoodPersonalCompatibility(queso, profile);
    expect(compatQueso.compatible).toBe(false);

    const safePool = getSafeFoodsForUser(profile);
    expect(safePool.some(f => f.name.toLowerCase().includes('brócoli'))).toBe(false);
  });

  it('activa reglas de seguridad en el onboarding para menores de 18, embarazo, TCA o <1200 kcal', () => {
    const minorPlan = buildPersonalizedNutritionSummary({
      goal: 'deficit_calorico',
      age: 16,
      heightCm: 160,
      weightVal: 55
    });
    expect(minorPlan.safetyAdvisoryActive).toBe(true);
    expect(minorPlan.safetyMessage).toMatch(/no activamos un plan de pérdida de peso/i);

    const pregnantPlan = buildPersonalizedNutritionSummary({
      goal: 'deficit_calorico',
      age: 29,
      heightCm: 164,
      weightVal: 64,
      healthConditions: ['embarazo_lactancia']
    });
    expect(pregnantPlan.safetyAdvisoryActive).toBe(true);

    const tcaPlan = buildPersonalizedNutritionSummary({
      goal: 'deficit_calorico',
      age: 24,
      heightCm: 162,
      weightVal: 52,
      healthConditions: ['tca']
    });
    expect(tcaPlan.safetyAdvisoryActive).toBe(true);
  });

  it('registra y autentica con authClient sin guardar nunca la contraseña en localStorage', async () => {
    expect(evaluatePasswordStrength('12345').valid).toBe(false);
    expect(evaluatePasswordStrength('ClaveSegura2026!').valid).toBe(true);

    const plan = buildPersonalizedNutritionSummary({
      goal: 'comer_saludable',
      age: 28,
      heightCm: 168,
      weightVal: 66
    });

    const reg = await registerWithOnboarding({
      name: 'Valeria Montoya',
      email: 'valeria@nutristudio.co',
      password: 'ClaveUltraSegura2026!',
      acceptTerms: true,
      onboardingData: { country: 'CO', city: 'Medellín' },
      computedPlan: plan
    });

    expect(reg.user.email).toBe('valeria@nutristudio.co');
    expect(reg.accessToken).toBeTruthy();

    // Verificar que ningún valor en localStorage contenga la contraseña en texto plano
    const allLocalStorageDump = JSON.stringify(localStorage);
    expect(allLocalStorageDump).not.toContain('ClaveUltraSegura2026!');

    const logged = await loginWithEmail('valeria@nutristudio.co', 'ClaveUltraSegura2026!');
    expect(logged.user.name).toBe('Valeria Montoya');
  });

  it('protege las rutas internas con ProtectedRoute (redirige a /login sin sesión)', () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <Routes>
          <Route path="/login" element={<div>Pantalla Login</div>} />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <div>Dashboard Privado</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Pantalla Login')).toBeInTheDocument();

    useNutriStore.setState({
      currentUser: { id: 'u-1', name: 'Camila', dailyCalories: 1900 }
    });

    render(
      <MemoryRouter initialEntries={['/app']}>
        <Routes>
          <Route path="/login" element={<div>Pantalla Login</div>} />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <div>Dashboard Privado</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Dashboard Privado')).toBeInTheDocument();
  });

  it('almacena contraseñas con hash SHA-256 + salt (nunca texto plano)', async () => {
    await registerNewUser({
      name: 'Camila Gómez',
      email: 'camila@test.com',
      password: 'MiPasswordSeguro123',
      country: 'CO',
      age: 26,
      weightKg: 62,
      heightCm: 165
    });

    const rawStored = loadUsers();
    expect(rawStored).toHaveLength(1);
    expect(rawStored[0].password).toBeUndefined();
    expect(rawStored[0].passwordHash).toBeTruthy();
    expect(rawStored[0].passwordSalt).toBeTruthy();
    expect(rawStored[0].passwordHash).not.toContain('MiPasswordSeguro123');

    const logged = await authenticateUser('camila@test.com', 'MiPasswordSeguro123');
    expect(logged.email).toBe('camila@test.com');
  });

  it('busca alimentos priorizando el país y escala porciones con Nutri-Score', () => {
    const results = searchFoodDatabase({ query: 'aguacate', countryId: 'CO' });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].nutriGrade).toBe('A');
    const scaled = scaleFoodPortion(results[0], 50);
    expect(scaled.kcal).toBe(80);
  });

  it('genera menú automático diario calibrado a la meta calórica', () => {
    const menu = generateDailyMenuFromDatabase({
      targetCalories: 2000,
      dietStyle: 'equilibrada',
      countryId: 'CO'
    });
    expect(menu.meals).toHaveLength(4);
    expect(menu.dayTotals.kcal).toBeGreaterThan(1500);
  });

  it('bloquea consultas fuera de dominio con el guardrail nutricional', () => {
    const offTopic = evaluateNutritionGuardrail('¿Quién ganó la Champions de fútbol?');
    expect(offTopic.allowed).toBe(false);
    const valid = evaluateNutritionGuardrail('¿Cuántas calorías y proteínas tiene el pollo?');
    expect(valid.allowed).toBe(true);
  });

  it('renderiza LandingPage editorial con pilares T2DNetwork, Cómo funciona, Coach IA, FAQ y aviso legal', () => {
    render(<HealthDisclaimer />);
    expect(
      screen.getByText(/Orientación informativa; no reemplaza a un profesional/i)
    ).toBeInTheDocument();

    render(
      <MemoryRouter>
        <LandingPage onOpenLogin={() => {}} onOpenRegister={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText(/Come mejor/i)).toBeInTheDocument();
    expect(screen.getByText(/Planifica tus comidas/i)).toBeInTheDocument();
    expect(screen.getByText(/Entiende lo que comes/i)).toBeInTheDocument();
    expect(screen.getByText(/Come bien con tu presupuesto/i)).toBeInTheDocument();
    expect(screen.getByText(/Sabores de tu país/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Preguntas frecuentes/i).length).toBeGreaterThan(0);
  });

  it('importa archivos CSV estilo MyFitnessPal/Google Fit y calcula correlaciones + gamificación', () => {
    const csv = 'Date,Food,Calories,Carbs,Protein,Fat,Steps\n2026-11-19,Pollo con quinua,540,42,44,16,8200';
    const { importedMeals, importedWellness } = parseNutritionCsvImport(csv);
    expect(importedMeals).toHaveLength(1);
    expect(importedMeals[0].totalCalories).toBe(540);
    expect(importedWellness[0].steps).toBe(8200);

    const gami = computeGamificationState({
      workspace: { mealLogs: importedMeals, wellnessLogs: importedWellness },
      aiProgress: { streakDays: 3 },
      waterTodayMl: 1800,
      goalWater: 2000
    });
    expect(gami.xp).toBeGreaterThan(100);

    const corrs = computeWellnessCorrelations({
      wellnessLogs: [{ date: '2026-11-19', sleepHours: 5.5, steps: 8200, digestiveNote: 'Normal' }],
      mealLogs: importedMeals
    });
    expect(corrs.some(c => c.includes('Sueño vs. Apetito'))).toBe(true);
  });

  it('deriva a profesional ante embarazo, diabetes tipo 1, TCA, menores o dietas <1200 kcal', () => {
    expect(evaluateClinicalSafety('Estoy embarazada y quiero déficit calórico').blocked).toBe(true);
    expect(evaluateClinicalSafety('Tengo diabetes tipo 1, ¿cuánta insulina me pongo?').blocked).toBe(true);
    expect(evaluateClinicalSafety('Quiero una dieta de 700 kcal al día').blocked).toBe(true);
    expect(evaluateClinicalSafety('Quiero adelgazar rápido', { age: 15 }).blocked).toBe(true);
    expect(evaluateClinicalSafety('¿Cuánta proteína tiene el salmón?', { age: 28 }).blocked).toBe(false);
  });

  it('evalúa el RAG con dataset de 50 preguntas y cumple umbral de Recall@3 y MRR', () => {
    const bench = runRagEvaluationBenchmark(3);
    expect(bench.totalQuestions).toBe(50);
    expect(bench.recallAtK).toBeGreaterThanOrEqual(0.7);
    expect(bench.mrr).toBeGreaterThanOrEqual(0.6);
  });

  it('convierte unidades métricas/imperiales y renderiza componentes del Design System', () => {
    expect(formatWeight(70, 'metric')).toBe('70 kg');
    expect(formatWeight(70, 'imperial')).toBe('154.3 lb');
    expect(formatHeight(175, 'metric')).toBe('175 cm');
    expect(formatHeight(175, 'imperial')).toBe("5'9\"");

    render(
      <Card warm>
        <Button variant="warm">Acción</Button>
        <Chip active tone="warm">Activo</Chip>
        <Toast message="Guardado" />
        <Skeleton />
      </Card>
    );
    expect(screen.getByText('Acción')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Guardado');
  });

  it('FASE 5 — SMART on FHIR exige consentimiento y nunca inventa datos clínicos ficticios', async () => {
    await expect(
      connectSmartOnFhirSandbox({ email: 'pac@test.com', consentGranted: false })
    ).rejects.toThrow(/consentimiento/i);

    const offline = await connectSmartOnFhirSandbox({
      email: 'pac@test.com',
      patientFhirId: 'example',
      consentGranted: true,
      fetchImpl: async () => {
        throw new Error('Network unreachable');
      }
    });
    expect(offline.connected).toBe(false);
    expect(offline.isRealFhirData).toBe(false);
    expect(offline.clinicalRecord).toBeNull();
    expect(offline.message).toMatch(/nunca se muestran datos ficticios/i);

    const syncDisc = runFederatedClinicalDiscovery({ email: 'pac@test.com', consentGranted: true });
    expect(syncDisc.connected).toBe(false);
    expect(syncDisc.clinicalRecord).toBeNull();
    expect(buildInitialClinicalRecordForEmail({ email: 'pac@test.com' })).toBeNull();

    const blankManual = buildInitialClinicalRecordForEmail({
      email: 'pac@test.com',
      allowManualBlank: true
    });
    expect(blankManual.fastingGlucose).toBeNull();
    expect(blankManual.isRealFhirData).toBe(false);
  });

  it('FASE 5 — Portal de Nutricionistas y Privacidad GDPR/Ley 1581', async () => {
    const user = { id: 'u-nutri', name: 'Carlos Ruiz', email: 'carlos@test.com', dailyCalories: 2100 };
    const initial = loadNutritionistPortalState(user);
    expect(initial.patients[0].fhirConnected).toBe(false);

    const { patient } = addNutritionistPatient(user.id, {
      name: 'Laura Gómez',
      email: 'laura@test.com',
      dailyCalories: 1750
    });
    await assignNutritionPlanToPatient(user.id, patient.id, {
      dailyCalories: 1850,
      targetProtein: 135,
      targetCarbs: 180,
      targetFat: 62,
      clinicalProtocol: 'ADA Bajo Índice Glucémico',
      notes: 'Priorizar orden fibra -> proteína -> carbohidrato.'
    }, user.email);

    addNutritionistClinicalNote(user.id, patient.id, {
      soapSection: 'Objetivo',
      text: 'Adherencia del 88% sin síntomas digestivos.'
    });
    const { state: finalState } = sendNutritionistChatMessage(user.id, patient.id, {
      senderRole: 'NUTRITIONIST',
      text: 'Excelente progreso esta semana.'
    });

    const updatedPat = finalState.patients.find(p => p.id === patient.id);
    const htmlReport = buildNutritionistPatientReportHtml(updatedPat, finalState.nutritionistProfile);
    expect(htmlReport).toContain('Orientación informativa; no reemplaza a un profesional.');

    render(<NutritionistPortalSection currentUser={user} />);
    expect(screen.getByText(/Portal para Nutricionistas Clínicos/i)).toBeInTheDocument();

    const registered = await registerNewUser({
      name: 'Elena Vargas',
      email: 'elena@test.com',
      password: 'PasswordSegura123',
      country: 'CO',
      age: 31,
      weightKg: 60,
      heightCm: 164
    });

    expect(checkPlanFeatureAccess({ userId: registered.id, feature: 'ragQuery', currentDailyCount: 5 }).allowed).toBe(false);
    await startStripeCheckoutSession({ userId: registered.id, email: registered.email, planId: 'PRO' });
    expect(checkPlanFeatureAccess({ userId: registered.id, feature: 'ragQuery', currentDailyCount: 50 }).allowed).toBe(true);

    const encrypted = await encryptSensitiveData('Glucosa reportada: 92 mg/dL', registered.id);
    const decrypted = await decryptSensitiveData(encrypted, registered.id);
    expect(decrypted).toBe('Glucosa reportada: 92 mg/dL');

    await updateGranularConsent(registered.id, 'anonymousProductAnalytics', true, registered.email);
    const trackedEvent = await trackAnonymousProductEvent('meal_logged', { email: registered.email, kcal: 420 }, registered.id);
    expect(trackedEvent.event.properties.email).toBe('[REDACTED_PII]');

    const structured = logStructuredEvent({
      level: 'INFO',
      category: 'TEST',
      message: 'Prueba log',
      context: { email: registered.email, route: '/salud' }
    });
    expect(structured.sanitizedContext.email).toBe('[REDACTED_PII]');

    const gdprPkg = await buildGdprExportPackage({ user: registered, workspace: { mealLogs: [] } });
    expect(gdprPkg.profile.passwordHash).toBeUndefined();
    expect(getAuditLogs(registered.id).length).toBeGreaterThanOrEqual(2);

    render(<BillingPrivacyObservabilitySection currentUser={registered} workspace={{ mealLogs: [] }} />);
    expect(screen.getByText(/Consentimiento Granular, Cifrado AES-256-GCM/i)).toBeInTheDocument();

    await cancelStripeSubscription(registered.id, registered.email);
    await purgeAllUserDataGdpr(registered.id);
  });
});
