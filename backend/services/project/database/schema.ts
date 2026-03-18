import {integer, pgTable, varchar, timestamp} from "drizzle-orm/pg-core";

export const projectsTable = pgTable(
    'projects',
    {
        id: varchar({length: 255}).primaryKey(),
        name: varchar({length: 255}).notNull(),
        description: varchar({length: 255}),
        fk_user_id: varchar({length: 255}).notNull(),
        denormalized_members_count: integer().default(0),
        denormalized_tasks_count: integer().default(0),
        denormalized_teams_count: integer().default(0),
        created_at: timestamp().defaultNow(),
        updated_at: timestamp()
    }
);

export const projectMembersTable = pgTable(
    "project_members",
    {
        id: varchar({length: 255}).primaryKey(),
        fk_project_id: varchar({length: 255}).notNull(),
        fk_user_id: varchar({length: 255}).notNull(),
        denormalized_user_name: varchar({length: 255}).notNull(),
        created_at: timestamp().defaultNow(),
        updated_at: timestamp(),
    }
);

export const projectTeamsTable = pgTable("project_teams", {
    id: varchar({length: 255}).primaryKey(),
    fk_project_id: varchar({length: 255}).notNull(),
    name: varchar({length: 255}).notNull(),
    description: varchar({length: 255}),
    denormalized_members_count: integer().default(0),
    denormalized_tasks_count: integer().default(0),
    created_at: timestamp().defaultNow(),
    updated_at: timestamp(),
});

export const projectTeamMembersTable = pgTable("project_team_members", {
    id: varchar({length: 255}).primaryKey(),
    fk_project_id: varchar({length: 255}).notNull(),
    fk_team_id: varchar({length: 255}).notNull(),
    fk_user_id: varchar({length: 255}).notNull(),
    denormalized_user_name: varchar({length: 255}).notNull(),
    created_at: timestamp().defaultNow(),
    updated_at: timestamp(),
})