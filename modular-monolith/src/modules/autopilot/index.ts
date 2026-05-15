import { ContextService } from './internal/ContextService';
import { ProjectContextResolver } from './internal/ProjectContextResolver';
import { TaskContextResolver } from './internal/TaskContextResolver';

export const contextService = new ContextService();

// Register Resolvers
contextService.registerResolver('task', new TaskContextResolver());
contextService.registerResolver('project', new ProjectContextResolver());

export { ContextService };
