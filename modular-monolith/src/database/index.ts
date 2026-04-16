import type { ProjectMemberTable, ProjectTable } from './tables/Project.ts';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type {
    ProjectTeamTable,
    ProjectTeamMemberTable,
} from './tables/ProjectTeam.ts';
import type { AutomationsTable } from './tables/Automation.ts';
import type { ProcessedEventTable } from './tables/ProcessedEvent.ts';
import type { UserTable, PendingUserTable } from './tables/User.ts';
import type { OutboxEventTable } from './tables/OutboxEvent.ts';
import type { ProjectTaskTable } from './tables/ProjectTask.ts';
import type { TaskLinkTable } from './tables/TaskLink.ts';
import type { TaskReachabilityTable } from './tables/TaskReachability.ts';

export interface Database {
    project: ProjectTable;
    project_member: ProjectMemberTable;
    project_team: ProjectTeamTable;
    project_team_member: ProjectTeamMemberTable;
    project_task: ProjectTaskTable;
    task_link: TaskLinkTable;
    task_reachability: TaskReachabilityTable;
    automations: AutomationsTable;
    processed_event: ProcessedEventTable;
    users: UserTable;
    pending_users: PendingUserTable;
    outbox_events: OutboxEventTable;
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
