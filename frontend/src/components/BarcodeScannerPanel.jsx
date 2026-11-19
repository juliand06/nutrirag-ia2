import React, { useState, useRef, useEffect } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { lookupBarcodeOpenFoodFacts } from '../services/openFoodFactsService';
import HealthDisclaimer from './HealthDisclaimer';

export default function BarcodeScannerPanel({ mealType, onAddBarcodeMeal }) {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isScanningCam, setIsScanningCam] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [product, setProduct] = useState(null);
  const [grams, setGrams] = useState(100);
  const videoRef = useRef(null);
  const controlsRef = useRef(null);

  const stopCamera = () => {
    try {
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
    } catch {
      // Ignore cleanup errors
    }
    setIsScanningCam(false);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const handleLookup = async (codeToSearch) => {
    const code = (codeToSearch || barcodeInput).trim();
    if (!code) return;
    setErrorMsg('');
    setIsLoading(true);
    try {
      const res = await lookupBarcodeOpenFoodFacts(code);
      setProduct(res);
      setGrams(100);
    } catch (err) {
      setErrorMsg(err.message);
      setProduct(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartCamera = async () => {
    setErrorMsg('');
    setIsScanningCam(true);
    try {
      const reader = new BrowserMultiFormatReader();
      controlsRef.current = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result) => {
          if (result) {
            const text = result.getText();
            setBarcodeInput(text);
            stopCamera();
            handleLookup(text);
          }
        }
      );
    } catch {
      setIsScanningCam(false);
      setErrorMsg(
        'No se pudo acceder a la cámara en este dispositivo. Puedes escribir o pegar el código de barras abajo.'
      );
    }
  };

  const factor = Math.max(1, Number(grams) || 100) / 100;

  return (
    <div>
      <div className="form-stack" style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="input-clean"
            style={{ flex: 1, minWidth: '180px' }}
            placeholder="Código de barras (ej. 3017620422003, 7702001053759)..."
            value={barcodeInput}
            onChange={e => setBarcodeInput(e.target.value)}
          />
          <button
            type="button"
            className="btn-solid"
            disabled={isLoading}
            onClick={() => handleLookup()}
          >
            {isLoading ? 'Buscando…' : 'Analizar'}
          </button>
          <button
            type="button"
            className="btn-outline"
            onClick={isScanningCam ? stopCamera : handleStartCamera}
          >
            {isScanningCam ? 'Detener cámara' : '📷 Usar cámara'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Probar ejemplos:</span>
          {[
            { label: 'Nutella (3017620422003)', code: '3017620422003' },
            { label: 'Avena Quaker (7501761810011)', code: '7501761810011' },
            { label: 'Coca-Cola (5449000000996)', code: '5449000000996' }
          ].map(ex => (
            <button
              key={ex.code}
              type="button"
              className="copilot-chip"
              onClick={() => {
                setBarcodeInput(ex.code);
                handleLookup(ex.code);
              }}
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      {isScanningCam && (
        <div style={{ marginBottom: '14px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <video ref={videoRef} style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', display: 'block' }} />
        </div>
      )}

      {errorMsg && (
        <div className="error-banner" role="alert">
          {errorMsg}
        </div>
      )}

      {product && (
        <div className="list-item-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {product.imageUrl && (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  style={{ width: '56px', height: '56px', borderRadius: '10px', objectFit: 'cover' }}
                />
              )}
              <div>
                <strong style={{ fontSize: '0.94rem' }}>{product.name}</strong>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  {product.brand} · Código: {product.barcode} · NOVA {product.novaGroup}
                </div>
              </div>
            </div>
            <span className={`nutri-badge nutri-grade-${product.nutriGrade}`} style={{ fontSize: '0.8rem', padding: '5px 11px' }}>
              Nutri-Score {product.nutriGrade} · Calidad {product.qualityScore}/100
            </span>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
            Por <strong>{grams}g</strong>: <strong>{Math.round(product.kcal * factor)} kcal</strong> ·
            Proteína: {Math.round(product.protein * factor)}g · Carbs: {Math.round(product.carbs * factor)}g (Azúcar: {Math.round(product.sugar * factor)}g) ·
            Grasa: {Math.round(product.fat * factor)}g · Sodio: {Math.round(product.sodiumMg * factor)}mg
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <strong>Ingredientes:</strong> {product.ingredientsText.slice(0, 220)}
            {product.ingredientsText.length > 220 ? '…' : ''}
          </div>

          {product.additives.length > 0 && (
            <div style={{ fontSize: '0.75rem', color: 'var(--danger-text)' }}>
              <strong>Aditivos detectados ({product.additives.length}):</strong> {product.additives.slice(0, 8).join(', ')}
            </div>
          )}

          {product.alternatives.length > 0 && (
            <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'var(--accent-soft)' }}>
              <strong style={{ fontSize: '0.78rem', color: 'var(--accent)' }}>
                Alternativas más saludables sugeridas (estilo Yuka):
              </strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {product.alternatives.map(alt => `${alt.name} (Nutri-Score ${alt.nutriGrade} · ${alt.qualityScore}/100)`).join(' · ')}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label htmlFor="barcode-grams" style={{ fontSize: '0.78rem' }}>
                Porción (g):
              </label>
              <input
                id="barcode-grams"
                type="number"
                min="10"
                max="1000"
                className="input-clean"
                style={{ width: '82px', padding: '5px 8px' }}
                value={grams}
                onChange={e => setGrams(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn-solid"
              onClick={() =>
                onAddBarcodeMeal({
                  id: `meal-barcode-${Date.now()}`,
                  mealType,
                  dishName: `${product.name} (${grams}g)`,
                  totalCalories: Math.round(product.kcal * factor),
                  carbsGrams: Math.round(product.carbs * factor),
                  proteinGrams: Math.round(product.protein * factor),
                  fatGrams: Math.round(product.fat * factor),
                  fiberGrams: Math.round(product.fiber * factor),
                  sodiumMg: Math.round(product.sodiumMg * factor),
                  qualityScore: product.qualityScore,
                  nutriGrade: product.nutriGrade,
                  glycemicLoad: `Escáner · NOVA ${product.novaGroup}`,
                  nutritionalAdvice: `Escaneado de etiqueta (${product.brand}). Calidad ${product.qualityScore}/100.`
                })
              }
            >
              + Agregar a {mealType}
            </button>
          </div>

          <HealthDisclaimer compact />
        </div>
      )}
    </div>
  );
}
