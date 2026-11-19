import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNutriStore } from '../store/useNutriStore';

export default function SidebarNav({
  activeSection,
  onSelectSection,
  mealLogsCount,
  conversationsCount,
  documentsCount,
  knowledgeScore,
  userInitials,
  currentUser,
  themeMode,
  onToggleTheme,
  onLogout
}) {
  const { t } = useTranslation();
  const language = useNutriStore(s => s.language);
  const setLanguage = useNutriStore(s => s.setLanguage);
  const unitSystem = useNutriStore(s => s.unitSystem);
  const toggleUnitSystem = useNutriStore(s => s.toggleUnitSystem);

  return (
    <aside className="sidebar" aria-label="Menú lateral">
      <div>
        <div className="sidebar-brand">
          <img
            src="/nutristudio-logo.svg"
            alt="Logo NutriStudio AI"
            style={{ width: '34px', height: '34px', borderRadius: '9px' }}
          />
          <span className="auth-brand-name">{t('brand')}</span>
        </div>

        <nav className="sidebar-nav" aria-label="Navegación principal">
          <button
            type="button"
            className={`sidebar-link ${activeSection === 'summary' ? 'active' : ''}`}
            aria-current={activeSection === 'summary' ? 'page' : undefined}
            onClick={() => onSelectSection('summary')}
          >
            <span className="sidebar-link-label">
              <span aria-hidden="true">📊</span> {t('nav.summary')}
            </span>
          </button>
          <button
            type="button"
            className={`sidebar-link ${activeSection === 'meals' ? 'active' : ''}`}
            aria-current={activeSection === 'meals' ? 'page' : undefined}
            onClick={() => onSelectSection('meals')}
          >
            <span className="sidebar-link-label">
              <span aria-hidden="true">🥗</span> {t('nav.meals')}
            </span>
            <span className="sidebar-count">{mealLogsCount}</span>
          </button>
          <button
            type="button"
            className={`sidebar-link ${activeSection === 'chat' ? 'active' : ''}`}
            aria-current={activeSection === 'chat' ? 'page' : undefined}
            onClick={() => onSelectSection('chat')}
          >
            <span className="sidebar-link-label">
              <span aria-hidden="true">💬</span> {t('nav.chat')}
            </span>
            <span className="sidebar-count">{conversationsCount}</span>
          </button>
          <button
            type="button"
            className={`sidebar-link ${activeSection === 'documents' ? 'active' : ''}`}
            aria-current={activeSection === 'documents' ? 'page' : undefined}
            onClick={() => onSelectSection('documents')}
          >
            <span className="sidebar-link-label">
              <span aria-hidden="true">📄</span> {t('nav.documents')}
            </span>
            <span className="sidebar-count">{documentsCount}</span>
          </button>
          <button
            type="button"
            className={`sidebar-link ${activeSection === 'analytics' ? 'active' : ''}`}
            aria-current={activeSection === 'analytics' ? 'page' : undefined}
            onClick={() => onSelectSection('analytics')}
          >
            <span className="sidebar-link-label">
              <span aria-hidden="true">🩺</span> {t('nav.analytics')}
            </span>
            <span className="sidebar-count">{knowledgeScore}%</span>
          </button>
          <button
            type="button"
            className={`sidebar-link ${activeSection === 'nutritionist' ? 'active' : ''}`}
            aria-current={activeSection === 'nutritionist' ? 'page' : undefined}
            onClick={() => onSelectSection('nutritionist')}
          >
            <span className="sidebar-link-label">
              <span aria-hidden="true">👩‍⚕️</span> {t('nav.nutritionist')}
            </span>
          </button>
          <button
            type="button"
            className={`sidebar-link ${activeSection === 'profile' ? 'active' : ''}`}
            aria-current={activeSection === 'profile' ? 'page' : undefined}
            onClick={() => onSelectSection('profile')}
          >
            <span className="sidebar-link-label">
              <span aria-hidden="true">⚙️</span> {t('nav.profile')}
            </span>
          </button>
        </nav>
      </div>

      <div className="sidebar-user">
        <div className="user-summary">
          <div className="user-avatar" aria-hidden="true">
            {userInitials}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div className="user-name">{currentUser.name}</div>
            <div className="user-meta">{currentUser.email}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <button
              type="button"
              className="btn-outline"
              style={{ padding: '7px 8px', fontSize: '0.74rem' }}
              aria-label="Cambiar idioma"
              onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
            >
              🌐 {language.toUpperCase()}
            </button>
            <button
              type="button"
              className="btn-outline"
              style={{ padding: '7px 8px', fontSize: '0.74rem' }}
              aria-label="Cambiar sistema de unidades"
              onClick={toggleUnitSystem}
            >
              ⚖️ {unitSystem === 'metric' ? 'kg/cm' : 'lb/ft'}
            </button>
          </div>
          <button type="button" className="btn-outline" onClick={onToggleTheme}>
            {themeMode === 'dark' ? `☀️ ${t('nav.lightMode')}` : `🌙 ${t('nav.darkMode')}`}
          </button>
          <button type="button" className="btn-outline" onClick={onLogout}>
            {t('nav.logout')}
          </button>
        </div>
      </div>
    </aside>
  );
}
