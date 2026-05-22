import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AutoActionTriggerProvider, useAutoActionTrigger } from './AutoActionTriggerContext';
import React from 'react';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AutoActionTriggerProvider initialEntityType="task">
    {children}
  </AutoActionTriggerProvider>
);

describe('AutoActionTriggerContext', () => {
  it('tracks selectedEntityType', () => {
    const { result } = renderHook(() => useAutoActionTrigger(), { wrapper });

    expect(result.current.selectedEntityType).toBe('task');

    act(() => {
      result.current.setSelectedEntityType('project');
    });

    expect(result.current.selectedEntityType).toBe('project');
  });
});
