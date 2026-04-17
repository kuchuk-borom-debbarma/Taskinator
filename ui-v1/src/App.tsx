import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import { ApiProvider } from './context/ApiContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from './context/AuthContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ApiProvider>
          <RouterProvider router={router} />
        </ApiProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
