import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AutopilotTriggerProvider, useAutopilotTrigger } from './AutopilotTriggerContext';
import React from 'react';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AutopilotTriggerProvider initialEntityType="task">
    {children}
  </AutopilotTriggerProvider>
);

describe('AutopilotTriggerContext', () => {
  it('tracks selectedEntityType', () => {
    const { result } = renderHook(() => useAutopilotTrigger(), { wrapper });

    expect(result.current.selectedEntityType).toBe('task');

    act(() => {
      result.current.setSelectedEntityType('project');
    });

    expect(result.current.selectedEntityType).toBe('project');
  });
});
