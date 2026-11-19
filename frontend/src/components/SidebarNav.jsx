import React from 'react';

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
  return (
    <aside className="sidebar" aria-label="Menú lateral">
      <div>
        <div className="sidebar-brand">
          <img
            src="/nutristudio-logo.svg"
            alt="Logo NutriStudio AI"
            style={{ width: '34px', height: '34px', borderRadius: '9px' }}
          />
          <span className="auth-brand-name">NutriStudio AI</span>
        </div>

        <nav className="sidebar-nav" aria-label="Navegación principal">
          <button
            type="button"
            className={`sidebar-link ${activeSection === 'summary' ? 'active' : ''}`}
            aria-current={activeSection === 'summary' ? 'page' : undefined}
            onClick={() => onSelectSection('summary')}
          >
            <span className="sidebar-link-label">
              <span aria-hidden="true">📊</span> Seguimiento diario
            </span>
          </button>
          <button
            type="button"
            className={`sidebar-link ${activeSection === 'meals' ? 'active' : ''}`}
            aria-current={activeSection === 'meals' ? 'page' : undefined}
            onClick={() => onSelectSection('meals')}
          >
            <span className="sidebar-link-label">
              <span aria-hidden="true">🥗</span> Comidas
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
              <span aria-hidden="true">💬</span> Asistente Nutricional
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
              <span aria-hidden="true">📄</span> Mis planes y guías
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
              <span aria-hidden="true">🩺</span> Mi Salud y Progreso
            </span>
            <span className="sidebar-count">{knowledgeScore}%</span>
          </button>
          <button
            type="button"
            className={`sidebar-link ${activeSection === 'profile' ? 'active' : ''}`}
            aria-current={activeSection === 'profile' ? 'page' : undefined}
            onClick={() => onSelectSection('profile')}
          >
            <span className="sidebar-link-label">
              <span aria-hidden="true">⚙️</span> Mi cuenta y metas
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
          <button type="button" className="btn-outline" onClick={onToggleTheme}>
            {themeMode === 'dark' ? '☀️ Modo claro' : '🌙 Modo oscuro clínico'}
          </button>
          <button type="button" className="btn-outline" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </aside>
  );
}
