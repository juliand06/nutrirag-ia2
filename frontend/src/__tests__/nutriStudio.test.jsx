import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '../i18n';
import { formatWeight, formatHeight } from '../i18n';
import { Button, Card, Chip, Toast, Skeleton } from '../design-system';
import HealthDisclaimer from '../components/HealthDisclaimer';
import LandingPage from '../components/LandingPage';
import { registerNewUser, authenticateUser, loadUsers } from '../services/userStorage';
import { searchFoodDatabase, scaleFoodPortion, generateDailyMenuFromDatabase } from '../services/foodDatabase';
import { evaluateNutritionGuardrail } from '../services/nutriRagEngine';
import { parseNutritionCsvImport } from '../services/openFoodFactsService';
import { computeGamificationState, computeWellnessCorrelations } from '../services/retentionEngine';
import { evaluateClinicalSafety } from '../services/clinicalSafetyGuard';
import { runRagEvaluationBenchmark } from '../services/ragEvaluationDataset';

describe('NutriStudio AI — Fases 1-4 Suite Completa', () => {
  beforeEach(() => {
    localStorage.clear();
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

  it('renderiza LandingPage de conversión con demo, testimonios, precios, FAQ y aviso sanitario', () => {
    render(<HealthDisclaimer />);
    expect(
      screen.getByText(/Orientación informativa; no reemplaza a un profesional/i)
    ).toBeInTheDocument();

    render(<LandingPage onOpenLogin={() => {}} onOpenRegister={() => {}} />);
    expect(screen.getByText(/Nutre tu cuerpo con/i)).toBeInTheDocument();
    expect(screen.getByText(/^Plan Free$/i)).toBeInTheDocument();
    expect(screen.getByText(/Plan Pro Clínico/i)).toBeInTheDocument();
    expect(screen.getByText(/Preguntas frecuentes/i)).toBeInTheDocument();
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
});
