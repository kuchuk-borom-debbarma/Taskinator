import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../../infra/__tests__/helpers/db.ts';
import { db } from '../../../infra/database/index.ts';
import { gqlRequest } from '../helpers/request.ts';
import { bootstrapE2E, teardownE2E } from '../helpers/server.ts';
import { CREATE_PROJECT } from './mutation.ts';
import { GET_BATCH_PROJECTS } from './query.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

describe('Project Batch Query E2E', () => {
    let user1: { id: string; username: string; email: string };
    let token1: string;

    beforeAll(async () => {
        await bootstrapE2E();
    });

    afterAll(async () => {
        await teardownE2E();
    });

    beforeEach(async () => {
        await cleanupDb();

        user1 = await db
            .insertInto('users')
            .values({
                email: 'user1@test.com',
                username: 'user1',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        token1 = jwt.sign(
            { id: user1.id, email: user1.email, username: user1.username },
            JWT_SECRET,
        );
    });

    it('should fetch multiple projects by IDs successfully', async () => {
        const res1 = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Project 1' },
            token: token1,
        });
        const res2 = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Project 2' },
            token: token1,
        });
        const ids = [
            res1.body.data.createProject.id,
            res2.body.data.createProject.id,
        ];

        const queryRes = await gqlRequest({
            query: GET_BATCH_PROJECTS,
            variables: { ids },
            token: token1,
        });

        expect(queryRes.status).toBe(200);
        expect(queryRes.body.data.projects.length).toBe(2);
        const names = queryRes.body.data.projects.map((p: any) => p.name);
        expect(names).toContain('Project 1');
        expect(names).toContain('Project 2');
    });

    it('should filter out unauthorized projects from batch results', async () => {
        // [1] User 1 creates Project 1
        const res1 = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Project 1' },
            token: token1,
        });
        const p1Id = res1.body.data.createProject.id;

        // [2] User 2 creates Project 2
        const user2 = await db
            .insertInto('users')
            .values({
                email: 'user2@test.com',
                username: 'user2',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();
        const token2 = jwt.sign(
            { id: user2.id, email: user2.email, username: user2.username },
            JWT_SECRET,
        );
        const res2 = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Project 2' },
            token: token2,
        });
        const p2Id = res2.body.data.createProject.id;

        // [3] User 1 tries to fetch both
        const queryRes = await gqlRequest({
            query: GET_BATCH_PROJECTS,
            variables: { ids: [p1Id, p2Id] },
            token: token1,
        });

        // Should only return P1
        expect(queryRes.body.data.projects.length).toBe(1);
        expect(queryRes.body.data.projects[0].id).toBe(p1Id);
    });

    it('should handle mixed existent and non-existent IDs', async () => {
        const res1 = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Project 1' },
            token: token1,
        });
        const p1Id = res1.body.data.createProject.id;
        const randomId = '550e8400-e29b-41d4-a716-446655440000';

        const queryRes = await gqlRequest({
            query: GET_BATCH_PROJECTS,
            variables: { ids: [p1Id, randomId] },
            token: token1,
        });

        expect(queryRes.body.data.projects.length).toBe(1);
        expect(queryRes.body.data.projects[0].id).toBe(p1Id);
    });

    it('should handle empty ID list gracefully', async () => {
        const queryRes = await gqlRequest({
            query: GET_BATCH_PROJECTS,
            variables: { ids: [] },
            token: token1,
        });
        expect(queryRes.body.data.projects.length).toBe(0);
    });
});
