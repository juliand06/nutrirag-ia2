import React, { useEffect } from 'react';

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  children,
  ...props
}) {
  const variantClass =
    variant === 'warm'
      ? 'ds-btn-warm'
      : variant === 'outline'
        ? 'btn-outline'
        : variant === 'ghost'
          ? 'btn-ghost'
          : 'btn-solid';
  const sizeClass = size === 'sm' ? 'ds-btn-sm' : size === 'lg' ? 'ds-btn-lg' : '';
  return (
    <button
      type={type}
      className={`${variantClass} ${sizeClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({
  elevated = true,
  warm = false,
  className = '',
  style,
  children,
  ...props
}) {
  return (
    <div
      className={`card ${elevated ? 'ds-card-elevated' : ''} ${warm ? 'ds-card-warm' : ''} ${className}`.trim()}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
}

export function Chip({
  active = false,
  tone = 'emerald',
  className = '',
  children,
  ...props
}) {
  const activeClass = active
    ? tone === 'warm'
      ? 'ds-chip-warm-active'
      : 'ds-chip-active'
    : '';
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`copilot-chip ${activeClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

export function Sheet({ open, onClose, title, subtitle, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="ds-sheet-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="ds-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Panel de acción'}
      >
        <div className="ds-sheet-handle" aria-hidden="true" />
        <div className="ds-sheet-head">
          <div>
            {title && <h3 className="ds-sheet-title">{title}</h3>}
            {subtitle && <p className="ds-sheet-subtitle">{subtitle}</p>}
          </div>
          <button
            type="button"
            className="btn-ghost"
            aria-label="Cerrar panel"
            onClick={onClose}
            style={{ padding: '6px 10px' }}
          >
            ✕
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

export function Toast({ message, tone = 'emerald', onDismiss }) {
  if (!message) return null;
  return (
    <div
      className={`ds-toast ${tone === 'warm' ? 'ds-toast-warm' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span>{message}</span>
      {onDismiss && (
        <button
          type="button"
          className="ds-toast-close"
          aria-label="Cerrar aviso"
          onClick={onDismiss}
        >
          ✕
        </button>
      )}
    </div>
  );
}

export function Skeleton({ width = '100%', height = '18px', borderRadius = '10px', style = {} }) {
  return (
    <div
      className="ds-skeleton"
      aria-hidden="true"
      style={{ width, height, borderRadius, ...style }}
    />
  );
}

export { DESIGN_TOKENS } from './tokens';
