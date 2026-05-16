import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AutopilotMetadataProvider, useAutopilotMetadata } from './AutopilotMetadataContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock useGraphQLClient
vi.mock('../../hooks/useGraphQLClient', () => ({
  useGraphQLClient: vi.fn(() => ({
    request: vi.fn(async () => ({
      autopilotMetadata: {
        entities: [
          {
            type: 'task',
            fields: [
              { name: 'status', type: 'string', operators: ['eq', 'neq'] }
            ],
            actions: [
              { type: 'set', parameters: {} }
            ]
          }
        ]
      }
    }))
  }))
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
    <AutopilotMetadataProvider entityType="task">
      {children}
    </AutopilotMetadataProvider>
  </QueryClientProvider>
);

describe('AutopilotMetadataContext', () => {
  it('provides metadata after fetching', async () => {
    const { result } = renderHook(() => useAutopilotMetadata(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.metadata).not.toBeNull();
    expect(result.current.getFieldsForEntity('task')).toHaveLength(1);
    expect(result.current.getFieldsForEntity('task')[0].name).toBe('status');
  });

  it('returns empty array for unknown entity', async () => {
    const { result } = renderHook(() => useAutopilotMetadata(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.getFieldsForEntity('unknown')).toHaveLength(0);
  });
});
