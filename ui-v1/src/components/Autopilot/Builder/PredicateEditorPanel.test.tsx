import { render, screen } from '@testing-library/react';
import { PredicateEditorPanel } from './PredicateEditorPanel';
import { AutopilotTriggerProvider } from '../AutopilotTriggerContext';
import { AutopilotMetadataProvider } from '../AutopilotMetadataContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

vi.mock('../../../hooks/useGraphQLClient', () => ({
  useGraphQLClient: () => ({
    request: vi.fn().mockResolvedValue({
      autopilotMetadata: {
        entities: [
          {
            type: 'task',
            fields: [
              { name: 'status', type: 'string', operators: ['==', '!='] },
              { name: 'priority', type: 'string', operators: ['==', '!='] }
            ]
          },
          {
            type: 'project',
            fields: [
              { name: 'name', type: 'string', operators: ['==', '!='] }
            ]
          }
        ]
      }
    })
  })
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <AutopilotTriggerProvider initialEntityType="task">
      <AutopilotMetadataProvider entityType="task">
        {children}
      </AutopilotMetadataProvider>
    </AutopilotTriggerProvider>
  </QueryClientProvider>
);

describe('PredicateEditorPanel', () => {
  const defaultProps = {
    nodeId: 'node-1',
    data: {
      domain: 'task',
      field: 'status',
      operator: '==',
      value: 'TODO'
    },
    onUpdate: vi.fn(),
    onRemove: vi.fn(),
    onClose: vi.fn()
  };

  it('renders domain locked to trigger entity context', async () => {
    render(<PredicateEditorPanel {...defaultProps} />, { wrapper });
    
    // Domain should be displayed as text "task", not a select
    expect(screen.getByText('task', { selector: 'div.capitalize' })).toBeInTheDocument();
  });

  it('populates fields based on entity', async () => {
    render(<PredicateEditorPanel {...defaultProps} />, { wrapper });
    
    const fieldSelect = screen.getByRole('combobox', { name: /Field/i });
    expect(fieldSelect).toBeInTheDocument();
    
    // Check initial fallback options
    expect(screen.getByRole('option', { name: 'Status' })).toBeInTheDocument();
  });
});
