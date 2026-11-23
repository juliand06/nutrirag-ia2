import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNutriStore } from '../store/useNutriStore';

export default function ProfilePage() {
  const navigate = useNavigate();
  const currentUser = useNutriStore(s => s.currentUser);
  const workspace = useNutriStore(s => s.workspace);
  const updateUserProfile = useNutriStore(s => s.updateUserProfile);
  const themeMode = useNutriStore(s => s.themeMode);
  const toggleThemeMode = useNutriStore(s => s.toggleThemeMode);
  const unitSystem = useNutriStore(s => s.unitSystem);
  const toggleUnitSystem = useNutriStore(s => s.toggleUnitSystem);
  const language = useNutriStore(s => s.language);
  const setLanguage = useNutriStore(s => s.setLanguage);
  const deleteAllUserData = useNutriStore(s => s.deleteAllUserData);
  const showToast = useNutriStore(s => s.showToast);

  const [name, setName] = useState(currentUser?.name || '');
  const [city, setCity] = useState(currentUser?.city || 'Medellín');
  const [weightKg, setWeightKg] = useState(currentUser?.weightKg || 67);
  const [targetWeightKg, setTargetWeightKg] = useState(currentUser?.targetWeightKg || 64);
  const [dailyCalories, setDailyCalories] = useState(currentUser?.dailyCalories || 1950);
  const [dislikedFoods, setDislikedFoods] = useState(currentUser?.dislikedFoods || '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    updateUserProfile({
      name,
      city,
      weightKg: Number(weightKg),
      targetWeightKg: Number(targetWeightKg),
      dailyCalories: Number(dailyCalories),
      dislikedFoods
    });
    showToast('Tus datos y metas se actualizaron correctamente.', 'emerald');
  };

  const handleExportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile: currentUser,
      workspace
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nutristudio-mis-datos-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Descargamos una copia completa de tus datos en formato JSON.', 'emerald');
  };

  const handleDeleteEverything = async () => {
    await deleteAllUserData();
    navigate('/');
  };

  return (
    <div style={{ maxWidth: '880px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', marginBottom: '4px' }}>
          Tu perfil, preferencias y privacidad
        </h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          Ajusta tus metas, unidades, tema visual o gestiona tus datos personales con total control.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '22px',
          marginBottom: '26px'
        }}
      >
        {/* Formulario de datos y metas */}
        <form onSubmit={handleSaveProfile} className="ns-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '4px' }}>Datos personales y metas</h2>

          <div>
            <label htmlFor="prof-name" style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>
              Nombre
            </label>
            <input
              id="prof-name"
              type="text"
              className="ns-input"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="prof-city" style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>
              Ciudad
            </label>
            <input
              id="prof-city"
              type="text"
              className="ns-input"
              value={city}
              onChange={e => setCity(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label htmlFor="prof-w" style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>
                Peso actual (kg)
              </label>
              <input
                id="prof-w"
                type="number"
                step="0.5"
                className="ns-input"
                value={weightKg}
                onChange={e => setWeightKg(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="prof-tw" style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>
                Peso meta (kg)
              </label>
              <input
                id="prof-tw"
                type="number"
                step="0.5"
                className="ns-input"
                value={targetWeightKg}
                onChange={e => setTargetWeightKg(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="prof-kcal" style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>
              Meta de energía diaria (kcal)
            </label>
            <input
              id="prof-kcal"
              type="number"
              min="1200"
              max="4500"
              step="50"
              className="ns-input"
              value={dailyCalories}
              onChange={e => setDailyCalories(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="prof-disliked" style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>
              Alimentos o ingredientes que prefiero evitar
            </label>
            <input
              id="prof-disliked"
              type="text"
              className="ns-input"
              value={dislikedFoods}
              onChange={e => setDislikedFoods(e.target.value)}
              placeholder="Ej. Brócoli, atún..."
            />
          </div>

          <button type="submit" className="ns-btn ns-btn-leaf ns-btn-md">
            Guardar cambios
          </button>
        </form>

        {/* Preferencias, transparencia clínica y privacidad */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <section className="ns-card">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>Ajustes de la aplicación</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Apariencia visual</span>
                <button type="button" onClick={toggleThemeMode} className="ns-btn ns-btn-outline ns-btn-sm">
                  {themeMode === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Sistema de unidades</span>
                <button type="button" onClick={toggleUnitSystem} className="ns-btn ns-btn-outline ns-btn-sm">
                  {unitSystem === 'imperial' ? 'Imperial (lb / ft)' : 'Métrico (kg / cm)'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Idioma de interfaz</span>
                <button
                  type="button"
                  onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
                  className="ns-btn ns-btn-outline ns-btn-sm"
                >
                  {language === 'en' ? 'English (EN)' : 'Español (ES)'}
                </button>
              </div>
            </div>
          </section>

          {/* Estado honesto de integraciones clínicas (CERO datos clínicos ficticios) */}
          <section className="ns-card ns-card-warm">
            <h2 style={{ fontSize: '1.15rem', marginBottom: '6px' }}>
              Expediente clínico y laboratorios (No conectado)
            </h2>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Actualmente no hay ningún servidor hospitalario HL7 FHIR ni resultados de laboratorio vinculados a tu cuenta. Por transparencia y ética clínica, NutriStudio nunca muestra exámenes ni biomarcadores ficticios.
            </p>
          </section>

          {/* Exportar y borrar mis datos */}
          <section className="ns-card">
            <h2 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Tus datos son tuyos</h2>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleExportData}
                className="ns-btn ns-btn-outline ns-btn-sm"
              >
                Exportar mis datos (.json)
              </button>

              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="ns-btn ns-btn-ghost ns-btn-sm"
                  style={{ color: 'var(--accent-carrot)' }}
                >
                  Borrar mi cuenta y datos
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDeleteEverything}
                  className="ns-btn ns-btn-carrot ns-btn-sm"
                >
                  Confirmar borrado definitivo
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
