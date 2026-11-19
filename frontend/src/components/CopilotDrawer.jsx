import React from 'react';
import FormattedText from './FormattedText';
import HealthDisclaimer from './HealthDisclaimer';

export default function CopilotDrawer({
  copilotOpen,
  onToggleOpen,
  activeSection,
  countryName,
  copilotInput,
  onChangeInput,
  copilotReply,
  isCopilotLoading,
  onAsk,
  onNavigate
}) {
  const contextualActions =
    activeSection === 'meals'
      ? [
          {
            label: 'Evaluar si mis platos hoy cumplen mis objetivos de salud',
            q: 'Evalúa si mis comidas registradas hoy cumplen mis protocolos médicos y mi meta de proteína.'
          },
          {
            label: `Alternativa más económica en ${countryName}`,
            q: `Dame una alternativa de plato saludable y económica usando la productividad alimenticia de ${countryName}.`
          }
        ]
      : activeSection === 'documents'
        ? [
            {
              label: 'Revisar mis planes guardados para hoy',
              q: 'Cruza mis documentos guardados con las guías médicas y dime qué priorizar hoy.'
            }
          ]
        : activeSection === 'profile'
          ? [
              {
                label: 'Explicar mi TMB, GET y metabolismo',
                q: 'Explícame mi TMB, GET y cómo manejar mi tipo de metabolismo en mi proceso diario.'
              }
            ]
          : [
              {
                label: `¿Qué comer ahora en ${countryName}?`,
                q: `Según mi país (${countryName}), mi metabolismo y lo que me falta hoy, ¿qué comida me recomiendas ahora?`
              },
              {
                label: 'Revisar mi evolución y consejos de hoy',
                q: 'Revisa mi evolución de peso, promedio de comidas y condiciones médicas para darme el siguiente paso hoy.'
              }
            ];

  return (
    <>
      {copilotOpen && (
        <aside className="copilot-drawer" role="dialog" aria-label="Asistente Nutricional">
          <div className="copilot-header">
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                Tu Asistente Nutricional · {countryName}
              </div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Listo para ayudarte en tu alimentación hoy
              </div>
            </div>
            <button
              type="button"
              className="btn-ghost"
              aria-label="Cerrar asistente"
              style={{ padding: '4px 8px' }}
              onClick={() => onToggleOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="copilot-body">
            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
              Acciones rápidas para donde estás ahora:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {contextualActions.map(act => (
                <button
                  key={act.label}
                  type="button"
                  className="btn-outline"
                  style={{ textAlign: 'left', fontSize: '0.78rem', padding: '7px 10px' }}
                  onClick={() => onAsk(act.q)}
                  disabled={isCopilotLoading}
                >
                  {act.label}
                </button>
              ))}
            </div>

            {isCopilotLoading && (
              <div className="copilot-reply">Preparando tu recomendación personalizada…</div>
            )}

            {copilotReply && !isCopilotLoading && (
              <div className="copilot-reply">
                <FormattedText text={copilotReply.answer} />
                <HealthDisclaimer compact />
              </div>
            )}

            <div className="copilot-nav-chips">
              <button
                type="button"
                className="copilot-chip"
                onClick={() => {
                  onNavigate('meals');
                  onToggleOpen(false);
                }}
              >
                Ir a Comidas
              </button>
              <button
                type="button"
                className="copilot-chip"
                onClick={() => {
                  onNavigate('analytics');
                  onToggleOpen(false);
                }}
              >
                Mi Salud y Exámenes
              </button>
              <button
                type="button"
                className="copilot-chip"
                onClick={() => {
                  onNavigate('documents');
                  onToggleOpen(false);
                }}
              >
                Mis Planes y Guías
              </button>
              <button
                type="button"
                className="copilot-chip"
                onClick={() => {
                  onNavigate('profile');
                  onToggleOpen(false);
                }}
              >
                Mi Perfil y Metas
              </button>
            </div>
          </div>

          <form
            className="copilot-footer"
            onSubmit={e => {
              e.preventDefault();
              onAsk();
            }}
          >
            <input
              type="text"
              className="input-clean"
              aria-label="Escribe tu consulta nutricional"
              style={{ fontSize: '0.8rem', padding: '8px 10px' }}
              placeholder="Pregúntale a tu asistente…"
              value={copilotInput}
              onChange={e => onChangeInput(e.target.value)}
            />
            <button type="submit" className="btn-solid" disabled={isCopilotLoading}>
              Enviar
            </button>
          </form>
        </aside>
      )}

      <button
        type="button"
        className="copilot-fab"
        aria-expanded={copilotOpen}
        onClick={() => onToggleOpen(prev => !prev)}
      >
        <span>{copilotOpen ? 'Cerrar Asistente' : 'Asistente IA'}</span>
      </button>
    </>
  );
}
