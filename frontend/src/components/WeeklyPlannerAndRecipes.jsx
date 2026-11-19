import React, { useState } from 'react';
import {
  DIET_PRESETS,
  GLOBAL_FOOD_DATABASE,
  generateDailyMenuFromDatabase,
  scaleFoodPortion
} from '../services/foodDatabase';
import { buildSmartShoppingList } from '../services/aiWorkflowEngine';
import HealthDisclaimer from './HealthDisclaimer';

const ALLERGY_EXCLUSIONS = [
  { id: 'sin_lactosa', label: 'Sin lácteos', excludeWords: ['yogur', 'queso', 'cottage', 'leche'] },
  { id: 'sin_gluten', label: 'Sin gluten', excludeWords: ['pan', 'avena', 'pasta'] },
  { id: 'sin_pescado', label: 'Sin pescado/mariscos', excludeWords: ['salmón', 'trucha', 'jurel', 'sardina', 'atún'] },
  { id: 'sin_frutos_secos', label: 'Sin frutos secos/maní', excludeWords: ['nueces', 'almendra', 'maní'] }
];

function generateFridgeRecipes(ingredientsInput, servings = 2) {
  const tokens = String(ingredientsInput || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[,;\n]+/)
    .map(t => t.trim())
    .filter(t => t.length >= 2);

  const matchedFoods =
    tokens.length > 0
      ? GLOBAL_FOOD_DATABASE.filter(f => {
          const n = f.name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
          return tokens.some(tok => n.includes(tok));
        })
      : GLOBAL_FOOD_DATABASE.filter(f =>
          ['fd-pollo', 'fd-aguacate', 'fd-quinua', 'fd-brocoli'].includes(f.id)
        );

  const baseList =
    matchedFoods.length >= 2
      ? matchedFoods.slice(0, 4)
      : [
          ...matchedFoods,
          ...GLOBAL_FOOD_DATABASE.filter(f =>
            ['fd-huevo', 'fd-aguacate', 'fd-ensalada-mixta', 'fd-arroz-integral'].includes(f.id)
          )
        ].slice(0, 4);

  const perServingItems = baseList.map(food => ({
    food,
    ...scaleFoodPortion(food, food.defaultGrams || 100)
  }));

  const perServing = perServingItems.reduce(
    (acc, it) => ({
      kcal: acc.kcal + it.kcal,
      protein: acc.protein + it.protein,
      carbs: acc.carbs + it.carbs,
      fat: acc.fat + it.fat,
      fiber: acc.fiber + it.fiber
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  const s = Math.max(1, Number(servings) || 1);
  return {
    title: `Bowl Casero Balanceado de ${baseList.slice(0, 2).map(f => f.name.split('(')[0].trim()).join(' y ')}`,
    prepMinutes: 18,
    servings: s,
    perServing,
    scaledIngredients: perServingItems.map(it => ({
      name: it.food.name.split('(')[0].trim(),
      gramsTotal: it.grams * s,
      gramsPerServing: it.grams
    })),
    steps: [
      `Lava y prepara ${perServingItems.map(i => `${i.grams * s}g de ${i.food.name.split('(')[0].trim()}`).join(', ')}.`,
      'Cocina la fuente proteica a la plancha o al vapor con especias naturales y muy poca sal (6–8 min).',
      'Acompaña con los carbohidratos complejos y vegetales frescos; añade las grasas saludables al final en frío.',
      `Sirve en ${s} porción(es) equilibrada(s). Ideal consumir primero los vegetales fibrosos para mejor control glucémico.`
    ]
  };
}

export default function WeeklyPlannerAndRecipes({
  goalKcal,
  countryId,
  countryName,
  budgetId,
  onAddMealToDay
}) {
  const [subMode, setSubMode] = useState('planner'); // 'planner' | 'fridge'
  const [dietStyle, setDietStyle] = useState('equilibrada');
  const [maxCookMinutes, setMaxCookMinutes] = useState('30');
  const [activeAllergies, setActiveAllergies] = useState([]);
  const [menu, setMenu] = useState(() =>
    generateDailyMenuFromDatabase({
      targetCalories: goalKcal || 2000,
      dietStyle: 'equilibrada',
      countryId: countryId || 'CO'
    })
  );
  const [checkedShoppingIds, setCheckedShoppingIds] = useState([]);
  const [showShopping, setShowShopping] = useState(false);

  // Recetas desde "lo que tengo en la nevera"
  const [fridgeInput, setFridgeInput] = useState('pollo, aguacate, arroz, brócoli');
  const [servings, setServings] = useState(2);
  const [recipe, setRecipe] = useState(() =>
    generateFridgeRecipes('pollo, aguacate, arroz, brócoli', 2)
  );
  const [notice, setNotice] = useState('');

  const rebuildMenu = (nextDiet = dietStyle) => {
    const generated = generateDailyMenuFromDatabase({
      targetCalories: goalKcal || 2000,
      dietStyle: nextDiet,
      countryId: countryId || 'CO'
    });
    // Filtrar exclusiones por alergias si aplica
    if (activeAllergies.length > 0) {
      const banned = ALLERGY_EXCLUSIONS.filter(a => activeAllergies.includes(a.id)).flatMap(
        a => a.excludeWords
      );
      generated.meals = generated.meals.map(m => {
        const safeItems = m.items.filter(
          it => !banned.some(w => it.food.name.toLowerCase().includes(w))
        );
        if (safeItems.length === m.items.length || safeItems.length === 0) return m;
        return {
          ...m,
          items: safeItems,
          dishName: safeItems.map(i => `${i.food.name.split('(')[0].trim()} (${i.grams}g)`).join(' + ')
        };
      });
    }
    setMenu(generated);
  };

  const regenerateSingleMeal = (mealIndex) => {
    const altStyles = DIET_PRESETS.map(d => d.id).filter(id => id !== dietStyle);
    const randomStyle = altStyles[Math.floor(Math.random() * altStyles.length)] || 'alta_proteina';
    const altMenu = generateDailyMenuFromDatabase({
      targetCalories: goalKcal || 2000,
      dietStyle: randomStyle,
      countryId: countryId || 'CO'
    });
    const replacement = altMenu.meals[mealIndex];
    if (!replacement) return;
    setMenu(prev => {
      const nextMeals = prev.meals.map((m, i) => (i === mealIndex ? replacement : m));
      return { ...prev, meals: nextMeals };
    });
    setNotice(`Se regeneró "${replacement.mealType}" con una nueva alternativa saludable.`);
    setTimeout(() => setNotice(''), 3000);
  };

  const handleExportShoppingTxt = (shop) => {
    const lines = [
      `LISTA DE COMPRAS SEMANAL (7 DÍAS) — NutriStudio AI (${shop.countryName})`,
      `Presupuesto: ${shop.budgetId} · Tiempo máx. cocina: ${maxCookMinutes} min`,
      ''
    ];
    shop.aisles.forEach(g => {
      lines.push(`[${g.aisle.toUpperCase()}]`);
      g.items.forEach(it => {
        const mark = checkedShoppingIds.includes(it.id) ? '[x]' : '[ ]';
        lines.push(`  ${mark} ${it.name} — ${it.qtyLabel}`);
      });
      lines.push('');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lista-mercado-${shop.countryName.toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shop = buildSmartShoppingList(menu, countryName, budgetId);

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
        <div>
          <span className="tag-pill">Planificador y Recetas · {countryName}</span>
          <div className="card-title" style={{ marginTop: '6px' }}>
            Menú Semanal con Restricciones y Recetas desde tu Nevera
          </div>
        </div>
        <div className="subtab-bar" style={{ marginBottom: 0 }}>
          <button
            type="button"
            className={`subtab-btn ${subMode === 'planner' ? 'active' : ''}`}
            onClick={() => setSubMode('planner')}
          >
            📅 Planificador Semanal
          </button>
          <button
            type="button"
            className={`subtab-btn ${subMode === 'fridge' ? 'active' : ''}`}
            onClick={() => setSubMode('fridge')}
          >
            🍳 Lo que tengo en la nevera
          </button>
        </div>
      </div>

      {notice && (
        <div style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, marginBottom: '10px' }}>
          {notice}
        </div>
      )}

      {subMode === 'planner' ? (
        <div>
          <div className="form-stack" style={{ marginBottom: '14px' }}>
            <div className="field-row">
              <div className="field-group">
                <label className="field-label">Estilo de alimentación</label>
                <select
                  className="input-clean"
                  value={dietStyle}
                  onChange={e => {
                    setDietStyle(e.target.value);
                    rebuildMenu(e.target.value);
                  }}
                >
                  {DIET_PRESETS.map(dp => (
                    <option key={dp.id} value={dp.id}>
                      {dp.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label className="field-label">Tiempo máximo de cocina</label>
                <select
                  className="input-clean"
                  value={maxCookMinutes}
                  onChange={e => setMaxCookMinutes(e.target.value)}
                >
                  <option value="15">Rápido (≤ 15 min)</option>
                  <option value="30">Equilibrado (≤ 30 min)</option>
                  <option value="60">Elaborado (≤ 60 min)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Restricciones / alergias:</span>
              {ALLERGY_EXCLUSIONS.map(al => {
                const active = activeAllergies.includes(al.id);
                return (
                  <button
                    key={al.id}
                    type="button"
                    className="copilot-chip"
                    style={
                      active
                        ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                        : undefined
                    }
                    onClick={() => {
                      const next = active
                        ? activeAllergies.filter(i => i !== al.id)
                        : [...activeAllergies, al.id];
                      setActiveAllergies(next);
                    }}
                  >
                    {active ? '✓ ' : '+ '}
                    {al.label}
                  </button>
                );
              })}
              <button type="button" className="btn-solid" style={{ padding: '6px 12px', fontSize: '0.76rem' }} onClick={() => rebuildMenu()}>
                Aplicar filtros
              </button>
              <button
                type="button"
                className="btn-outline"
                style={{ padding: '6px 12px', fontSize: '0.76rem' }}
                onClick={() => setShowShopping(prev => !prev)}
              >
                {showShopping ? 'Ocultar lista' : '🛒 Lista de compras (7 días)'}
              </button>
            </div>
          </div>

          <div className="split-grid">
            {menu.meals.map((m, idx) => (
              <div key={`${m.mealType}-${idx}`} className="list-item-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                  <span className={`nutri-badge nutri-grade-${m.nutriGrade}`}>
                    {m.mealType} · Nutri-Score {m.nutriGrade}
                  </span>
                  <strong>{m.kcal} kcal</strong>
                </div>
                <div style={{ fontSize: '0.84rem', fontWeight: 500 }}>{m.dishName}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  P: {m.protein}g · C: {m.carbs}g · G: {m.fat}g · Fibra: {m.fiber}g · ⏱ ≤{maxCookMinutes} min
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-solid"
                    style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                    onClick={() => {
                      onAddMealToDay(m);
                      setNotice(`"${m.mealType}" agregado a tu diario de hoy.`);
                      setTimeout(() => setNotice(''), 3000);
                    }}
                  >
                    + Agregar a hoy
                  </button>
                  <button
                    type="button"
                    className="btn-outline"
                    style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                    onClick={() => regenerateSingleMeal(idx)}
                  >
                    🔄 Cambiar esta comida
                  </button>
                </div>
              </div>
            ))}
          </div>

          {showShopping && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                <strong style={{ fontSize: '0.86rem' }}>
                  Lista de Compras por Pasillo — 7 días ({countryName})
                </strong>
                <button
                  type="button"
                  className="btn-outline"
                  style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                  onClick={() => handleExportShoppingTxt(shop)}
                >
                  ⬇️ Exportar lista (.txt)
                </button>
              </div>
              <div className="split-grid">
                {shop.aisles.map(group => (
                  <div key={group.aisle} className="list-item-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
                    <strong style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>{group.aisle}</strong>
                    {group.items.map(it => {
                      const done = checkedShoppingIds.includes(it.id);
                      return (
                        <label key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.77rem', cursor: 'pointer', textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.6 : 1 }}>
                          <span>
                            <input
                              type="checkbox"
                              checked={done}
                              onChange={() =>
                                setCheckedShoppingIds(prev =>
                                  prev.includes(it.id) ? prev.filter(id => id !== it.id) : [...prev, it.id]
                                )
                              }
                              style={{ marginRight: '6px' }}
                            />
                            {it.name}
                          </span>
                          <strong>{it.qtyLabel}</strong>
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="split-grid">
          <div className="form-stack">
            <div className="field-group">
              <label className="field-label">¿Qué ingredientes tienes en tu nevera?</label>
              <textarea
                rows={3}
                className="input-clean"
                placeholder="Ej. pollo, huevo, aguacate, lentejas, arroz, espinaca..."
                value={fridgeInput}
                onChange={e => setFridgeInput(e.target.value)}
              />
            </div>
            <div className="field-row">
              <div className="field-group">
                <label className="field-label">Porciones (escalado automático)</label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  className="input-clean"
                  value={servings}
                  onChange={e => {
                    const nextS = Math.max(1, Math.min(8, Number(e.target.value) || 1));
                    setServings(nextS);
                    setRecipe(generateFridgeRecipes(fridgeInput, nextS));
                  }}
                />
              </div>
              <div className="field-group" style={{ justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-solid"
                  onClick={() => setRecipe(generateFridgeRecipes(fridgeInput, servings))}
                >
                  Generar receta saludable
                </button>
              </div>
            </div>
          </div>

          <div className="list-item-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <strong style={{ fontSize: '0.9rem' }}>{recipe.title}</strong>
              <span className="tag-pill">⏱ {recipe.prepMinutes} min · {recipe.servings} porc.</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600 }}>
              Por porción: {recipe.perServing.kcal} kcal · P: {recipe.perServing.protein}g · C: {recipe.perServing.carbs}g · G: {recipe.perServing.fat}g · Fibra: {recipe.perServing.fiber}g
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
              <strong>Ingredientes ({recipe.servings} porc.):</strong>{' '}
              {recipe.scaledIngredients.map(i => `${i.name} (${i.gramsTotal}g)`).join(', ')}.
            </div>
            <ol style={{ paddingLeft: '18px', fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {recipe.steps.map((st, i) => (
                <li key={i}>{st}</li>
              ))}
            </ol>
            <button
              type="button"
              className="btn-solid"
              style={{ alignSelf: 'flex-start', padding: '7px 12px', fontSize: '0.76rem' }}
              onClick={() => {
                onAddMealToDay({
                  mealType: 'Almuerzo',
                  dishName: `${recipe.title} (1 porción)`,
                  kcal: recipe.perServing.kcal,
                  carbs: recipe.perServing.carbs,
                  protein: recipe.perServing.protein,
                  fat: recipe.perServing.fat,
                  fiber: recipe.perServing.fiber,
                  sodiumMg: 180,
                  potassiumMg: 520,
                  vitaminCMg: 25,
                  avgQuality: 93,
                  nutriGrade: 'A'
                });
                setNotice('1 porción de tu receta fue agregada a tu diario de hoy.');
                setTimeout(() => setNotice(''), 3000);
              }}
            >
              + Agregar 1 porción a mi diario
            </button>
          </div>
        </div>
      )}

      <HealthDisclaimer compact />
    </div>
  );
}
