import type {ProjectMemberTable, ProjectTable} from './tables/Project.ts';
import {Kysely, PostgresDialect} from 'kysely';
import {Pool} from 'pg';
import type {ProjectTeamTable} from './tables/ProjectTeam.ts';
import type {ProjectTaskTable} from "./tables/Task.ts";

export interface Database {
    project: ProjectTable;
    projectMember: ProjectMemberTable;
    projectTeam: ProjectTeamTable;
    projectTask: ProjectTaskTable
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


export const db = new Kysely<Database>({
    dialect,
});
