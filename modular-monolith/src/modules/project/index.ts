import { ProjectServiceImpl } from './internal/ProjectServiceImpl.ts';
import type { Project, ProjectMember } from './ProjectService.ts';

export interface BaseService {
    init(): Promise<void>;
    destroy(): Promise<void>;
}

export const projectService = new ProjectServiceImpl();
export type { Project, ProjectMember };
