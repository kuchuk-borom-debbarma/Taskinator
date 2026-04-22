import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../../__tests__/helpers/db.ts';
import { db } from '../../../database/index.ts';
import { gqlRequest } from '../helpers/request.ts';
import { bootstrapE2E, teardownE2E } from '../helpers/server.ts';
import { CREATE_PROJECT, DELETE_PROJECTS } from './mutation.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

describe('Project Deletion E2E', () => {
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
                email: 'deleter@test.com',
                username: 'deleter',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();
        token1 = jwt.sign(
            { id: user1.id, email: user1.email, username: user1.username },
            JWT_SECRET,
        );
    });

    it('should delete project and verify background count decrement', async () => {
        // [1] Setup: Create and wait for increment
        const createRes = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Delete Me' },
            token: token1,
        });
        const projectId = createRes.body.data.createProject.id;

        // Wait for count to hit 1
        let attempts = 0;
        while (attempts < 20) {
            const u = await db
                .selectFrom('users')
                .select('projects_count')
                .where('id', '=', user1.id)
                .executeTakeFirstOrThrow();
            if (u.projects_count === 1) break;
            await new Promise((r) => setTimeout(r, 500));
            attempts++;
        }

        // [2] Mutation
        const deleteRes = await gqlRequest({
            query: DELETE_PROJECTS,
            variables: { projectIds: [projectId] },
            token: token1,
        });
        expect(deleteRes.status).toBe(200);
        expect(deleteRes.body.data.deleteProjects.success).toBe(true);

        // [3] Background Check (Wait for decrement)
        let finalCount = 1;
        attempts = 0;
        while (attempts < 20) {
            const u = await db
                .selectFrom('users')
                .select('projects_count')
                .where('id', '=', user1.id)
                .executeTakeFirstOrThrow();
            if (u.projects_count === 0) {
                finalCount = 0;
                break;
            }
            await new Promise((r) => setTimeout(r, 500));
            attempts++;
        }

        expect(finalCount).toBe(0);

        // [4] DB Check
        const project = await db
            .selectFrom('project')
            .where('id', '=', projectId)
            .executeTakeFirst();
        expect(project).toBeUndefined();
    }, 20000);
});
