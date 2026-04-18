import React, { useEffect } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import { ApiProvider } from './context/ApiContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function InnerApp() {
  const auth = useAuth();
  
  // Reactively invalidate the router context when authentication state changes
  // This triggers a re-evaluation of beforeLoad guards (e.g., redirecting to /auth after logout)
  useEffect(() => {
    router.invalidate();
  }, [auth.isAuthenticated]);

  return <RouterProvider router={router} context={{ auth }} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ApiProvider>
          <InnerApp />
        </ApiProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
