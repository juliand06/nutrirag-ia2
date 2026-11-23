import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useNutriStore } from '../store/useNutriStore';
import {
  FOOD_CATEGORIES,
  GLOBAL_FOOD_DATABASE,
  searchFoodDatabase,
  scaleFoodPortion
} from '../lib/foodDatabase';
import { evaluateFoodPersonalCompatibility } from '../lib/proactiveAiEngine';
import BarcodeScannerPanel from '../components/BarcodeScannerPanel';

const CATEGORY_PHOTOS = {
  Todos: '/img/hero-mesa-latina.webp',
  Proteínas: '/img/plato-almuerzo.webp',
  Carbohidratos: '/img/card-sabores-pais.webp',
  Legumbres: '/img/card-presupuesto.webp',
  'Frutas y Verduras': '/img/hero-frutas-tropicales.webp',
  'Grasas Saludables': '/img/onboarding-comida.webp',
  'Lácteos y Huevos': '/img/plato-desayuno.webp',
  'Procesados (Comparar)': '/img/card-entiende.webp'
};

function explainNovaGroup(nova) {
  if (nova === 1) return 'NOVA 1 — Alimento natural o mínimamente procesado (la mejor opción para todos los días).';
  if (nova === 2) return 'NOVA 2 — Ingrediente culinario (aceites, sal, endulzantes naturales).';
  if (nova === 3) return 'NOVA 3 — Alimento procesado tradicional (como quesos frescos, conservas simples o tofu).';
  return 'NOVA 4 — Ultraprocesado industrial. Conviene reservarlo solo para ocasiones puntuales.';
}

function explainNutriScore(grade) {
  const map = {
    A: 'Nutri-Score A — Excelente densidad nutricional (buena fibra/proteína y bajo en azúcar o sodio).',
    B: 'Nutri-Score B — Muy buen aporte para tus comidas cotidianas.',
    C: 'Nutri-Score C — Equilibrio intermedio; cuida la porción y acompáñalo con verduras.',
    D: 'Nutri-Score D — Alto en calorías, sodio o azúcares; consúmelo con moderación.',
    E: 'Nutri-Score E — Muy denso en azúcares, grasas saturadas o sal.'
  };
  return map[grade] || map.B;
}

