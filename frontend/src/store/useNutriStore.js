import { create } from 'zustand';
import i18n from '../i18n';

export const useNutriStore = create(set => ({
  themeMode: typeof window !== 'undefined' ? localStorage.getItem('nutristudio_theme') || 'light' : 'light',
  language: typeof window !== 'undefined' ? localStorage.getItem('nutristudio_lang') || 'es' : 'es',
  unitSystem: typeof window !== 'undefined' ? localStorage.getItem('nutristudio_units') || 'metric' : 'metric',
  copilotOpen: false,
  quickAddOpen: false,
  backendOnline: false,
  toast: null,

  toggleThemeMode: () =>
    set(state => {
      const next = state.themeMode === 'dark' ? 'light' : 'dark';
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('nutristudio_theme', next);
      }
      return { themeMode: next };
    }),

  setLanguage: (lang) =>
    set(() => {
      const safe = lang === 'en' ? 'en' : 'es';
      if (typeof window !== 'undefined') {
        localStorage.setItem('nutristudio_lang', safe);
      }
      i18n.changeLanguage(safe);
      return { language: safe };
    }),

  toggleUnitSystem: () =>
    set(state => {
      const next = state.unitSystem === 'imperial' ? 'metric' : 'imperial';
      if (typeof window !== 'undefined') {
        localStorage.setItem('nutristudio_units', next);
      }
      return { unitSystem: next };
    }),

  setCopilotOpen: (val) =>
    set(state => ({
      copilotOpen: typeof val === 'function' ? val(state.copilotOpen) : Boolean(val)
    })),

  setQuickAddOpen: (val) =>
    set(state => ({
      quickAddOpen: typeof val === 'function' ? val(state.quickAddOpen) : Boolean(val)
    })),

  setBackendOnline: (online) => set({ backendOnline: Boolean(online) }),

  showToast: (message, tone = 'emerald') => set({ toast: { message, tone } }),
  clearToast: () => set({ toast: null })
}));
