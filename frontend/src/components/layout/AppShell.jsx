import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useNutriStore } from '../../store/useNutriStore';
import { HandLeafIcon } from '../../assets/doodles/HandDrawnSvgs';
import QuickAddModal from './QuickAddModal';
import { Toast } from '../../design-system';
import { evaluateSmartReminders, sendBrowserNotification } from '../../services/notificationService';

const DESKTOP_LINKS = [
  { to: '/app', label: 'Inicio', end: true },
  { to: '/app/coach', label: 'Coach con IA' },
  { to: '/app/diario', label: 'Diario de comidas' },
  { to: '/app/alimentos', label: 'Alimentos y escáner' },
  { to: '/app/planes', label: 'Planes y compras' },
  { to: '/app/progreso', label: 'Mi progreso' },
  { to: '/app/aprende', label: 'Aprende' },
  { to: '/app/perfil', label: 'Perfil y salud' }
];

export default function AppShell({ children }) {
  const navigate = useNavigate();
  const currentUser = useNutriStore(s => s.currentUser);
  const themeMode = useNutriStore(s => s.themeMode);
  const toggleThemeMode = useNutriStore(s => s.toggleThemeMode);
  const setQuickAddOpen = useNutriStore(s => s.setQuickAddOpen);
  const logout = useNutriStore(s => s.logout);
  const toast = useNutriStore(s => s.toast);
  const clearToast = useNutriStore(s => s.clearToast);
  const workspace = useNutriStore(s => s.workspace);

  const [activeBannerReminder, setActiveBannerReminder] = useState(null);

  // Verificador periódico de recordatorios inteligentes (cada 30s mientras la app esté abierta)
  useEffect(() => {
    if (!currentUser || !workspace) return;

    const checkReminders = () => {
      const reminder = evaluateSmartReminders({ currentUser, workspace, now: new Date() });
      if (reminder) {
        setActiveBannerReminder(reminder);
        // Si el usuario tiene permisos concedidos de Web Notifications, emitir notificación nativa
        sendBrowserNotification(reminder.title, {
          body: reminder.body,
          tag: reminder.id
        });
      }
    };

    // Verificación inicial inmediata y luego intervalo
    checkReminders();
    const interval = setInterval(checkReminders, 30000);
    return () => clearInterval(interval);
  }, [currentUser, workspace]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="ns-app-layout">
      {/* Barra lateral en escritorio */}
      <aside className="ns-sidebar-desktop" aria-label="Menú principal de NutriStudio">
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '22px'
            }}
          >
            <NavLink
              to="/app"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '1.2rem',
                color: 'var(--text-primary)'
              }}
            >
              <span
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '12px 8px 14px 10px',
                  backgroundColor: 'var(--brand-leaf)',
                  color: '#FFFFFF',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <HandLeafIcon size={20} color="#FFFFFF" />
              </span>
              <span>NutriStudio</span>
            </NavLink>
          </div>

          <button
            type="button"
            onClick={() => setQuickAddOpen(true)}
            className="ns-btn ns-btn-carrot ns-btn-md"
            style={{ width: '100%', marginBottom: '20px' }}
          >
            + Registrar comida o agua
          </button>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {DESKTOP_LINKS.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                style={({ isActive }) => ({
                  padding: '11px 14px',
                  borderRadius: '14px',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.95rem',
                  color: isActive ? 'var(--brand-leaf)' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'var(--brand-leaf-soft)' : 'transparent',
                  transition: 'all 0.15s ease'
                })}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div
          style={{
            borderTop: '1px solid var(--border-warm)',
            paddingTop: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          {currentUser && (
            <div style={{ fontSize: '0.86rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{currentUser.name}</div>
              <div style={{ color: 'var(--text-muted)' }}>
                {currentUser.city || 'Colombia'} · {currentUser.dailyCalories} kcal/día
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={toggleThemeMode}
              className="ns-btn ns-btn-outline ns-btn-sm"
              style={{ flex: 1 }}
            >
              {themeMode === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="ns-btn ns-btn-ghost ns-btn-sm"
            >
              Salir
            </button>
          </div>
        </div>
      </aside>

      {/* Contenedor central + encabezado móvil */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header className="ns-mobile-header">
          <NavLink
            to="/app"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '1.08rem',
              color: 'var(--text-primary)'
            }}
          >
            <HandLeafIcon size={18} color="var(--brand-leaf)" />
            <span>NutriStudio</span>
          </NavLink>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <NavLink to="/app/aprende" className="ns-chip" style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
              Aprende
            </NavLink>
            <NavLink to="/app/planes" className="ns-chip" style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
              Planes
            </NavLink>
            <NavLink to="/app/progreso" className="ns-chip" style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
              Progreso
            </NavLink>
          </div>
        </header>

        <main className="ns-main-content">
          {/* Banner de Recordatorio Inteligente Contextual si coincide con hora de comida o agua */}
          {activeBannerReminder && (
            <div
              role="alert"
              className="ns-card ns-card-sage"
              style={{
                marginBottom: '18px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                borderLeft: '4px solid var(--brand-leaf)'
              }}
            >
              <div>
                <strong style={{ color: 'var(--brand-leaf)', fontSize: '0.92rem', display: 'block' }}>
                  {activeBannerReminder.title}
                </strong>
                <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                  {activeBannerReminder.body}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <NavLink
                  to={activeBannerReminder.actionUrl || '/app'}
                  className="ns-btn ns-btn-leaf ns-btn-sm"
                  onClick={() => setActiveBannerReminder(null)}
                >
                  Registrar
                </NavLink>
                <button
                  type="button"
                  onClick={() => setActiveBannerReminder(null)}
                  className="ns-btn ns-btn-ghost ns-btn-sm"
                  aria-label="Cerrar recordatorio"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {children}

          {/* Aviso legal obligatorio en el pie de la app */}
          <footer
            style={{
              marginTop: '48px',
              paddingTop: '18px',
              borderTop: '1px solid var(--border-warm)',
              fontSize: '0.84rem',
              color: 'var(--text-muted)'
            }}
          >
            NutriStudio AI ofrece orientación informativa sobre alimentación y no reemplaza la consulta con un profesional de la salud.
          </footer>
        </main>
      </div>

      {/* Barra inferior en móvil con botón central flotante "+" */}
      <nav className="ns-mobile-bottom-nav" aria-label="Navegación móvil">
        <NavLink
          to="/app"
          end
          style={({ isActive }) => ({
            fontSize: '0.78rem',
            fontWeight: isActive ? 700 : 500,
            color: isActive ? 'var(--brand-leaf)' : 'var(--text-secondary)',
            padding: '6px 8px'
          })}
        >
          Inicio
        </NavLink>

        <NavLink
          to="/app/diario"
          style={({ isActive }) => ({
            fontSize: '0.78rem',
            fontWeight: isActive ? 700 : 500,
            color: isActive ? 'var(--brand-leaf)' : 'var(--text-secondary)',
            padding: '6px 8px'
          })}
        >
          Diario
        </NavLink>

        <button
          type="button"
          onClick={() => setQuickAddOpen(true)}
          aria-label="Registrar comida, foto, código o agua"
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-carrot)',
            color: '#FFFFFF',
            border: '3px solid var(--bg-surface)',
            fontSize: '1.65rem',
            fontWeight: 700,
            transform: 'translateY(-14px)',
            boxShadow: '0 8px 20px rgba(217, 93, 36, 0.35)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          +
        </button>

        <NavLink
          to="/app/alimentos"
          style={({ isActive }) => ({
            fontSize: '0.78rem',
            fontWeight: isActive ? 700 : 500,
            color: isActive ? 'var(--brand-leaf)' : 'var(--text-secondary)',
            padding: '6px 8px'
          })}
        >
          Alimentos
        </NavLink>

        <NavLink
          to="/app/coach"
          style={({ isActive }) => ({
            fontSize: '0.78rem',
            fontWeight: isActive ? 700 : 500,
            color: isActive ? 'var(--brand-leaf)' : 'var(--text-secondary)',
            padding: '6px 8px'
          })}
        >
          Coach IA
        </NavLink>

        <NavLink
          to="/app/perfil"
          style={({ isActive }) => ({
            fontSize: '0.78rem',
            fontWeight: isActive ? 700 : 500,
            color: isActive ? 'var(--brand-leaf)' : 'var(--text-secondary)',
            padding: '6px 8px'
          })}
        >
          Perfil
        </NavLink>
      </nav>

      <QuickAddModal />
      <Toast message={toast?.message} tone={toast?.tone} onClose={clearToast} />
    </div>
  );
}
