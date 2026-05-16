import React, { createContext, useContext, useState, useMemo } from 'react';

// ─── Context Definition ──────────────────────────────────────────────────────

export type TriggerEntityType = 'task' | 'project' | 'team';

interface TriggerState {
  selectedEntityType: TriggerEntityType;
  setSelectedEntityType: (type: TriggerEntityType) => void;
}

const AutopilotTriggerContext = createContext<TriggerState | undefined>(undefined);

export const useAutopilotTrigger = () => {
  const context = useContext(AutopilotTriggerContext);
  if (!context) {
    throw new Error('useAutopilotTrigger must be used within an AutopilotTriggerProvider');
  }
  return context;
};

// ─── Provider Component ──────────────────────────────────────────────────────

interface ProviderProps {
  children: React.ReactNode;
  initialEntityType?: TriggerEntityType;
}

export const AutopilotTriggerProvider: React.FC<ProviderProps> = ({ 
  children,
  initialEntityType = 'task'
}) => {
  const [selectedEntityType, setSelectedEntityType] = useState<TriggerEntityType>(initialEntityType);

  const value = useMemo(() => ({
    selectedEntityType,
    setSelectedEntityType
  }), [selectedEntityType]);

  return (
    <AutopilotTriggerContext.Provider value={value}>
      {children}
    </AutopilotTriggerContext.Provider>
  );
};
