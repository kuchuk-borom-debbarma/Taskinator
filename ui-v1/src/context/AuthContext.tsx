import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

interface AuthUser {
  id: string;
  username: string;
  email: string;
}

export interface AuthContextType {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const GRAPHQL_URL = 'http://localhost:3000/graphql';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('taskinator_token'));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = async (authToken: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          query: `query GetMe { me { id username email } }`,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`[Auth] fetchMe failed with status ${response.status}:`, text);
        logout();
        return;
      }

      const result = await response.json();
      if (result.data?.me) {
        setUser(result.data.me);
      } else {
        if (result.errors?.[0]?.extensions?.code === 'UNAUTHENTICATED') {
          console.warn('[Auth] Session invalid or expired');
        }
        logout();
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchMe(token);
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = (newToken: string) => {
    localStorage.setItem('taskinator_token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('taskinator_token');
    setToken(null);
    setUser(null);
  };

  const value = useMemo(() => ({
    token,
    user,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    logout,
  }), [token, user, isLoading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
