import { create } from 'zustand';

export const useNutriStore = create(set => ({
  themeMode: typeof window !== 'undefined' ? localStorage.getItem('nutristudio_theme') || 'light' : 'light',
  copilotOpen: false,
  backendOnline: false,

  toggleThemeMode: () =>
    set(state => {
      const next = state.themeMode === 'dark' ? 'light' : 'dark';
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('nutristudio_theme', next);
      }
      return { themeMode: next };
    }),

  setCopilotOpen: (val) =>
    set(state => ({
      copilotOpen: typeof val === 'function' ? val(state.copilotOpen) : Boolean(val)
    })),

  setBackendOnline: (online) => set({ backendOnline: Boolean(online) })
}));
