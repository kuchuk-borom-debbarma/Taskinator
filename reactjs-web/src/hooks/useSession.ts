import { useEffect, useState } from 'react';
import { decodeToken } from '../lib/api';
import type { AuthUser } from '../types';

export function useSession() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('token');
    return saved ? decodeToken(saved) : null;
  });

  useEffect(() => {
    if (!token) return;
    setUser(decodeToken(token));
  }, [token]);

  const login = (nextToken: string) => {
    localStorage.setItem('token', nextToken);
    setToken(nextToken);
    setUser(decodeToken(nextToken));
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return { token, user, login, logout };
}

