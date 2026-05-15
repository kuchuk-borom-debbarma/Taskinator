import { projectService } from '../../project/index.ts';
import type { DomainContextResolver } from './ContextService';

export class ProjectContextResolver implements DomainContextResolver {
    async resolve(id: string): Promise<Record<string, any> | null> {
        const projects = await projectService.getProjectsByIds([id]);
        return projects[0] ?? null;
    }
}
