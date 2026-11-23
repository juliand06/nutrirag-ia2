import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNutriStore } from '../../store/useNutriStore';
import { GLOBAL_FOOD_DATABASE, scaleFoodPortion } from '../../lib/foodDatabase';
import { MEAL_PRESETS } from '../../lib/nutriRagEngine';

export default function QuickAddModal() {
  const navigate = useNavigate();
  const quickAddOpen = useNutriStore(s => s.quickAddOpen);
  const setQuickAddOpen = useNutriStore(s => s.setQuickAddOpen);
  const addMealEntry = useNutriStore(s => s.addMealEntry);
  const workspace = useNutriStore(s => s.workspace);
  const setWaterGlassesForDate = useNutriStore(s => s.setWaterGlassesForDate);
  const showToast = useNutriStore(s => s.showToast);

  const [tab, setTab] = useState('meal'); // 'meal' | 'photo' | 'water'
  const [mealType, setMealType] = useState('Almuerzo');
  const [selectedFoodId, setSelectedFoodId] = useState('fd-pollo');
  const [grams, setGrams] = useState(150);

  if (!quickAddOpen) return null;

  const today = new Date().toISOString().slice(0, 10);
  const currentGlasses = Number(workspace?.waterGlassesByDate?.[today] || 0);

  const handleQuickAddFood = (e) => {
    e.preventDefault();
    const food = GLOBAL_FOOD_DATABASE.find(f => f.id === selectedFoodId) || GLOBAL_FOOD_DATABASE[0];
    const scaled = scaleFoodPortion(food, grams);
    addMealEntry({
      date: today,
      mealType,
      dishName: food.name.split('(')[0].trim(),
      grams: scaled.grams,
      kcal: scaled.kcal,
      carbs: scaled.carbs,
      protein: scaled.protein,
      fat: scaled.fat,
      fiber: scaled.fiber,
      foodId: food.id,
      image:
        mealType === 'Desayuno'
          ? '/img/plato-desayuno.webp'
          : mealType === 'Cena'
            ? '/img/plato-cena.webp'
            : mealType === 'Merienda'
              ? '/img/plato-merienda.webp'
              : '/img/plato-almuerzo.webp'
    });
    setQuickAddOpen(false);
  };

  const handlePhotoPreset = (preset) => {
    addMealEntry({
      date: today,
      mealType,
      dishName: preset.analysis.dishName,
      grams: 320,
      kcal: preset.analysis.totalCalories,
      carbs: preset.analysis.carbsGrams,
      protein: preset.analysis.proteinGrams,
      fat: preset.analysis.fatGrams,
      fiber: preset.analysis.fiberGrams,
      image: '/img/plato-almuerzo.webp'
    });
    setQuickAddOpen(false);
  };

  const handleAddWater = () => {
    const next = currentGlasses + 1;
    setWaterGlassesForDate(today, next);
    showToast(`¡Sumaste un vaso de agua! Llevas ${next} vasos hoy.`, 'emerald');
    setQuickAddOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Registro rápido"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        backgroundColor: 'rgba(20, 25, 21, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '18px'
      }}
      onClick={() => setQuickAddOpen(false)}
    >
      <div
        className="ns-card ns-card-organic"
        style={{ maxWidth: '520px', width: '100%', padding: '26px' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.45rem', margin: 0 }}>Registrar en mi día</h2>
          <button
            type="button"
            onClick={() => setQuickAddOpen(false)}
            className="ns-btn ns-btn-ghost ns-btn-sm"
            aria-label="Cerrar ventana"
          >
            ✕
          </button>
        </div>

        {/* Pestañas de acción rápida */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
          <button
            type="button"
            onClick={() => setTab('meal')}
            className={`ns-chip ${tab === 'meal' ? 'ns-chip-active' : ''}`}
          >
            Registrar comida
          </button>
          <button
            type="button"
            onClick={() => setTab('photo')}
            className={`ns-chip ${tab === 'photo' ? 'ns-chip-active' : ''}`}
          >
            Foto del plato
          </button>
          <button
            type="button"
            onClick={() => {
              setQuickAddOpen(false);
              navigate('/app/alimentos?scanner=1');
            }}
            className="ns-chip"
          >
            Escanear código
          </button>
          <button
            type="button"
            onClick={handleAddWater}
            className="ns-chip"
          >
            +1 Vaso de agua (250 ml)
          </button>
        </div>

        {tab === 'meal' && (
          <form onSubmit={handleQuickAddFood} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label htmlFor="qa-mealtype" style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>
                Tiempo de comida
              </label>
              <select
                id="qa-mealtype"
                className="ns-input"
                value={mealType}
                onChange={e => setMealType(e.target.value)}
              >
                <option value="Desayuno">Desayuno</option>
                <option value="Almuerzo">Almuerzo</option>
                <option value="Merienda">Merienda / Algo</option>
                <option value="Cena">Cena</option>
              </select>
            </div>

            <div>
              <label htmlFor="qa-food" style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>
                Alimento o preparación
              </label>
              <select
                id="qa-food"
                className="ns-input"
                value={selectedFoodId}
                onChange={e => {
                  setSelectedFoodId(e.target.value);
                  const f = GLOBAL_FOOD_DATABASE.find(it => it.id === e.target.value);
                  if (f) setGrams(f.defaultGrams || 120);
                }}
              >
                {GLOBAL_FOOD_DATABASE.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name} — {f.kcal} kcal / 100g
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="qa-grams" style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>
                Porción en gramos (g)
              </label>
              <input
                id="qa-grams"
                type="number"
                min="10"
                max="1200"
                step="10"
                className="ns-input"
                value={grams}
                onChange={e => setGrams(e.target.value)}
              />
            </div>

            <button type="submit" className="ns-btn ns-btn-leaf ns-btn-md">
              Guardar en mi diario
            </button>
          </form>
        )}

        {tab === 'photo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
              Selecciona una fotografía de tu plato o prueba con uno de nuestros platos caseros analizados por visión:
            </p>
            {MEAL_PRESETS.filter(p => p.analysis.isFoodValid).map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePhotoPreset(preset)}
                className="ns-card"
                style={{
                  textAlign: 'left',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{preset.title}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{preset.badge}</div>
                </div>
                <span style={{ color: 'var(--brand-leaf)', fontWeight: 700 }}>+ Agregar</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
