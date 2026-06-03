import { traceService } from '../../infra/tracing/index.ts';
import { ProjectServiceImpl } from './internal/ProjectServiceImpl.ts';
import type { Project, ProjectMember } from './ProjectService.ts';

export interface BaseService {
    init(): Promise<void>;
    destroy(): Promise<void>;
}

export const projectService = traceService(
    'ProjectService',
    new ProjectServiceImpl(),
);
export type { Project, ProjectMember };
