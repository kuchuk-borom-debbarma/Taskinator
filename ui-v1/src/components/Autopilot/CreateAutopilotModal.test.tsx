import { render, screen, fireEvent } from '@testing-library/react';
import { CreateAutopilotModal } from './CreateAutopilotModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AutopilotMetadataProvider } from './AutopilotMetadataContext';
import { vi } from 'vitest';

// Mock useGraphQLClient
vi.mock('../../hooks/useGraphQLClient', () => ({
  useGraphQLClient: () => ({
    request: vi.fn().mockResolvedValue({
      autopilotMetadata: { entities: [] }
    })
  })
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <AutopilotMetadataProvider>
      {children}
    </AutopilotMetadataProvider>
  </QueryClientProvider>
);

describe('CreateAutopilotModal', () => {
  it('renders trigger selection as step 1', () => {
    render(
      <CreateAutopilotModal
        open={true}
        onClose={() => {}}
        projectId="test-project"
      />,
      { wrapper }
    );

    expect(screen.getByText(/Select when this rule should fire/i)).toBeInTheDocument();
  });

  it('advances to pipeline editor as step 2 after selecting a trigger', () => {
    render(
      <CreateAutopilotModal
        open={true}
        onClose={() => {}}
        projectId="test-project"
      />,
      { wrapper }
    );

    // Select "Task Created" trigger
    fireEvent.click(screen.getByText(/Task Created/i));
    
    // Click Continue
    fireEvent.click(screen.getByText(/Continue/i));

    // Should see Pipeline Editor content
    expect(screen.getByText(/Build Action Pipeline/i)).toBeInTheDocument();
  });
});
