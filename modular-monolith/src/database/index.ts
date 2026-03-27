import type { ProjectMemberTable, ProjectTable } from './tables/Project.ts';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { ProjectTeamTable } from './tables/ProjectTeam.ts';

export interface Database {
    project: ProjectTable;
    projectMember: ProjectMemberTable;
    projectTeam: ProjectTeamTable;
}

const dialect = new PostgresDialect({
    pool: new Pool({
        database: 'test',
        host: 'localhost',
        user: 'admin',
        port: 5434,
        max: 10,
    }),
});

// Database interface is passed to Kysely's constructor, and from now on, Kysely
// knows your database structure.
// Dialect is passed to Kysely's constructor, and from now on, Kysely knows how
// to communicate with your database.
export const db = new Kysely<Database>({
    dialect,
});
