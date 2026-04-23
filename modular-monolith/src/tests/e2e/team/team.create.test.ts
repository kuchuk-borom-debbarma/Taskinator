import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../../__tests__/helpers/db.ts';
import { db } from '../../../database/index.ts';
import { gqlRequest } from '../helpers/request.ts';
import { bootstrapE2E, teardownE2E } from '../helpers/server.ts';
import { CREATE_PROJECT } from '../project/mutation.ts';
import { CREATE_TEAM } from './mutation.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

describe('Team Creation E2E', () => {
    let user1: { id: string; username: string; email: string };
    let token1: string;
    let projectId: string;

    beforeAll(async () => {
        await bootstrapE2E();
    });

    afterAll(async () => {
        await teardownE2E();
    });

    beforeEach(async () => {
        await cleanupDb();

        // [1] Setup User 1 (Owner)
        user1 = await db
            .insertInto('users')
            .values({
                email: 'owner@test.com',
                username: 'owner',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        token1 = jwt.sign(
            { id: user1.id, email: user1.email, username: user1.username },
            JWT_SECRET,
        );

        // [2] Create a Project
        const res = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Target Project' },
            token: token1,
        });
        projectId = res.body.data.createProject.id;
    });

    it('should allow the project owner to create a team', async () => {
        const res = await gqlRequest({
            query: CREATE_TEAM,
            variables: { projectId, name: 'Engineering' },
            token: token1,
        });

        expect(res.status).toBe(200);
        expect(res.body.data.createTeam.success).toBe(true);
        expect(res.body.data.createTeam.team.name).toBe('Engineering');
        expect(res.body.data.createTeam.team.project.id).toBe(projectId);

        // Verify in DB
        const team = await db
            .selectFrom('project_team')
            .where('id', '=', res.body.data.createTeam.team.id)
            .selectAll()
            .executeTakeFirst();
        expect(team?.name).toBe('Engineering');
    });

    it('should allow a project member to create a team (Permissive model)', async () => {
        // [1] Setup User 2 as Project Member
        const user2 = await db
            .insertInto('users')
            .values({
                email: 'member@test.com',
                username: 'member',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();
        const token2 = jwt.sign(
            { id: user2.id, email: user2.email, username: user2.username },
            JWT_SECRET,
        );
        await db
            .insertInto('project_member')
            .values({ fk_project_id: projectId, fk_user_id: user2.id })
            .execute();

        // [2] User 2 creates a team
        const res = await gqlRequest({
            query: CREATE_TEAM,
            variables: { projectId, name: 'Design' },
            token: token2,
        });

        expect(res.status).toBe(200);
        expect(res.body.data.createTeam.success).toBe(true);
        expect(res.body.data.createTeam.team.name).toBe('Design');
    });

    it('should fail when a stranger (non-member) tries to create a team', async () => {
        const stranger = await db
            .insertInto('users')
            .values({
                email: 'stranger@test.com',
                username: 'stranger',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();
        const strangerToken = jwt.sign(
            {
                id: stranger.id,
                email: stranger.email,
                username: stranger.username,
            },
            JWT_SECRET,
        );

        const res = await gqlRequest({
            query: CREATE_TEAM,
            variables: { projectId, name: 'Illegal Team' },
            token: strangerToken,
        });

        expect(res.status).toBe(404);
        expect(res.body.errors?.[0].message).toContain(
            'not found or you are not authorized',
        );
    });

    it('should fail when unauthenticated', async () => {
        const res = await gqlRequest({
            query: CREATE_TEAM,
            variables: { projectId, name: 'Ghost Team' },
        });

        expect(res.status).toBe(401);
        expect(res.body.errors?.[0].extensions?.code).toBe('UNAUTHENTICATED');
    });

    it('should fail when name is too short (< 3 chars)', async () => {
        const res = await gqlRequest({
            query: CREATE_TEAM,
            variables: { projectId, name: 'Ab' },
            token: token1,
        });

        expect(res.body.errors?.[0].message).toContain(
            'between 3 and 255 characters',
        );
    });

    it('should fail when name is too long (> 255 chars)', async () => {
        const longName = 'a'.repeat(256);
        const res = await gqlRequest({
            query: CREATE_TEAM,
            variables: { projectId, name: longName },
            token: token1,
        });

        expect(res.body.errors?.[0].message).toContain(
            'between 3 and 255 characters',
        );
    });

    it('should support special characters in team name', async () => {
        const specialName = '🚀 Dev-Team_#123';
        const res = await gqlRequest({
            query: CREATE_TEAM,
            variables: { projectId, name: specialName },
            token: token1,
        });

        expect(res.body.data.createTeam.team.name).toBe(specialName);
    });

    it('should fail if project does not exist', async () => {
        const randomId = '550e8400-e29b-41d4-a716-446655440000';
        const res = await gqlRequest({
            query: CREATE_TEAM,
            variables: { projectId: randomId, name: 'Void Team' },
            token: token1,
        });

        expect(res.body.errors?.[0].message).toContain(
            'not found or you are not authorized',
        );
    });

    it('should eventually update project teams_count (Event-Driven)', async () => {
        // [1] Create 2 teams
        await gqlRequest({
            query: CREATE_TEAM,
            variables: { projectId, name: 'Team 1' },
            token: token1,
        });
        await gqlRequest({
            query: CREATE_TEAM,
            variables: { projectId, name: 'Team 2' },
            token: token1,
        });

        // [2] Poll for counter update (Kafka -> Aggregator -> DB)
        let teamsCount = 0;
        for (let i = 0; i < 20; i++) {
            const project = await db
                .selectFrom('project')
                .where('id', '=', projectId)
                .select(['teams_count'])
                .executeTakeFirst();

            teamsCount = project?.teams_count || 0;
            if (teamsCount === 2) break;
            await new Promise((resolve) => setTimeout(resolve, 500));
        }

        expect(teamsCount).toBe(2);
    });
});
