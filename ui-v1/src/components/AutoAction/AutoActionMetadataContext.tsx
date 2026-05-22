import React, { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGraphQLClient } from '../../hooks/useGraphQLClient';
import { graphql } from '../../gql';

// ─── GraphQL Operations ──────────────────────────────────────────────────────

export const GET_AUTO_ACTION_TEMPLATE = graphql(`
  query GetAutoActionTemplate($scope: String!, $isSync: Boolean) {
    autoActionTemplate(scope: $scope, isSync: $isSync) {
      triggers {
        type
        name
        description
        scope
      }
      contextFields
      actions {
        id
        name
        description
        isSync
        scope
        inputSchema
      }
      conditions {
        type
        name
        description
        isSync
        scope
        schema
      }
    }
  }
`);

// ─── Context Definition ──────────────────────────────────────────────────────

interface MetadataState {
  template: any | null;
  isLoading: boolean;
  error: Error | null;
}


const AutoActionMetadataContext = createContext<MetadataState | undefined>(undefined);

export const useAutoActionMetadata = () => {
  const context = useContext(AutoActionMetadataContext);
  if (!context) {
    throw new Error('useAutoActionMetadata must be used within an AutoActionMetadataProvider');
  }
  return context;
};

// Helper to get formatted context fields for a specific domain
export const useAutoActionFields = () => {
  const { template } = useAutoActionMetadata();
  return useMemo(() => {
    if (!template?.contextFields) return [];
    return template.contextFields.map((field: string) => ({
      value: field,
      label: field.split('.').pop()?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || field,
    }));
  }, [template]);
};

// Helper to get available triggers
export const useAutoActionTriggers = () => {
  const { template } = useAutoActionMetadata();
  return template?.triggers || [];
};

// Helper to get available conditions
export const useAutoActionConditions = () => {
  const { template } = useAutoActionMetadata();
  return template?.conditions || [];
};

// ─── Provider Component ──────────────────────────────────────────────────────

interface ProviderProps {
  children: React.ReactNode;
  entityType?: string; // default to 'task' if not provided
}

export const AutoActionMetadataProvider: React.FC<ProviderProps> = ({ 
  children, 
  entityType = 'TASK' 
}) => {
  const { request } = useGraphQLClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['autoAction-template', entityType.toUpperCase()],
    queryFn: () => request(GET_AUTO_ACTION_TEMPLATE, { scope: entityType.toUpperCase() }),
    staleTime: 1000 * 60 * 60, // 1 hour - metadata is fairly static
  });

  const template = data?.autoActionTemplate ?? null;

  const value = useMemo(() => ({
    template,
    isLoading,
    error: error as Error | null,
  }), [template, isLoading, error]);

  return (
    <AutoActionMetadataContext.Provider value={value}>
      {children}
    </AutoActionMetadataContext.Provider>
  );
};
