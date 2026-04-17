import React, { createContext, useContext, useMemo } from 'react';
import type { ProjectAPI } from '../api/interfaces/ProjectAPI';
import type { TaskAPI } from '../api/interfaces/TaskAPI';
import type { TeamAPI } from '../api/interfaces/TeamAPI';
import { GraphQLProjectAPI } from '../api/adapters/graphql/GraphQLProjectAPI';
import { GraphQLTeamAPI } from '../api/adapters/graphql/GraphQLTeamAPI';
import { GraphQLTaskAPI } from '../api/adapters/graphql/GraphQLTaskAPI';
import { useAuth } from './AuthContext';

interface ApiContextType {
  projectApi: ProjectAPI;
  taskApi: TaskAPI;
  teamApi: TeamAPI;
}

const ApiContext = createContext<ApiContextType | null>(null);

export const ApiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  
  const apis = useMemo(() => ({
    projectApi: new GraphQLProjectAPI(token),
    taskApi: new GraphQLTaskAPI(token),
    teamApi: new GraphQLTeamAPI(token),
  }), [token]);

  return (
    <ApiContext.Provider value={apis}>
      {children}
    </ApiContext.Provider>
  );
};

export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};
