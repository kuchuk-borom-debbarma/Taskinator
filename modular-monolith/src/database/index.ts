import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { logger } from '../logger';
import type { BehaviorRuleTable } from './tables/BehaviorRule.ts';
import type { OutboxEventTable } from './tables/OutboxEvent.ts';
import type { ProcessedEventTable } from './tables/ProcessedEvent.ts';
import type { ProjectMemberTable, ProjectTable } from './tables/Project.ts';
import type { ProjectTaskTable } from './tables/ProjectTask.ts';
import type {
    ProjectTeamMemberTable,
    ProjectTeamTable,
} from './tables/ProjectTeam.ts';
import type { TaskLinkTable } from './tables/TaskLink.ts';
import type { TaskReachabilityTable } from './tables/TaskReachability.ts';
import type { PendingUserTable, UserTable } from './tables/User.ts';

export interface Database {
    behavior_rule: BehaviorRuleTable;
    project: ProjectTable;
    project_member: ProjectMemberTable;
    project_team: ProjectTeamTable;
    project_team_member: ProjectTeamMemberTable;
    project_task: ProjectTaskTable;
    task_link: TaskLinkTable;
    task_reachability: TaskReachabilityTable;
    processed_event: ProcessedEventTable;
    users: UserTable;
    pending_users: PendingUserTable;
    outbox_events: OutboxEventTable;
}

export const pool = new Pool({
    database: process.env.DB_NAME || 'test',
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'password',
    port: Number(process.env.DB_PORT) || 5434,
    max: 10,
    idleTimeoutMillis: 30000,
});

pool.on('connect', () =>
    logger.debug('Database: New client connected to pool'),
);
pool.on('error', (err) => logger.error('Database: Unexpected pool error', err));

const dialect = new PostgresDialect({
    pool,
});

export const db = new Kysely<Database>({
    dialect,
});

logger.info('Database: Kysely instance initialized');
