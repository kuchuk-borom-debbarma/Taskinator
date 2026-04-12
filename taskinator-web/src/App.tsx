import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Auth } from './components/Auth';
import { Workspace } from './features/workspace/Workspace';
import type { JWTPayload } from './types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  const [user, setUser] = useState<JWTPayload | null>(() => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload;
    } catch {
      return null;
    }
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen w-screen bg-background text-foreground overflow-hidden">
        {!user ? (
          <Auth onLogin={setUser} />
        ) : (
          <Workspace user={user} onLogout={handleLogout} />
        )}
      </div>
    </QueryClientProvider>
  );
}

export default App;
