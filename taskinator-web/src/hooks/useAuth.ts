import { create } from 'zustand';
import type { JWTPayload } from '../types';

interface AuthState {
  user: JWTPayload | null;
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: JWTPayload | null, token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: (() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  })(),
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  isAuthenticated: !!(typeof window !== 'undefined' ? localStorage.getItem('token') : null),
  setUser: (user, token) => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
    set({ user, token, isAuthenticated: !!token });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));

export const useAuth = () => {
  const { user, token, setUser, logout } = useAuthStore();
  
  const login = (newToken: string) => {
    try {
      const payload = JSON.parse(atob(newToken.split('.')[1]));
      setUser(payload, newToken);
    } catch {
      setUser(null, null);
    }
  };

  return { user, token, login, logout, isAuthenticated: !!user };
};
