import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AutopilotDashboardView } from './AutopilotDashboardView';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the dependencies
vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ projectId: 'test-project' }),
}));

vi.mock('../../hooks/useGraphQLClient', () => ({
  useGraphQLClient: () => ({
    request: vi.fn().mockResolvedValue({
      autopilots: { edges: [], totalCount: 0 },
      autopilotMetadata: { entities: [] }
    }),
  }),
}));

vi.mock('./AutopilotList', () => ({
  AutopilotList: () => <div data-testid="autopilot-list" />,
}));

vi.mock('./CreateAutopilotModal', () => ({
  CreateAutopilotModal: () => <div data-testid="create-modal" />,
}));

describe('AutopilotDashboardView', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  it('renders without crashing', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AutopilotDashboardView />
      </QueryClientProvider>
    );

    expect(screen.getByText('Autopilot')).toBeDefined();
  });
});
