import React, { useState } from 'react';
import { useNutriStore } from '../store/useNutriStore';
import { GLOBAL_FOOD_DATABASE, scaleFoodPortion } from '../lib/foodDatabase';
import {
  generateProactiveDailyRoadmap,
  getSafeFoodsForUser,
  analyzeDayClinicalMetrics
} from '../lib/proactiveAiEngine';
import { getLocalTodayIso } from '../lib/nutritionCalculator';
import { HandBowlIllustration } from '../assets/doodles/HandDrawnSvgs';
import MealPhotoAnalyzer from '../components/MealPhotoAnalyzer';

const MEAL_SECTIONS = [
  { id: 'Desayuno', title: 'Desayuno', timeHint: '7:00 – 9:30 am', photo: '/img/plato-desayuno.webp' },
  { id: 'Almuerzo', title: 'Almuerzo', timeHint: '12:30 – 2:30 pm', photo: '/img/plato-almuerzo.webp' },
  { id: 'Merienda', title: 'Merienda / Algo', timeHint: '4:00 – 5:30 pm', photo: '/img/plato-merienda.webp' },
  { id: 'Cena', title: 'Cena', timeHint: '7:30 – 9:00 pm', photo: '/img/plato-cena.webp' }
];

function buildWeekDays(centerDateIso) {
  const base = new Date(`${centerDateIso}T12:00:00`);
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const list = [];
  for (let offset = -4; offset <= 2; offset++) {
    const d = new Date(base);
    d.setDate(base.getDate() + offset);
    const iso = d.toISOString().slice(0, 10);
    list.push({
      iso,
      dayName: dayNames[d.getDay()],
      dayNum: d.getDate()
    });
  }
  return list;
}

