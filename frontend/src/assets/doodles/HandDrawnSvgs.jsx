import React from 'react';

export function HandUnderline({ color = '#D95D24', className = '', style = {} }) {
  return (
    <svg
      viewBox="0 0 220 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      style={{ width: '100%', height: '12px', display: 'block', ...style }}
    >
      <path
        d="M3 11.5C52 4.2 143 2.8 217 9.5C168 12.2 84 11.8 18 14"
        stroke={color}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HandArrow({ color = '#8C5A3C', className = '', style = {} }) {
  return (
    <svg
      viewBox="0 0 68 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      style={{ width: '54px', height: '28px', ...style }}
    >
      <path
        d="M4 22C18 8 39 7 58 17M58 17L47 9M58 17L46 25"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HandLeafIcon({ size = 22, color = 'currentColor', style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={style}
    >
      <path
        d="M19.5 4.5C13 4.5 6.5 7.8 5.2 14.5C4.8 16.5 5.4 18.4 6.5 19.5C7.6 20.6 9.5 21.2 11.5 20.8C18.2 19.5 20.5 13 19.5 4.5Z"
        stroke={color}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 19.5C9.5 15.5 13.2 12.2 17.5 8.5"
        stroke={color}
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function HandBowlIllustration({ size = 84, color = '#1E5631', accent = '#D95D24' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="48" cy="48" r="42" fill="#F3ECE1" />
      <path
        d="M22 48H74C73 64 62 74 48 74C34 74 23 64 22 48Z"
        fill="#FFFFFF"
        stroke={color}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M34 74H62"
        stroke={color}
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M35 36C35 31 38 28 38 23M48 35C48 30 51 27 51 22M60 36C60 31 63 28 63 23"
        stroke={accent}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="38" cy="44" r="5" fill={accent} opacity="0.85" />
      <circle cx="50" cy="43" r="6" fill={color} opacity="0.85" />
      <circle cx="61" cy="45" r="4.5" fill="#E6A145" />
    </svg>
  );
}
