import { create } from 'zustand';

interface User {
  name: string;
  phone: string;
  email?: string;
}

interface AuthState {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Initial load from localStorage
  const getInitialUser = (): User | null => {
    const saved = localStorage.getItem('opensooq_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  };

  return {
    currentUser: getInitialUser(),
    setCurrentUser: (user) => {
      set({ currentUser: user });
      if (user) {
        localStorage.setItem('opensooq_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('opensooq_user');
      }
    },
    logout: () => {
      set({ currentUser: null });
      localStorage.removeItem('opensooq_user');
    }
  };
});
