import React from 'react';

/**
 * Aviso sanitario obligatorio WCAG AA en todo texto de salud y nutrición.
 */
export default function HealthDisclaimer({ compact = false }) {
  return (
    <p
      role="note"
      aria-label="Aviso de orientación informativa"
      style={{
        fontSize: compact ? '0.72rem' : '0.76rem',
        color: 'var(--text-secondary)',
        marginTop: compact ? '6px' : '10px',
        padding: compact ? '6px 10px' : '8px 12px',
        borderRadius: '8px',
        background: 'var(--bg-subtle)',
        border: '1px solid var(--border)'
      }}
    >
      ⚕️ <strong>Aviso:</strong> Orientación informativa; no reemplaza a un profesional.
    </p>
  );
}
