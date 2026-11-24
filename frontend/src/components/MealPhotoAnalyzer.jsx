import React, { useState, useRef } from 'react';
import {
  compressMealImageFile,
  analyzeMealPhotoWithAI,
  recalculateVisionAnalysis
} from '../services/mealPhotoVisionService';

export default function MealPhotoAnalyzer({
  mealType = 'Desayuno',
  userProfile = {},
  onSaveMeal,
  onMealTypeChange = null
}) {
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const [previewUrl, setPreviewUrl] = useState(null);
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [compressedBase64, setCompressedBase64] = useState(null);
  const [userHint, setUserHint] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [analysis, setAnalysis] = useState(null);

  const handleFilePicked = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');
    setAnalysis(null);

    try {
      const compressed = await compressMealImageFile(file);
      setPreviewUrl(compressed.previewDataUrl);
      setThumbnailUrl(compressed.thumbnailDataUrl);
      setCompressedBase64(compressed.base64);

      // Iniciar análisis automático al seleccionar la foto
      setAnalyzing(true);
      const result = await analyzeMealPhotoWithAI({
        base64Image: compressed.base64,
        mimeType: compressed.mimeType,
        mealType,
        userHint,
        userProfile
      });
      setAnalysis(result);
    } catch (err) {
      setErrorMsg(err?.message || 'No pudimos procesar la fotografía. Intenta con otra imagen.');
    } finally {
      setAnalyzing(false);
      // Limpiar input para permitir volver a elegir la misma foto si se desea
      if (e.target) e.target.value = '';
    }
  };

  const handleReanalyzeWithHint = async () => {
    if (!compressedBase64 || analyzing) return;
    setErrorMsg('');
    setAnalyzing(true);
    try {
      const result = await analyzeMealPhotoWithAI({
        base64Image: compressedBase64,
        mimeType: 'image/jpeg',
        mealType,
        userHint,
        userProfile
      });
      setAnalysis(result);
    } catch (err) {
      setErrorMsg(err?.message || 'No pudimos reanalizar la fotografía.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUpdateIngredientGrams = (ingId, newGrams) => {
    if (!analysis) return;
    const updatedIngredients = analysis.ingredients.map(ing =>
      ing.id === ingId ? { ...ing, estimatedGrams: Math.max(0, Number(newGrams) || 0) } : ing
    );
    setAnalysis(recalculateVisionAnalysis({ ...analysis, ingredients: updatedIngredients }, userProfile));
  };

  const handleRemoveIngredient = (ingId) => {
    if (!analysis) return;
    const updatedIngredients = analysis.ingredients.filter(ing => ing.id !== ingId);
    setAnalysis(recalculateVisionAnalysis({ ...analysis, ingredients: updatedIngredients }, userProfile));
  };

  const handleConfirmSave = () => {
    if (!analysis || !analysis.isFoodValid || !onSaveMeal) return;
    const t = analysis.totals;
    onSaveMeal({
      mealType,
      dishName: analysis.dishName,
      grams: t.grams || 200,
      kcal: t.kcal,
      carbs: t.carbs,
      protein: t.protein,
      fat: t.fat,
      fiber: t.fiber,
      sodiumMg: t.sodiumMg,
      potassiumMg: t.potassiumMg,
      ironMg: t.ironMg,
      calciumMg: t.calciumMg,
      vitaminCMg: t.vitaminCMg,
      omega3Mg: t.omega3Mg,
      glycemicLoad: t.glycemicLoad,
      image: thumbnailUrl || '/img/plato-almuerzo.webp'
    });
  };

  const resetScanner = () => {
    setPreviewUrl(null);
    setThumbnailUrl(null);
    setCompressedBase64(null);
    setAnalysis(null);
    setErrorMsg('');
    setUserHint('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Selector de tiempo de comida opcional */}
      {onMealTypeChange && (
        <div>
          <label htmlFor="vision-mealtype" style={{ display: 'block', fontWeight: 600, fontSize: '0.86rem', marginBottom: '4px' }}>
            ¿A qué comida corresponde esta foto?
          </label>
          <select
            id="vision-mealtype"
            className="ns-input"
            value={mealType}
            onChange={e => onMealTypeChange(e.target.value)}
          >
            <option value="Desayuno">Desayuno</option>
            <option value="Almuerzo">Almuerzo</option>
            <option value="Merienda">Merienda / Algo</option>
            <option value="Cena">Cena</option>
          </select>
        </div>
      )}

      {/* Nota opcional para mejorar precisión de ingredientes ocultos */}
      <div>
        <label htmlFor="vision-hint" style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', marginBottom: '4px' }}>
          Nota rápida opcional (ayuda a la IA con ingredientes ocultos)
        </label>
        <input
          id="vision-hint"
          type="text"
          className="ns-input"
          value={userHint}
          onChange={e => setUserHint(e.target.value)}
          placeholder="Ej. Son 2 huevos con aceite de oliva, arepa de maíz y café sin azúcar"
        />
      </div>

      {/* Inputs ocultos de cámara trasera y galería */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFilePicked}
        style={{ display: 'none' }}
        aria-label="Tomar fotografía del plato con la cámara"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFilePicked}
        style={{ display: 'none' }}
        aria-label="Subir fotografía del plato desde la galería"
      />

      {/* Botones de captura y subida */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '10px' }}>
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={analyzing}
          className="ns-btn ns-btn-carrot ns-btn-md"
        >
          📷 Tomar foto con cámara
        </button>
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          disabled={analyzing}
          className="ns-btn ns-btn-outline ns-btn-md"
        >
          🖼️ Subir foto de galería
        </button>
      </div>

      {/* Vista previa de la foto tomada */}
      {previewUrl && (
        <div
          style={{
            position: 'relative',
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1.5px solid var(--border-strong)',
            backgroundColor: 'var(--bg-warm)'
          }}
        >
          <img
            src={previewUrl}
            alt="Fotografía del plato seleccionada para análisis nutricional IA"
            style={{ width: '100%', maxHeight: '240px', objectFit: 'cover', display: 'block' }}
          />
          <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '6px' }}>
            {!analyzing && (
              <button
                type="button"
                onClick={handleReanalyzeWithHint}
                className="ns-btn ns-btn-leaf ns-btn-sm"
              >
                Reanalizar
              </button>
            )}
            <button
              type="button"
              onClick={resetScanner}
              className="ns-btn ns-btn-outline ns-btn-sm"
            >
              Cambiar foto
            </button>
          </div>
        </div>
      )}

      {/* Estado de análisis en curso */}
      {analyzing && (
        <div
          role="status"
          aria-live="polite"
          className="ns-card ns-card-sage"
          style={{ padding: '16px', textAlign: 'center' }}
        >
          <div style={{ fontWeight: 700, color: 'var(--brand-leaf)', marginBottom: '4px' }}>
            Analizando tu plato con Visión IA Clínica…
          </div>
          <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
            Identificando ingredientes, gramos aproximados, calorías, micronutrientes y posibles alérgenos de tu perfil.
          </div>
        </div>
      )}

      {/* Error amable */}
      {errorMsg && (
        <div
          role="alert"
          style={{
            padding: '12px 14px',
            borderRadius: '12px',
            backgroundColor: 'var(--accent-carrot-soft)',
            border: '1px solid var(--accent-carrot)',
            color: 'var(--accent-carrot)',
            fontSize: '0.88rem',
            fontWeight: 600
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Resultado cuando la imagen NO es comida */}
      {analysis && !analysis.isFoodValid && (
        <div
          role="alert"
          className="ns-card ns-card-warm"
          style={{ padding: '16px', borderColor: 'var(--accent-carrot)' }}
        >
          <strong style={{ color: 'var(--accent-carrot)' }}>Esta imagen no parece ser comida o bebida</strong>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {analysis.rejectionReason || 'Toma una foto clara de tu plato o bebida para que podamos calcular sus calorías y nutrientes.'}
          </p>
        </div>
      )}

      {/* Resultado completo de comida válida con edición de gramos en vivo */}
      {analysis && analysis.isFoodValid && (
        <div className="ns-card ns-card-sage" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-leaf)', textTransform: 'uppercase' }}>
                Visión IA Clínica · Confianza {analysis.confidence}
              </span>
              <h3 style={{ fontSize: '1.2rem', margin: '2px 0 0 0' }}>{analysis.dishName}</h3>
            </div>
            <span className="ns-chip ns-chip-active" style={{ fontSize: '0.88rem' }}>
              {analysis.totals.kcal} kcal ({analysis.totals.grams}g)
            </span>
          </div>

          {/* Alerta determinista de alergias o protocolos clínicos */}
          {analysis.safetyAlerts?.length > 0 && (
            <div
              role="alert"
              style={{
                padding: '10px 12px',
                borderRadius: '10px',
                backgroundColor: 'var(--accent-carrot-soft)',
                border: '1px solid var(--accent-carrot)',
                fontSize: '0.84rem',
                color: 'var(--text-primary)'
              }}
            >
              <strong style={{ color: 'var(--accent-carrot)' }}>Alerta clínica para tu perfil:</strong>
              <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                {analysis.safetyAlerts.map(alert => (
                  <li key={alert}>{alert}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Macros principales */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
            {[
              { label: 'Proteína', val: `${analysis.totals.protein}g` },
              { label: 'Carbos', val: `${analysis.totals.carbs}g` },
              { label: 'Grasas', val: `${analysis.totals.fat}g` },
              { label: 'Fibra', val: `${analysis.totals.fiber}g` }
            ].map(m => (
              <div key={m.label} className="ns-card" style={{ padding: '8px 6px' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{m.label}</div>
                <div style={{ fontWeight: 700, color: 'var(--brand-leaf)', fontSize: '0.98rem' }}>{m.val}</div>
              </div>
            ))}
          </div>

          {/* Biomarcadores clínicos */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <span className="ns-chip" style={{ fontSize: '0.76rem' }}>
              Carga Glucémica: {analysis.totals.glycemicLoad}
            </span>
            <span className="ns-chip" style={{ fontSize: '0.76rem' }}>
              Sodio: {analysis.totals.sodiumMg !== null ? `${analysis.totals.sodiumMg} mg` : 'N/D'} · Potasio:{' '}
              {analysis.totals.potassiumMg !== null ? `${analysis.totals.potassiumMg} mg` : 'N/D'}
            </span>
            <span className="ns-chip" style={{ fontSize: '0.76rem' }}>
              Hierro: {analysis.totals.ironMg !== null ? `${analysis.totals.ironMg} mg` : 'N/D'} · Vit. C:{' '}
              {analysis.totals.vitaminCMg !== null ? `${analysis.totals.vitaminCMg} mg` : 'N/D'}
            </span>
            <span className="ns-chip" style={{ fontSize: '0.76rem' }}>
              Omega-3: {analysis.totals.omega3Mg !== null ? `${analysis.totals.omega3Mg} mg` : 'N/D'} · Calcio:{' '}
              {analysis.totals.calciumMg !== null ? `${analysis.totals.calciumMg} mg` : 'N/D'}
            </span>
          </div>

          {/* Ingredientes detectados con gramos editables */}
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Ingredientes detectados (ajusta los gramos si lo ves necesario):
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {analysis.ingredients.map(ing => (
                <div
                  key={ing.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-warm)',
                    fontSize: '0.84rem'
                  }}
                >
                  <span style={{ fontWeight: 600, flex: 1 }}>{ing.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="number"
                      min="0"
                      max="1500"
                      step="5"
                      value={ing.estimatedGrams}
                      onChange={e => handleUpdateIngredientGrams(ing.id, e.target.value)}
                      aria-label={`Gramos estimados de ${ing.name}`}
                      style={{
                        width: '68px',
                        padding: '4px 6px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-strong)',
                        backgroundColor: 'var(--bg-canvas)',
                        color: 'var(--text-primary)',
                        fontWeight: 700
                      }}
                    />
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>g</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveIngredient(ing.id)}
                      className="ns-btn ns-btn-ghost ns-btn-sm"
                      aria-label={`Quitar ${ing.name}`}
                      style={{ padding: '2px 8px' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Observación clínica + consejo práctico */}
          {(analysis.clinicalObservation || analysis.practicalUpgradeTip) && (
            <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              {analysis.clinicalObservation && <div><strong>Análisis clínico:</strong> {analysis.clinicalObservation}</div>}
              {analysis.practicalUpgradeTip && (
                <div style={{ marginTop: '4px', color: 'var(--brand-leaf)' }}>
                  <strong>Cómo mejorarlo:</strong> {analysis.practicalUpgradeTip}
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleConfirmSave}
            className="ns-btn ns-btn-leaf ns-btn-md"
            style={{ width: '100%' }}
          >
            + Guardar en mi {mealType.toLowerCase()} ({analysis.totals.kcal} kcal)
          </button>
        </div>
      )}
    </div>
  );
}
