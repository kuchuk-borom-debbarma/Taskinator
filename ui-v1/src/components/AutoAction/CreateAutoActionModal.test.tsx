import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateAutoActionModal } from './CreateAutoActionModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AutoActionMetadataProvider } from './AutoActionMetadataContext';
import { vi } from 'vitest';
import { useGraphQLClient } from '../../hooks/useGraphQLClient';

// Mock useGraphQLClient
vi.mock('../../hooks/useGraphQLClient', () => ({
  useGraphQLClient: vi.fn()
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
    <AutoActionMetadataProvider>
      {children}
    </AutoActionMetadataProvider>
  </QueryClientProvider>
);

describe('CreateAutoActionModal', () => {
  beforeEach(() => {
    vi.mocked(useGraphQLClient).mockReturnValue({
      request: vi.fn().mockResolvedValue({
        autoActionMetadata: { entities: [] }
      })
    } as any);
  });

  it('renders trigger selection as step 1', () => {
    render(
      <CreateAutoActionModal
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
      <CreateAutoActionModal
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

  it('integration: serializes final pipeline payload to match CreateAutoActionInput', async () => {
    const mockRequest = vi.fn().mockResolvedValue({
      createAutoAction: { id: 'auto-1', isActive: true, triggers: [] }
    });
    vi.mocked(useGraphQLClient).mockReturnValue({
      request: mockRequest
    } as any);

    render(
      <CreateAutoActionModal
        open={true}
        onClose={() => {}}
        projectId="test-project"
      />,
      { wrapper }
    );

    // Step 1: Trigger
    fireEvent.click(screen.getByText(/Task Created/i));
    fireEvent.click(screen.getByText(/Continue/i));

    // Step 2: Pipeline
    // By default it has an initial condition.
    expect(screen.getByText(/Build Action Pipeline/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Continue/i));

    // Step 3: Review
    expect(screen.getByText(/Review Rule Configuration/i)).toBeInTheDocument();
    
    // Create AutoAction
    fireEvent.click(screen.getByText(/Activate AutoAction/i));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          input: {
            projectId: 'test-project',
            triggers: ['task.created'],
            pipeline: [
              {
                condition: {
                  name: 'Main Filter',
                  definition: {
                    predicate: {
                      domain: 'task',
                      field: 'status',
                      operator: 'eq',
                      value: 'TODO',
                    },
                  }
                }
              }
            ]
          }
        })
      );
    });
  });
});
