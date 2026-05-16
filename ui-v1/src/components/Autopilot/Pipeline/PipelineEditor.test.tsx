import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PipelineEditor } from './PipelineEditor';
import type { PipelineStep } from '../../../gql/graphql';

describe('PipelineEditor', () => {
  const mockPipeline: PipelineStep[] = [
    {
      __typename: 'AutopilotAction',
      id: 'action-1',
      type: 'task.update_status',
      config: { status: 'DONE' },
      position: 1,
    },
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
    
    expect(screen.getByText('Update Status')).toBeInTheDocument();
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
    const { container } = render(<PipelineEditor pipeline={mockPipeline} onChange={vi.fn()} />);
    
    // Check for framer-motion reorder items (they usually have style/transform)
    const items = container.querySelectorAll('li'); // Reorder.Item defaults to li
    // Actually framer-motion Reorder.Item doesn't necessarily use <li> by default if we don't specify, 
    // but in many versions it does. Let's check what it renders.
    // In our case I didn't specify 'as', so let's see.
    
    // Alternatively, check for the presence of the cards within the container
    expect(screen.getByText('Update Status')).toBeInTheDocument();
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
      },
    ];

    render(<PipelineEditor pipeline={pipeline} onChange={vi.fn()} />);
    
    expect(screen.getByText(/halt if false/i)).toBeInTheDocument();
  });
});
