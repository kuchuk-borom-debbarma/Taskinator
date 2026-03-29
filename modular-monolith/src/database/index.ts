import type { ProjectMemberTable, ProjectTable } from './tables/Project.ts';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type {
    ProjectTeamTable,
    ProjectTeamMemberTable,
} from './tables/ProjectTeam.ts';
import type {
    ProjectTaskTable,
    ProjectTaskTriggerTable,
} from './tables/Task.ts';
import type { ProcessedEventTable } from './tables/ProcessedEvent.ts';

export interface Database {
    project: ProjectTable;
    project_member: ProjectMemberTable;
    project_team: ProjectTeamTable;
    project_team_member: ProjectTeamMemberTable;
    project_task: ProjectTaskTable;
    project_task_trigger_table: ProjectTaskTriggerTable;
    processed_event: ProcessedEventTable;
}

const dialect = new PostgresDialect({
    pool: new Pool({
        database: 'test',
        host: 'localhost',
        user: 'admin',
        password: 'password',
        port: 5434,
        max: 10,
    }),
});

export const db = new Kysely<Database>({
    dialect,
});