function getPreviousDateIso(dateIso) {
  const d = new Date(`${dateIso}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export default function DiaryPage() {
  const todayIso = getLocalTodayIso();
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [addingToMeal, setAddingToMeal] = useState(null);
  const [showPhotoScanner, setShowPhotoScanner] = useState(false);
  const [photoMealType, setPhotoMealType] = useState('Desayuno');

  const currentUser = useNutriStore(s => s.currentUser);
  const workspace = useNutriStore(s => s.workspace);
  const addMealEntry = useNutriStore(s => s.addMealEntry);
  const updateMealPortion = useNutriStore(s => s.updateMealPortion);
  const deleteMealEntry = useNutriStore(s => s.deleteMealEntry);
  const copyMealsFromDate = useNutriStore(s => s.copyMealsFromDate);

  const safeFoods = getSafeFoodsForUser(currentUser || {});
  const [selectedFoodId, setSelectedFoodId] = useState(() => safeFoods[0]?.id || 'fd-avena');
  const [portionGrams, setPortionGrams] = useState(120);

  const roadmap = generateProactiveDailyRoadmap(currentUser || {}, workspace || {});
  const weekDays = buildWeekDays(todayIso);
  const allLogs = workspace?.mealLogs || [];
  const dayLogs = allLogs.filter(m => m.date === selectedDate);
  const clinicalMetrics = analyzeDayClinicalMetrics({ dayLogs, userProfile: currentUser || {} });
  const dayTotals = clinicalMetrics.totals;

  const goalProtein = Number(currentUser?.targetProtein) || 125;
  const remainingProtein = Math.max(0, goalProtein - dayTotals.protein);

  const handleCopyPreviousDay = () => {
    const prevDate = getPreviousDateIso(selectedDate);
    copyMealsFromDate(prevDate, selectedDate);
  };

  const handleAddInline = (e, mealType, photo) => {
    e.preventDefault();
    const food = safeFoods.find(f => f.id === selectedFoodId) || safeFoods[0] || GLOBAL_FOOD_DATABASE[0];
    const scaled = scaleFoodPortion(food, portionGrams);
    addMealEntry({
      date: selectedDate,
      mealType,
      dishName: food.name.split('(')[0].trim(),
      grams: scaled.grams,
      kcal: scaled.kcal,
      carbs: scaled.carbs,
      protein: scaled.protein,
      fat: scaled.fat,
      fiber: scaled.fiber,
      sodiumMg: scaled.sodiumMg,
      potassiumMg: scaled.potassiumMg,
      ironMg: scaled.ironMg,
      calciumMg: scaled.calciumMg,
      vitaminCMg: scaled.vitaminCMg,
      omega3Mg: scaled.omega3Mg,
      glycemicLoad: scaled.glycemicLoad,
      foodId: food.id,
      image: photo
    });
    setAddingToMeal(null);
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
          marginBottom: '22px'
        }}
      >
        <div>
          <h1 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', marginBottom: '4px' }}>
            Tu diario de comidas con evaluación clínica IA
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            A medida que anotas o ajustas gramos, tu IA evalúa el balance glucémico, proteico y de fibra de tu día sin que tengas que consultar.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowPhotoScanner(v => !v)}
            className="ns-btn ns-btn-carrot ns-btn-sm"
          >
            {showPhotoScanner ? 'Cerrar escáner de foto' : '📷 Analizar foto de mi plato (IA)'}
          </button>
          <button
            type="button"
            onClick={handleCopyPreviousDay}
            className="ns-btn ns-btn-outline ns-btn-sm"
          >
            Copiar el día anterior
          </button>
        </div>
      </div>

      {/* Escáner real de fotografías de comida con Visión IA */}
      {showPhotoScanner && (
        <section className="ns-card ns-card-organic" style={{ marginBottom: '22px', padding: '22px' }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '6px' }}>
            Escáner de Fotos de Comida con Visión IA Clínica
          </h2>
          <p style={{ margin: '0 0 14px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Toma una foto o sube una imagen de tu desayuno, almuerzo o cena. La IA estimará ingredientes, gramos, calorías, carga glucémica y micronutrientes, y podrás ajustar los gramos antes de guardar.
          </p>
          <MealPhotoAnalyzer
            mealType={photoMealType}
            onMealTypeChange={setPhotoMealType}
            userProfile={currentUser || {}}
            onSaveMeal={(mealPayload) => {
              addMealEntry({
                date: selectedDate,
                ...mealPayload
              });
              setShowPhotoScanner(false);
            }}
          />
        </section>
      )}

      {/* Calendario semanal interactivo */}
      <div
        className="ns-card"
        style={{
          padding: '14px 18px',
          marginBottom: '22px',
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(42px, 1fr))',
          gap: '8px'
        }}
      >
        {weekDays.map(d => {
          const isSelected = d.iso === selectedDate;
          const kcalForDay = allLogs
            .filter(m => m.date === d.iso)
            .reduce((sum, m) => sum + (Number(m.kcal) || 0), 0);

          return (
            <button
              key={d.iso}
              type="button"
              onClick={() => setSelectedDate(d.iso)}
              style={{
                padding: '10px 6px',
                borderRadius: '14px',
                border: '1.5px solid',
                borderColor: isSelected ? 'var(--brand-leaf)' : 'var(--border-warm)',
                backgroundColor: isSelected ? 'var(--brand-leaf)' : 'var(--bg-surface)',
                color: isSelected ? '#FFFFFF' : 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              <span style={{ fontSize: '0.76rem', opacity: 0.85 }}>{d.dayName}</span>
              <span style={{ fontSize: '1.05rem', fontWeight: 700 }}>{d.dayNum}</span>
              <span style={{ fontSize: '0.7rem', opacity: 0.9 }}>
                {kcalForDay > 0 ? `${kcalForDay} kcal` : '—'}
              </span>
            </button>
          );
        })}
      </div>

      {/* EVALUADOR CLÍNICO IA EN VIVO DEL DÍA (PROACTIVO) */}
      <div
        className="ns-card ns-card-sage"
        style={{
          marginBottom: '24px',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--brand-leaf)', textTransform: 'uppercase' }}>
              Diagnóstico IA en vivo ({selectedDate === todayIso ? 'Hoy' : selectedDate}) · {roadmap.protocols[0]?.source}
            </span>
            <h2 style={{ fontSize: '1.18rem', margin: '2px 0 0 0' }}>
              Total: {dayTotals.kcal} / {currentUser?.dailyCalories || 1950} kcal
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span className="ns-chip">Proteína: {dayTotals.protein}g / {goalProtein}g</span>
            <span className="ns-chip">Carbos: {dayTotals.carbs}g</span>
            <span className="ns-chip">Grasas: {dayTotals.fat}g</span>
            <span className="ns-chip">Fibra: {dayTotals.fiber}g / {clinicalMetrics.targets.fiberGrams}g</span>
          </div>
        </div>

        {/* Biomarcadores clínicos detallados en acordeón limpio (cero ruido visual) */}
        <details style={{ paddingTop: '4px' }}>
          <summary style={{ cursor: 'pointer', fontSize: '0.84rem', fontWeight: 700, color: 'var(--brand-leaf)' }}>
            Ver biomarcadores clínicos de hoy (Carga Glucémica, Sodio/Potasio, Hierro, Omega-3)
          </summary>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
            <span className="ns-chip" style={{ fontSize: '0.78rem' }}>
              Carga Glucémica (ADA): {dayTotals.glycemicLoad} ({clinicalMetrics.glycemicLoadLevel})
            </span>
            <span className="ns-chip" style={{ fontSize: '0.78rem' }}>
              Sodio / Potasio (DASH):{' '}
              {dayTotals.sodiumMg !== null ? `${dayTotals.sodiumMg}mg Na` : 'Sin datos verificados de Na'} /{' '}
              {dayTotals.potassiumMg !== null ? `${dayTotals.potassiumMg}mg K` : 'Sin datos de K'}
              {clinicalMetrics.naKRatio !== null ? ` (Razón ${clinicalMetrics.naKRatio})` : ''} · Cobertura {clinicalMetrics.coverage?.sodiumPct || 0}%
            </span>
            <span className="ns-chip" style={{ fontSize: '0.78rem' }}>
              Hierro + Vit. C (OMS):{' '}
              {dayTotals.ironMg !== null ? `${dayTotals.ironMg}mg Fe` : 'Sin datos de Fe'} +{' '}
              {dayTotals.vitaminCMg !== null ? `${dayTotals.vitaminCMg}mg Vit.C` : 'Sin datos de Vit.C'}
            </span>
            <span className="ns-chip" style={{ fontSize: '0.78rem' }}>
              Omega-3 (AHA): {dayTotals.omega3Mg !== null ? `${dayTotals.omega3Mg}mg` : 'Sin datos verificados'}
            </span>
            <span className="ns-chip" style={{ fontSize: '0.78rem' }}>
              Pulsos proteicos ≥24g (ISSN): {clinicalMetrics.anabolicMealsCount} tomas
            </span>
          </div>
        </details>

        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {dayLogs.length === 0
            ? `Aún no tienes registros en esta fecha. Tu IA recomienda empezar tu ${roadmap.nextMealType.toLowerCase()} con "${roadmap.recommendedMeal.dishName}" (${roadmap.recommendedMeal.kcal} kcal, ${roadmap.recommendedMeal.protein}g proteína) siguiendo el protocolo ${roadmap.protocols[0]?.label}.`
            : clinicalMetrics.clinicalFindings.length > 0
              ? clinicalMetrics.clinicalFindings.join(' · ')
              : remainingProtein > 25
                ? `Análisis clínico de tus ${dayLogs.length} registros: llevas ${dayTotals.protein}g de proteína y ${dayTotals.fiber}g de fibra. Para tu siguiente comida del día, tu IA te recomienda incluir al menos ${Math.min(40, remainingProtein)}g de proteína magra (${safeFoods[0]?.name.split('(')[0].trim()}) acompañada de vegetales fibrosos para cumplir el consenso ISSN y estabilizar la glucosa.`
                : `¡Excelente distribución clínica hoy! Has alcanzado un muy buen aporte proteico (${dayTotals.protein}g) y carga glucémica controlada que protegen tu masa muscular y saciedad nocturna.`}
        </p>
      </div>

      {/* Los 4 tiempos de comida con fotos y edición de porciones */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {MEAL_SECTIONS.map(sec => {
          const items = dayLogs.filter(m => m.mealType === sec.id);
          const sectionKcal = items.reduce((sum, i) => sum + (Number(i.kcal) || 0), 0);

          return (
            <section key={sec.id} className="ns-card" style={{ padding: '22px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginBottom: '16px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid var(--border-warm)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <img
                    src={sec.photo}
                    alt={`Fotografía de referencia para ${sec.title}`}
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '14px',
                      objectFit: 'cover'
                    }}
                  />
                  <div>
                    <h2 style={{ fontSize: '1.28rem', margin: 0 }}>{sec.title}</h2>
                    <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                      {sec.timeHint} · {sectionKcal} kcal registradas
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAddingToMeal(addingToMeal === sec.id ? null : sec.id)}
                  className="ns-btn ns-btn-leaf ns-btn-sm"
                >
                  + Agregar a {sec.title.toLowerCase()}
                </button>
              </div>

              {addingToMeal === sec.id && (
                <form
                  onSubmit={e => handleAddInline(e, sec.id, sec.photo)}
                  className="ns-card ns-card-sage"
                  style={{
                    marginBottom: '16px',
                    padding: '16px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '12px',
                    alignItems: 'end'
                  }}
                >
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '4px' }}>
                      Alimento compatible con tu perfil
                    </label>
                    <select
                      className="ns-input"
                      value={selectedFoodId}
                      onChange={e => setSelectedFoodId(e.target.value)}
                    >
                      {safeFoods.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.name} (Nutri-Score {f.nutriGrade})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '4px' }}>
                      Porción (gramos)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="1000"
                      step="10"
                      className="ns-input"
                      value={portionGrams}
                      onChange={e => setPortionGrams(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="ns-btn ns-btn-carrot ns-btn-md">
                    Guardar plato
                  </button>
                </form>
              )}

              {items.length === 0 ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '10px 4px',
                    color: 'var(--text-muted)'
                  }}
                >
                  <HandBowlIllustration size={52} />
                  <p style={{ margin: 0, fontSize: '0.93rem' }}>
                    Todavía no hay alimentos anotados en {sec.title.toLowerCase()}. ¡Toca “+ Agregar” cuando quieras!
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {items.map(item => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                        padding: '12px 14px',
                        borderRadius: '14px',
                        backgroundColor: 'var(--bg-warm)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img
                          src={item.image || sec.photo}
                          alt={item.dishName}
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '10px',
                            objectFit: 'cover'
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.98rem' }}>{item.dishName}</div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            {item.kcal} kcal · {item.protein}g prot · {item.carbs}g carbos · {item.fat}g grasas
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                          Porción (g):
                          <input
                            type="number"
                            min="10"
                            max="1200"
                            step="10"
                            value={item.grams || 100}
                            onChange={e => updateMealPortion(item.id, e.target.value)}
                            style={{
                              width: '74px',
                              marginLeft: '6px',
                              padding: '5px 8px',
                              borderRadius: '8px',
                              border: '1px solid var(--border-strong)',
                              backgroundColor: 'var(--bg-surface)',
                              color: 'var(--text-primary)',
                              fontWeight: 700
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => deleteMealEntry(item.id)}
                          className="ns-btn ns-btn-ghost ns-btn-sm"
                          aria-label={`Quitar ${item.dishName}`}
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
