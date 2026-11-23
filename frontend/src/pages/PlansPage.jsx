import React, { useState } from 'react';
import { useNutriStore } from '../store/useNutriStore';
import {
  generateWeeklyPlan,
  regenerateMealInDay,
  buildGroceryListFromWeeklyPlan,
  explainWeeklyPlanClinicalRationale
} from '../lib/mealPlanner';

export default function PlansPage() {
  const currentUser = useNutriStore(s => s.currentUser);
  const workspace = useNutriStore(s => s.workspace);
  const setWeeklyPlan = useNutriStore(s => s.setWeeklyPlan);
  const toggleGroceryItem = useNutriStore(s => s.toggleGroceryItem);
  const addMealEntry = useNutriStore(s => s.addMealEntry);
  const showToast = useNutriStore(s => s.showToast);

  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

  const weeklyPlan =
    workspace?.weeklyPlan && workspace.weeklyPlan.length === 7
      ? workspace.weeklyPlan
      : generateWeeklyPlan({
          targetCalories: currentUser?.dailyCalories || 1950,
          countryId: currentUser?.country || 'CO',
          userProfile: currentUser
        });

  const activeDay = weeklyPlan[selectedDayIdx] || weeklyPlan[0];
  const grocery = buildGroceryListFromWeeklyPlan(
    weeklyPlan,
    currentUser?.country || 'CO',
    currentUser?.budgetTier || 'equilibrado'
  );
  const checkedIds = workspace?.checkedGroceryIds || [];
  const rationale = explainWeeklyPlanClinicalRationale(currentUser || {});

  const handleRegenerateSingleMeal = (mealType) => {
    const updated = regenerateMealInDay(
      weeklyPlan,
      selectedDayIdx,
      mealType,
      currentUser?.dailyCalories || 1950,
      currentUser
    );
    setWeeklyPlan(updated);
    showToast(`Cambiamos el ${mealType.toLowerCase()} del ${activeDay.dayName} respetando tu perfil.`, 'emerald');
  };

  const handleRegenerateFullWeek = () => {
    const fresh = generateWeeklyPlan({
      targetCalories: currentUser?.dailyCalories || 1950,
      countryId: currentUser?.country || 'CO',
      userProfile: currentUser
    });
    setWeeklyPlan(fresh);
    showToast('Generamos una nueva propuesta para toda la semana filtrada para tu perfil.', 'emerald');
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px'
        }}
      >
        <div>
          <h1 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', marginBottom: '4px' }}>
            Tu menú semanal clínico y lista de compras
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Calibrado automáticamente con tus metas, alergias, alimentos que no te gustan, tiempo de cocina y presupuesto.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRegenerateFullWeek}
          className="ns-btn ns-btn-outline ns-btn-sm"
        >
          Recalibrar semana con mi perfil IA
        </button>
      </div>

      {/* Justificación clínica proactiva de por qué la IA armó este plan */}
      <div className="ns-card ns-card-sage" style={{ padding: '16px 20px', marginBottom: '22px', fontSize: '0.88rem' }}>
        <div style={{ fontWeight: 700, color: 'var(--brand-leaf)', marginBottom: '4px' }}>
          Criterio clínico de tu IA para esta semana ({rationale.protocols.map(p => p.source).join(' · ')})
        </div>
        <div style={{ color: 'var(--text-secondary)' }}>
          {rationale.exclusionsText} {rationale.cookingText}
        </div>
      </div>

      {/* Selector de días Lunes a Domingo */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '22px' }}>
        {weeklyPlan.map((d, idx) => (
          <button
            key={d.dayName}
            type="button"
            onClick={() => setSelectedDayIdx(idx)}
            className={`ns-chip ${selectedDayIdx === idx ? 'ns-chip-active' : ''}`}
            style={{ padding: '9px 16px', fontSize: '0.92rem' }}
          >
            {d.dayName} ({d.dayTotals.kcal} kcal)
          </button>
        ))}
      </div>

      {/* Comidas del día seleccionado con fotos y botón de regenerar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '18px',
          marginBottom: '36px'
        }}
      >
        {activeDay.meals.map(meal => (
          <article
            key={meal.mealType}
            className="ns-card"
            style={{
              padding: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ position: 'relative', height: '155px' }}>
                <img
                  src={meal.image || '/img/plato-almuerzo.webp'}
                  alt={meal.dishName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--brand-leaf)',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    fontSize: '0.78rem',
                    fontWeight: 700
                  }}
                >
                  {meal.mealType} · {meal.kcal} kcal
                </span>
              </div>
              <div style={{ padding: '16px' }}>
                <h2 style={{ fontSize: '1.1rem', marginBottom: '8px', lineHeight: 1.35 }}>
                  {meal.dishName}
                </h2>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {meal.protein}g proteína · {meal.carbs}g carbos · {meal.fat}g grasas
                </div>
              </div>
            </div>

            <div style={{ padding: '0 16px 16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleRegenerateSingleMeal(meal.mealType)}
                className="ns-btn ns-btn-outline ns-btn-sm"
                style={{ flex: 1 }}
              >
                Cambiar plato
              </button>
              <button
                type="button"
                onClick={() =>
                  addMealEntry({
                    mealType: meal.mealType,
                    dishName: meal.dishName,
                    grams: 320,
                    kcal: meal.kcal,
                    carbs: meal.carbs,
                    protein: meal.protein,
                    fat: meal.fat,
                    image: meal.image
                  })
                }
                className="ns-btn ns-btn-leaf ns-btn-sm"
                style={{ flex: 1 }}
              >
                + Al diario
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* Lista de compras semanal agrupada por pasillo con casillas y costo estimado */}
      <section className="ns-card ns-card-organic ns-card-warm" style={{ padding: '26px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '20px'
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>
              Lista de compras de la semana por pasillo
            </h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.93rem' }}>
              Marca lo que ya tienes en la despensa o en la nevera.
            </p>
          </div>
          <div
            className="ns-card"
            style={{ padding: '10px 16px', backgroundColor: 'var(--bg-surface)' }}
          >
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>
              Costo semanal estimado ({currentUser?.country || 'CO'})
            </span>
            <strong style={{ fontSize: '1.25rem', color: 'var(--brand-leaf)' }}>
              {grocery.totalEstimatedFormatted}
            </strong>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(265px, 1fr))',
            gap: '18px'
          }}
        >
          {Object.entries(grocery.aisles).map(([aisleName, items]) => (
            <div key={aisleName} className="ns-card" style={{ padding: '18px' }}>
              <h3 style={{ fontSize: '1.08rem', marginBottom: '12px', color: 'var(--brand-leaf)' }}>
                {aisleName}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {items.map(item => {
                  const checked = checkedIds.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        textDecoration: checked ? 'line-through' : 'none',
                        opacity: checked ? 0.6 : 1
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleGroceryItem(item.id)}
                        />
                        <span>
                          <strong>{item.name}</strong> ({item.displayAmount})
                        </span>
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                        {item.estimatedPriceFormatted}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
