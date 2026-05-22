import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AutoActionDashboardView } from './AutoActionDashboardView';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the dependencies
vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ projectId: 'test-project' }),
}));

vi.mock('../../hooks/useGraphQLClient', () => ({
  useGraphQLClient: () => ({
    request: vi.fn().mockResolvedValue({
      autoActions: { edges: [], totalCount: 0 },
      autoActionMetadata: { entities: [] }
    }),
  }),
}));

vi.mock('./AutoActionList', () => ({
  AutoActionList: () => <div data-testid="autoAction-list" />,
}));

vi.mock('./CreateAutoActionModal', () => ({
  CreateAutoActionModal: () => <div data-testid="create-modal" />,
}));

describe('AutoActionDashboardView', () => {
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
        <AutoActionDashboardView />
      </QueryClientProvider>
    );

    expect(screen.getByText('AutoAction')).toBeDefined();
  });
});
