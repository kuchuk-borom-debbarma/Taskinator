import React, { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGraphQLClient } from '../../hooks/useGraphQLClient';
import { graphql } from '../../gql';
import type { AutopilotMetadata, AutopilotEntityMetadata } from '../../gql/graphql';

// ─── GraphQL Operations ──────────────────────────────────────────────────────

export const GET_AUTOPILOT_METADATA = graphql(`
  query GetAutopilotMetadata($entityType: String!) {
    autopilotMetadata(entityType: $entityType) {
      entities {
        type
        fields {
          name
          type
          operators
        }
        actions {
          type
          parameters
        }
      }
    }
  }
`);

// ─── Context Definition ──────────────────────────────────────────────────────

interface MetadataState {
  metadata: AutopilotMetadata | null;
  isLoading: boolean;
  error: Error | null;
  getFieldsForEntity: (type: string) => AutopilotEntityMetadata['fields'];
  getActionsForEntity: (type: string) => AutopilotEntityMetadata['actions'];
}

const AutopilotMetadataContext = createContext<MetadataState | undefined>(undefined);

export const useAutopilotMetadata = () => {
  const context = useContext(AutopilotMetadataContext);
  if (!context) {
    throw new Error('useAutopilotMetadata must be used within an AutopilotMetadataProvider');
  }
  return context;
};

// ─── Provider Component ──────────────────────────────────────────────────────

interface ProviderProps {
  children: React.ReactNode;
  entityType?: string; // default to 'task' if not provided
}

export const AutopilotMetadataProvider: React.FC<ProviderProps> = ({ 
  children, 
  entityType = 'task' 
}) => {
  const { request } = useGraphQLClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['autopilot-metadata', entityType],
    queryFn: () => request(GET_AUTOPILOT_METADATA, { entityType }),
    staleTime: 1000 * 60 * 60, // 1 hour - metadata is fairly static
  });

  const metadata = data?.autopilotMetadata ?? null;

  const value = useMemo(() => ({
    metadata,
    isLoading,
    error: error as Error | null,
    getFieldsForEntity: (type: string) => {
      const entity = metadata?.entities.find(e => e.type === type);
      return entity?.fields ?? [];
    },
    getActionsForEntity: (type: string) => {
      const entity = metadata?.entities.find(e => e.type === type);
      return entity?.actions ?? [];
    }
  }), [metadata, isLoading, error]);

  return (
    <AutopilotMetadataContext.Provider value={value}>
      {children}
    </AutopilotMetadataContext.Provider>
  );
};