export default function FoodsPage() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todos');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'compatible' | 'favorites' | 'recents'
  const [selectedFood, setSelectedFood] = useState(GLOBAL_FOOD_DATABASE[0]);
  const [grams, setGrams] = useState(GLOBAL_FOOD_DATABASE[0].defaultGrams || 120);
  const [mealType, setMealType] = useState('Almuerzo');
  const [showScanner, setShowScanner] = useState(searchParams.get('scanner') === '1');

  const currentUser = useNutriStore(s => s.currentUser);
  const workspace = useNutriStore(s => s.workspace);
  const toggleFavoriteFood = useNutriStore(s => s.toggleFavoriteFood);
  const addMealEntry = useNutriStore(s => s.addMealEntry);

  const favIds = workspace?.favoriteFoodIds || [];
  const recentIds = workspace?.recentFoodIds || [];

  let results = searchFoodDatabase({
    query,
    category,
    countryId: currentUser?.country || 'CO'
  });

  if (filterMode === 'compatible') {
    results = results.filter(f => evaluateFoodPersonalCompatibility(f, currentUser).compatible);
  } else if (filterMode === 'favorites') {
    results = results.filter(f => favIds.includes(f.id));
  } else if (filterMode === 'recents') {
    results = results.filter(f => recentIds.includes(f.id));
  }

  const scaledDetail = selectedFood ? scaleFoodPortion(selectedFood, grams) : null;
  const selectedCompat = selectedFood ? evaluateFoodPersonalCompatibility(selectedFood, currentUser) : null;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '22px'
        }}
      >
        <div>
          <h1 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', marginBottom: '4px' }}>
            Buscador de alimentos con evaluación clínica personal
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Tu IA cruza automáticamente cada alimento contra tus alergias, gustos, tipo de dieta y protocolos clínicos (ADA, DASH, AHA, OMS).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowScanner(v => !v)}
          className="ns-btn ns-btn-carrot ns-btn-md"
        >
          {showScanner ? 'Cerrar escáner de código' : 'Escanear código de barras'}
        </button>
      </div>

      {showScanner && (
        <div style={{ marginBottom: '26px' }}>
          <BarcodeScannerPanel
            onAddScannedMeal={(mealObj) => {
              addMealEntry({
                mealType: mealObj.mealType || 'Merienda',
                dishName: mealObj.dishName,
                grams: 100,
                kcal: mealObj.totalCalories,
                carbs: mealObj.carbsGrams,
                protein: mealObj.proteinGrams,
                fat: mealObj.fatGrams,
                fiber: mealObj.fiberGrams,
                image: '/img/card-entiende.webp'
              });
            }}
          />
        </div>
      )}

      {/* Categorías con fotos reales */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
          gap: '10px',
          marginBottom: '20px'
        }}
      >
        {FOOD_CATEGORIES.map(cat => {
          const active = category === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className="ns-card"
              style={{
                padding: '8px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                borderColor: active ? 'var(--brand-leaf)' : 'var(--border-warm)',
                backgroundColor: active ? 'var(--brand-leaf-soft)' : 'var(--bg-surface)',
                textAlign: 'left'
              }}
            >
              <img
                src={CATEGORY_PHOTOS[cat] || '/img/hero-mesa-latina.webp'}
                alt={cat}
                style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
              />
              <span style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {cat}
              </span>
            </button>
          );
        })}
      </div>

      {/* Buscador con autocompletado y pestañas */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: '22px'
        }}
      >
        <input
          type="search"
          className="ns-input"
          style={{ flex: '1 1 260px' }}
          placeholder="Busca aguacate, huevo, trucha, arepa, lentejas, avena..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Buscar alimento por nombre"
        />

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: `Todos (${GLOBAL_FOOD_DATABASE.length})` },
            { id: 'compatible', label: 'Compatibles con mi perfil IA' },
            { id: 'favorites', label: `Favoritos (${favIds.length})` },
            { id: 'recents', label: `Recientes (${recentIds.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterMode(tab.id)}
              className={`ns-chip ${filterMode === tab.id ? 'ns-chip-active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de resultados + Ficha detallada en lenguaje claro */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '22px',
          alignItems: 'start'
        }}
      >
        {/* Columna de listado */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxHeight: '640px',
            overflowY: 'auto',
            paddingRight: '4px'
          }}
        >
          {results.map(food => {
            const isSelected = selectedFood?.id === food.id;
            const isFav = favIds.includes(food.id);
            const compat = evaluateFoodPersonalCompatibility(food, currentUser);
            return (
              <div
                key={food.id}
                onClick={() => {
                  setSelectedFood(food);
                  setGrams(food.defaultGrams || 100);
                }}
                className="ns-card"
                style={{
                  padding: '14px 16px',
                  cursor: 'pointer',
                  borderColor: isSelected ? 'var(--brand-leaf)' : 'var(--border-warm)',
                  backgroundColor: isSelected ? 'var(--brand-leaf-soft)' : 'var(--bg-surface)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.98rem' }}>{food.name}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {food.kcal} kcal / 100g · {food.protein}g prot · {food.carbs}g carbos · {food.fat}g grasas
                  </div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      marginTop: '4px',
                      color:
                        compat.level === 'optimal'
                          ? 'var(--brand-leaf)'
                          : compat.level === 'caution'
                            ? 'var(--accent-earth)'
                            : 'var(--accent-carrot)'
                    }}
                  >
                    {compat.level === 'optimal' ? '✓ ' : '⚠ '}
                    {compat.badgeText}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <span
                    style={{
                      padding: '3px 9px',
                      borderRadius: '999px',
                      fontWeight: 700,
                      fontSize: '0.76rem',
                      backgroundColor: food.nutriGrade === 'A' ? 'var(--brand-leaf)' : 'var(--accent-carrot)',
                      color: '#FFFFFF'
                    }}
                  >
                    Nutri-Score {food.nutriGrade}
                  </span>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      toggleFavoriteFood(food.id);
                    }}
                    aria-label={`Marcar ${food.name} como favorito`}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '1.15rem',
                      cursor: 'pointer',
                      color: isFav ? 'var(--accent-carrot)' : 'var(--text-muted)'
                    }}
                  >
                    {isFav ? '★' : '☆'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Columna de detalle nutricional claro + Veredicto Clínico Personal IA */}
        {selectedFood && scaledDetail && selectedCompat && (
          <aside className="ns-card ns-card-organic" style={{ position: 'sticky', top: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-earth)' }}>
                  {selectedFood.category} · Índice glucémico {selectedFood.glycemicIndex}
                </span>
                <h2 style={{ fontSize: '1.45rem', margin: '4px 0 0 0' }}>{selectedFood.name}</h2>
              </div>
              <span
                style={{
                  padding: '6px 12px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--brand-leaf)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.86rem'
                }}
              >
                Calidad {selectedFood.qualityScore}/100
              </span>
            </div>

            {/* Veredicto de compatibilidad con los 13 puntos del usuario */}
            <div
              className="ns-card"
              style={{
                padding: '14px',
                marginBottom: '14px',
                backgroundColor:
                  selectedCompat.level === 'optimal'
                    ? 'var(--bg-sage)'
                    : 'var(--accent-carrot-soft)',
                borderColor:
                  selectedCompat.level === 'optimal'
                    ? 'var(--brand-leaf)'
                    : 'var(--accent-carrot)',
                fontSize: '0.88rem'
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: '4px', color: selectedCompat.level === 'optimal' ? 'var(--brand-leaf)' : 'var(--accent-carrot)' }}>
                Evaluación IA para tu perfil: {selectedCompat.badgeText}
              </div>
              {selectedCompat.reasons.length > 0 ? (
                <ul style={{ margin: '4px 0', paddingLeft: '18px', color: 'var(--text-primary)' }}>
                  {selectedCompat.reasons.map(r => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              ) : (
                <div style={{ color: 'var(--text-secondary)' }}>{selectedCompat.clinicalTip}</div>
              )}
            </div>

            <div className="ns-card ns-card-warm" style={{ padding: '14px', marginBottom: '16px', fontSize: '0.88rem' }}>
              <div style={{ marginBottom: '6px' }}>
                <strong>{explainNutriScore(selectedFood.nutriGrade)}</strong>
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>
                {explainNovaGroup(selectedFood.novaGroup)}
              </div>
            </div>

            {/* Calculadora de porción */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'end', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 120px' }}>
                <label htmlFor="detail-grams" style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '4px' }}>
                  Tu porción (gramos)
                </label>
                <input
                  id="detail-grams"
                  type="number"
                  min="10"
                  max="1000"
                  step="10"
                  className="ns-input"
                  value={grams}
                  onChange={e => setGrams(e.target.value)}
                />
              </div>

              <div style={{ flex: '1 1 130px' }}>
                <label htmlFor="detail-meal" style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '4px' }}>
                  Agregar a
                </label>
                <select
                  id="detail-meal"
                  className="ns-input"
                  value={mealType}
                  onChange={e => setMealType(e.target.value)}
                >
                  <option value="Desayuno">Desayuno</option>
                  <option value="Almuerzo">Almuerzo</option>
                  <option value="Merienda">Merienda</option>
                  <option value="Cena">Cena</option>
                </select>
              </div>
            </div>

            {/* Macros escalados */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
                marginBottom: '18px',
                textAlign: 'center'
              }}
            >
              {[
                { label: 'Energía', val: `${scaledDetail.kcal} kcal` },
                { label: 'Proteína', val: `${scaledDetail.protein} g` },
                { label: 'Carbos', val: `${scaledDetail.carbs} g` },
                { label: 'Grasas', val: `${scaledDetail.fat} g` }
              ].map(m => (
                <div key={m.label} className="ns-card ns-card-sage" style={{ padding: '10px 6px' }}>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>{m.label}</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--brand-leaf)' }}>{m.val}</div>
                </div>
              ))}
            </div>

            {/* Micronutrientes explicados en lenguaje claro */}
            <h3 style={{ fontSize: '1.05rem', marginBottom: '8px' }}>
              Micronutrientes en esta porción ({scaledDetail.grams} g)
            </h3>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: '0 0 20px 0',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '0.88rem',
                color: 'var(--text-secondary)'
              }}
            >
              <li>• <strong>Fibra ({scaledDetail.fiber} g):</strong> Ayuda a tu digestión y te mantiene lleno por más horas.</li>
              <li>• <strong>Potasio ({scaledDetail.potassiumMg} mg) y Sodio ({scaledDetail.sodiumMg} mg):</strong> Equilibrio clave para tu presión arterial.</li>
              <li>• <strong>Hierro ({scaledDetail.ironMg} mg):</strong> Importante para evitar el cansancio y oxigenar tu cuerpo.</li>
              <li>• <strong>Vitamina C ({scaledDetail.vitaminCMg} mg):</strong> Mejora tus defensas y ayuda a absorber el hierro vegetal.</li>
            </ul>

            <button
              type="button"
              onClick={() =>
                addMealEntry({
                  mealType,
                  dishName: selectedFood.name.split('(')[0].trim(),
                  grams: scaledDetail.grams,
                  kcal: scaledDetail.kcal,
                  carbs: scaledDetail.carbs,
                  protein: scaledDetail.protein,
                  fat: scaledDetail.fat,
                  fiber: scaledDetail.fiber,
                  foodId: selectedFood.id,
                  image: CATEGORY_PHOTOS[selectedFood.category] || '/img/plato-almuerzo.webp'
                })
              }
              className="ns-btn ns-btn-leaf ns-btn-md"
              style={{ width: '100%' }}
            >
              + Agregar {scaledDetail.grams}g a mi {mealType.toLowerCase()}
            </button>
          </aside>
        )}
      </div>
    </div>
  );
}
