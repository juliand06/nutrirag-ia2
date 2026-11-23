// Sistema de Diseño Editorial de NutriStudio AI — Tokens Centralizados
// Paleta cálida hecha por humanos: verde hoja profundo (#1E5631), crema papel (#FAF6F0),
// naranja zanahoria (#D95D24) y tierra/canela (#8C5A3C). Cero brillos neón ni degradados morados.

export const DESIGN_TOKENS = {
  colors: {
    light: {
      bgCanvas: '#FAF6F0',
      bgSurface: '#FFFFFF',
      bgWarm: '#F3ECE1',
      bgSage: '#EBF2EC',
      border: '#E4DDD1',
      borderStrong: '#C8BFA8',
      textPrimary: '#1E261F',
      textSecondary: '#4A554C',
      textMuted: '#6A756C',
      leaf: '#1E5631',
      leafHover: '#164225',
      leafSoft: '#E3EFE6',
      carrot: '#D95D24',
      carrotHover: '#BA4B18',
      carrotSoft: '#FDF0E8',
      earth: '#8C5A3C',
      earthSoft: '#F5EBE4',
      // Compatibilidad con componentes existentes
      bgPage: '#FAF6F0',
      bgSubtle: '#F3ECE1',
      emerald: '#1E5631',
      emeraldHover: '#164225',
      emeraldSoft: '#E3EFE6',
      warmOrange: '#D95D24',
      warmOrangeBright: '#E56B32',
      warmSoft: '#FDF0E8',
      warmBorder: '#F2C9B3'
    },
    dark: {
      bgCanvas: '#141915',
      bgSurface: '#1C231E',
      bgWarm: '#232B24',
      bgSage: '#1E2A22',
      border: '#2E3830',
      borderStrong: '#425245',
      textPrimary: '#F4EFE6',
      textSecondary: '#C2CBC3',
      textMuted: '#8F9C91',
      leaf: '#4E9F68',
      leafHover: '#62B37C',
      leafSoft: '#1D3324',
      carrot: '#EB7A44',
      carrotHover: '#F28F5E',
      carrotSoft: 'rgba(235, 122, 68, 0.16)',
      earth: '#C49272',
      earthSoft: 'rgba(196, 146, 114, 0.16)',
      // Compatibilidad
      bgPage: '#141915',
      bgSubtle: '#232B24',
      emerald: '#4E9F68',
      emeraldHover: '#62B37C',
      emeraldSoft: '#1D3324',
      warmOrange: '#EB7A44',
      warmOrangeBright: '#F28F5E',
      warmSoft: 'rgba(235, 122, 68, 0.16)',
      warmBorder: 'rgba(235, 122, 68, 0.35)'
    }
  },
  typography: {
    display: "'Fraunces', Georgia, serif",
    heading: "'Fraunces', Georgia, serif",
    sans: "'DM Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '36px',
    xxl: '56px'
  },
  radii: {
    sm: '10px',
    md: '16px',
    lg: '22px',
    organicA: '26px 14px 24px 16px',
    organicB: '14px 26px 16px 24px',
    pill: '999px'
  },
  shadows: {
    card: '0 6px 22px rgba(30, 38, 31, 0.06)',
    hover: '0 12px 30px rgba(30, 86, 49, 0.11)',
    warm: '0 10px 26px rgba(217, 93, 36, 0.20)'
  }
};
