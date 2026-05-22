import React, { createContext, useContext, useState, useMemo } from 'react';

// ─── Context Definition ──────────────────────────────────────────────────────

export type TriggerEntityType = 'task' | 'project' | 'team';

interface TriggerState {
  selectedEntityType: TriggerEntityType;
  setSelectedEntityType: (type: TriggerEntityType) => void;
}

const AutoActionTriggerContext = createContext<TriggerState | undefined>(undefined);

export const useAutoActionTrigger = () => {
  const context = useContext(AutoActionTriggerContext);
  if (!context) {
    throw new Error('useAutoActionTrigger must be used within an AutoActionTriggerProvider');
  }
  return context;
};

// ─── Provider Component ──────────────────────────────────────────────────────

interface ProviderProps {
  children: React.ReactNode;
  initialEntityType?: TriggerEntityType;
}

export const AutoActionTriggerProvider: React.FC<ProviderProps> = ({ 
  children,
  initialEntityType = 'task'
}) => {
  const [selectedEntityType, setSelectedEntityType] = useState<TriggerEntityType>(initialEntityType);

  const value = useMemo(() => ({
    selectedEntityType,
    setSelectedEntityType
  }), [selectedEntityType]);

  return (
    <AutoActionTriggerContext.Provider value={value}>
      {children}
    </AutoActionTriggerContext.Provider>
  );
};
