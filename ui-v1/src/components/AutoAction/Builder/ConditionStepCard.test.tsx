import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConditionStepCard } from './ConditionStepCard';
import type { AutoActionCondition } from '../../../gql/graphql';

describe('ConditionStepCard', () => {
  const mockCondition: AutoActionCondition = {
    id: 'cond-1',
    name: 'Check Status',
    definition: {
      __typename: 'AndNode',
      children: [
        {
          __typename: 'PredicateNode',
          domain: 'task',
          field: 'status',
          operator: '==',
          value: 'DONE',
        },
      ],
    },
  };

  it('renders condition name or default label', () => {
    render(<ConditionStepCard condition={mockCondition} index={0} />);
    expect(screen.getByText('Check Status')).toBeInTheDocument();
  });

  it('renders "Condition" if name is missing', () => {
    const unnamed = { ...mockCondition, name: undefined };
    render(<ConditionStepCard condition={unnamed as any} index={0} />);
    expect(screen.getByText('Logic Block')).toBeInTheDocument();
  });

  it('calls onEdit when Edit button is clicked', () => {
    const onEdit = vi.fn();
    render(<ConditionStepCard condition={mockCondition} index={0} onEdit={onEdit} />);
    
    screen.getByRole('button', { name: /edit/i }).click();
    expect(onEdit).toHaveBeenCalledWith(0);
  });

  it('calls onRemove when Remove button is clicked', () => {
    const onRemove = vi.fn();
    render(<ConditionStepCard condition={mockCondition} index={0} onRemove={onRemove} />);
    
    screen.getByRole('button', { name: /remove/i }).click();
    expect(onRemove).toHaveBeenCalledWith(0);
  });
});
