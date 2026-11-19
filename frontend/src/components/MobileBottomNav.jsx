import React from 'react';
import { Sheet } from '../design-system';

export default function MobileBottomNav({
  activeSection,
  onSelectSection,
  quickAddOpen,
  setQuickAddOpen,
  onQuickFoodSearch,
  onQuickPhotoScan,
  onQuickBarcodeScan,
  onQuickAddWater
}) {
  return (
    <>
      <nav className="mobile-bottom-nav" aria-label="Navegación móvil inferior">
        <button
          type="button"
          className={`mobile-nav-btn ${activeSection === 'summary' ? 'active' : ''}`}
          onClick={() => onSelectSection('summary')}
        >
          <span aria-hidden="true">📊</span>
          <span>Inicio</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-btn ${activeSection === 'meals' ? 'active' : ''}`}
          onClick={() => onSelectSection('meals')}
        >
          <span aria-hidden="true">🥗</span>
          <span>Comidas</span>
        </button>

        <button
          type="button"
          className="mobile-fab-plus"
          aria-label="Registrar acción rápida"
          aria-expanded={quickAddOpen}
          onClick={() => setQuickAddOpen(true)}
        >
          +
        </button>

        <button
          type="button"
          className={`mobile-nav-btn ${activeSection === 'chat' ? 'active' : ''}`}
          onClick={() => onSelectSection('chat')}
        >
          <span aria-hidden="true">💬</span>
          <span>Coach</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-btn ${activeSection === 'analytics' ? 'active' : ''}`}
          onClick={() => onSelectSection('analytics')}
        >
          <span aria-hidden="true">🩺</span>
          <span>Salud</span>
        </button>
      </nav>

      <Sheet
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        title="Registro Rápido"
        subtitle="Elige cómo quieres registrar en segundos"
      >
        <div className="quick-add-grid">
          <button
            type="button"
            className="quick-add-tile"
            onClick={() => {
              setQuickAddOpen(false);
              onQuickFoodSearch();
            }}
          >
            <span style={{ fontSize: '1.3rem' }} aria-hidden="true">🔍</span>
            <strong>Buscar alimento</strong>
            <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
              Nutri-Score y porciones
            </span>
          </button>

          <button
            type="button"
            className="quick-add-tile"
            onClick={() => {
              setQuickAddOpen(false);
              onQuickPhotoScan();
            }}
          >
            <span style={{ fontSize: '1.3rem' }} aria-hidden="true">📷</span>
            <strong>Foto del plato</strong>
            <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
              Análisis visual de macros
            </span>
          </button>

          <button
            type="button"
            className="quick-add-tile"
            onClick={() => {
              setQuickAddOpen(false);
              onQuickBarcodeScan();
            }}
          >
            <span style={{ fontSize: '1.3rem' }} aria-hidden="true">🏷️</span>
            <strong>Código de barras</strong>
            <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
              Escáner estilo Yuka
            </span>
          </button>

          <button
            type="button"
            className="quick-add-tile"
            onClick={() => {
              onQuickAddWater();
              setQuickAddOpen(false);
            }}
          >
            <span style={{ fontSize: '1.3rem' }} aria-hidden="true">💧</span>
            <strong>+250 ml de agua</strong>
            <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
              Sumar vaso al día
            </span>
          </button>
        </div>
      </Sheet>
    </>
  );
}
