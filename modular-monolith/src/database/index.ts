import type { ProjectMemberTable, ProjectTable } from './tables/Project.ts';

export interface Database {
    project: ProjectTable;
    projectMember: ProjectMemberTable;
}
