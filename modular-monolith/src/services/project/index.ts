import { ProjectServiceImpl } from './internal/ProjectServiceImpl.ts';

export interface BaseService {
    init(): Promise<void>;

    destroy(): Promise<void>;
}

export const projectService = new ProjectServiceImpl();
