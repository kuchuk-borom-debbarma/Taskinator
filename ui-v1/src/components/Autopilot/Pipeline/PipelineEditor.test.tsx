import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PipelineEditor } from './PipelineEditor';
import type { PipelineStep } from '../../../gql/graphql';

vi.mock('../Builder/ConditionBuilderCanvas', () => ({
  ConditionBuilderCanvas: () => <div data-testid="condition-builder-canvas" />,
}));

describe('PipelineEditor', () => {
  const mockPipeline: PipelineStep[] = [
    {
      __typename: 'AutopilotAction',
      id: 'action-1',
      type: 'task.update_status',
      config: { status: 'DONE' },
      position: 1,
    } as any,
    {
      __typename: 'AutopilotCondition',
      id: 'cond-1',
      name: 'Check Priority',
      definition: {
        __typename: 'PredicateNode',
        domain: 'task',
        field: 'priority',
        operator: '>',
        value: 1,
      },
    },
  ];

  it('renders both actions and conditions', () => {
    render(<PipelineEditor pipeline={mockPipeline} onChange={vi.fn()} />);
    
    expect(screen.getByText('Set Field Value')).toBeInTheDocument();
    expect(screen.getByText('Check Priority')).toBeInTheDocument();
  });

  it('renders "Add Action" and "Add Condition" buttons', () => {
    render(<PipelineEditor pipeline={[]} onChange={vi.fn()} />);
    
    expect(screen.getByRole('button', { name: /add action/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add logic/i })).toBeInTheDocument();
  });

  it('calls onChange when an item is removed', () => {
    const onChange = vi.fn();
    render(<PipelineEditor pipeline={mockPipeline} onChange={onChange} />);
    
    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    fireEvent.click(removeButtons[0]);
    
    expect(onChange).toHaveBeenCalled();
    const updatedPipeline = onChange.mock.calls[0][0];
    expect(updatedPipeline).toHaveLength(1);
    expect(updatedPipeline[0].__typename).toBe('AutopilotCondition');
  });

  it('renders reorderable components', () => {
    render(<PipelineEditor pipeline={mockPipeline} onChange={vi.fn()} />);
    
    // Check for framer-motion reorder items (they usually have style/transform)
    // Alternatively, check for the presence of the cards within the container
    expect(screen.getByText('Set Field Value')).toBeInTheDocument();
    expect(screen.getByText('Check Priority')).toBeInTheDocument();
  });

  it('renders "Halt if false" indicator after conditions', () => {
    // Pipeline with condition followed by action
    const pipeline: PipelineStep[] = [
      {
        __typename: 'AutopilotCondition',
        id: 'cond-1',
        name: 'Check Priority',
        definition: { __typename: 'AndNode', children: [] },
      },
      {
        __typename: 'AutopilotAction',
        id: 'action-1',
        type: 'task.update_status',
        config: { status: 'DONE' },
        position: 2,
      } as any,
    ];

    render(<PipelineEditor pipeline={pipeline} onChange={vi.fn()} />);
    
    expect(screen.getByText(/halt if false/i)).toBeInTheDocument();
  });

  it('opens edit condition modal when Edit is clicked on a condition step', () => {
    render(<PipelineEditor pipeline={mockPipeline} onChange={vi.fn()} />);

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    // editButtons[0] is for the first step (Action)
    // editButtons[1] is for the second step (Condition)
    fireEvent.click(editButtons[1]);

    expect(screen.getByText('Edit: Check Priority')).toBeInTheDocument();
    expect(screen.getByTestId('condition-builder-canvas')).toBeInTheDocument();
  });
});
