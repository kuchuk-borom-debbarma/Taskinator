import React, { createContext, useContext, useMemo } from 'react';
import type { ProjectAPI } from '../api/interfaces/ProjectAPI';
import type { TaskAPI } from '../api/interfaces/TaskAPI';
import type { TeamAPI } from '../api/interfaces/TeamAPI';
import { DummyProjectAPI } from '../api/adapters/dummy/DummyProjectAPI';
import { DummyTeamAPI } from '../api/adapters/dummy/DummyTeamAPI';
import { GraphQLTaskAPI } from '../api/adapters/graphql/GraphQLTaskAPI';

interface ApiContextType {
  projectApi: ProjectAPI;
  taskApi: TaskAPI;
  teamApi: TeamAPI;
}

const ApiContext = createContext<ApiContextType | null>(null);

export const ApiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const apis = useMemo(() => ({
    projectApi: new DummyProjectAPI(),
    taskApi: new GraphQLTaskAPI(),
    teamApi: new DummyTeamAPI(),
  }), []);

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
