import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import HealthDisclaimer from '../components/HealthDisclaimer';
import LandingPage from '../components/LandingPage';
import { registerNewUser, authenticateUser, loadUsers } from '../services/userStorage';
import { searchFoodDatabase, scaleFoodPortion, generateDailyMenuFromDatabase } from '../services/foodDatabase';
import { evaluateNutritionGuardrail } from '../services/nutriRagEngine';

describe('NutriStudio AI — Fase 1 Seguridad, Datos y UI', () => {
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

  it('renderiza HealthDisclaimer y LandingPage con aviso sanitario obligatorio', () => {
    render(<HealthDisclaimer />);
    expect(
      screen.getByText(/Orientación informativa; no reemplaza a un profesional/i)
    ).toBeInTheDocument();

    render(<LandingPage onOpenLogin={() => {}} onOpenRegister={() => {}} />);
    expect(screen.getByText(/Nutre tu cuerpo con/i)).toBeInTheDocument();
  });
});
