import { create } from 'zustand';

interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useThemeStore = create<ThemeState>((set) => {
  const getInitialTheme = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem('theme') || localStorage.getItem('opensooq_theme');
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  };

  const initialTheme = getInitialTheme();
  
  // Apply class on load
  if (typeof window !== 'undefined') {
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  return {
    theme: initialTheme,
    setTheme: (theme) => {
      set({ theme });
      localStorage.setItem('theme', theme);
      localStorage.setItem('opensooq_theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },
    toggleTheme: () => {
      set((state) => {
        const nextTheme = state.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', nextTheme);
        localStorage.setItem('opensooq_theme', nextTheme);
        if (nextTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        return { theme: nextTheme };
      });
    },
  };
});
