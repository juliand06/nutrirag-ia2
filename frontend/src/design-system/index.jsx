import React from 'react';
import { DESIGN_TOKENS } from './tokens';

export { DESIGN_TOKENS };

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  onClick,
  disabled = false,
  className = '',
  style = {},
  ...rest
}) {
  const variantClass =
    variant === 'warm' || variant === 'carrot'
      ? 'ns-btn ns-btn-carrot'
      : variant === 'secondary' || variant === 'outline'
        ? 'ns-btn ns-btn-outline'
        : variant === 'ghost'
          ? 'ns-btn ns-btn-ghost'
          : 'ns-btn ns-btn-leaf';

  const sizeClass =
    size === 'lg' ? 'ns-btn-lg' : size === 'sm' ? 'ns-btn-sm' : 'ns-btn-md';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${variantClass} ${sizeClass} ${className}`.trim()}
      style={style}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  warm = false,
  sage = false,
  organic = false,
  className = '',
  style = {},
  ...rest
}) {
  const toneClass = warm ? 'ns-card-warm' : sage ? 'ns-card-sage' : '';
  const shapeClass = organic ? 'ns-card-organic' : '';
  return (
    <div
      className={`ns-card ${toneClass} ${shapeClass} ${className}`.trim()}
      style={style}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Chip({
  children,
  active = false,
  tone = 'leaf',
  onClick,
  className = '',
  style = {},
  ...rest
}) {
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`ns-chip ${active ? 'ns-chip-active' : ''} ns-chip-${tone} ${className}`.trim()}
      style={style}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function Toast({ message, tone = 'emerald', onClose }) {
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`ns-toast ns-toast-${tone}`}
    >
      <span>{message}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="ns-toast-close"
          aria-label="Cerrar notificación"
        >
          ×
        </button>
      )}
    </div>
  );
}

export function Skeleton({ height = '18px', width = '100%', radius = '10px', style = {} }) {
  return (
    <div
      aria-hidden="true"
      className="ns-skeleton"
      style={{ height, width, borderRadius: radius, ...style }}
    />
  );
}
