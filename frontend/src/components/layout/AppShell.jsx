import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useNutriStore } from '../../store/useNutriStore';
import { HandLeafIcon } from '../../assets/doodles/HandDrawnSvgs';
import { generateProactiveDailyRoadmap } from '../../lib/proactiveAiEngine';
import QuickAddModal from './QuickAddModal';
import { Toast } from '../../design-system';

const DESKTOP_LINKS = [
  { to: '/app', label: 'Inicio', end: true },
  { to: '/app/diario', label: 'Diario de comidas' },
  { to: '/app/alimentos', label: 'Alimentos y escáner' },
  { to: '/app/aprende', label: 'Aprende a comer bien' },
  { to: '/app/planes', label: 'Planes y compras' },
  { to: '/app/coach', label: 'Coach con IA' },
  { to: '/app/progreso', label: 'Mi progreso' },
  { to: '/app/perfil', label: 'Perfil y ajustes' }
];

export default function AppShell({ children }) {
  const navigate = useNavigate();
  const currentUser = useNutriStore(s => s.currentUser);
  const workspace = useNutriStore(s => s.workspace);
  const themeMode = useNutriStore(s => s.themeMode);
  const toggleThemeMode = useNutriStore(s => s.toggleThemeMode);
  const setQuickAddOpen = useNutriStore(s => s.setQuickAddOpen);
  const addMealEntry = useNutriStore(s => s.addMealEntry);
  const setWaterGlassesForDate = useNutriStore(s => s.setWaterGlassesForDate);
  const logout = useNutriStore(s => s.logout);
  const toast = useNutriStore(s => s.toast);
  const clearToast = useNutriStore(s => s.clearToast);

  const roadmap = generateProactiveDailyRoadmap(currentUser || {}, workspace || {});
  const topAction = roadmap.immediateActions[0];
  const todayIso = roadmap.context.todayIso;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleExecuteTopAction = () => {
    if (!topAction) return;
    if (topAction.actionType === 'log_meal' && topAction.mealPayload) {
      addMealEntry({
        date: todayIso,
        ...topAction.mealPayload
      });
    } else if (topAction.actionType === 'add_water') {
      setWaterGlassesForDate(todayIso, roadmap.context.waterGlassesToday + 1);
    }
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

          {/* Tarjeta lateral de protocolo clínico activo */}
          {roadmap.protocols[0] && (
            <div
              className="ns-card ns-card-sage"
              style={{ marginTop: '18px', padding: '12px 14px', fontSize: '0.8rem' }}
            >
              <div style={{ fontWeight: 700, color: 'var(--brand-leaf)', marginBottom: '4px' }}>
                IA Clínica Activa
              </div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {roadmap.protocols[0].label}
              </div>
              <div style={{ color: 'var(--text-secondary)', marginTop: '2px', fontSize: '0.75rem' }}>
                {roadmap.protocols[0].source}
              </div>
            </div>
          )}
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
          {/* Franja de Copiloto Clínico Proactivo Omnipresente: guía sin necesidad de preguntar */}
          {topAction && (
            <div
              role="region"
              aria-label="Guía proactiva del día"
              className="ns-card ns-card-sage"
              style={{
                padding: '12px 18px',
                marginBottom: '22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                borderLeft: '4px solid var(--brand-leaf)'
              }}
            >
              <div style={{ flex: '1 1 320px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--brand-leaf)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Guía IA en vivo ({roadmap.timeWindowLabel}) · {roadmap.protocols[0]?.source}
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  {topAction.title}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {topAction.actionType !== 'none' && (
                  <button
                    type="button"
                    onClick={handleExecuteTopAction}
                    className="ns-btn ns-btn-leaf ns-btn-sm"
                  >
                    {topAction.actionLabel}
                  </button>
                )}
                <NavLink to="/app/coach" className="ns-btn ns-btn-outline ns-btn-sm">
                  Ver detalle clínico
                </NavLink>
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
