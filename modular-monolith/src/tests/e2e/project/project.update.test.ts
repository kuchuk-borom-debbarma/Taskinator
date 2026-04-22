import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../../__tests__/helpers/db.ts';
import { db } from '../../../database/index.ts';
import { gqlRequest } from '../helpers/request.ts';
import { bootstrapE2E, teardownE2E } from '../helpers/server.ts';
import { CREATE_PROJECT, UPDATE_PROJECT } from './mutation.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

describe('Project Update E2E', () => {
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
                email: 'updater@test.com',
                username: 'updater',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();
        token1 = jwt.sign(
            { id: user1.id, email: user1.email, username: user1.username },
            JWT_SECRET,
        );
    });

    it('should update project name and increment version', async () => {
        // [1] Setup
        const createRes = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Old Name' },
            token: token1,
        });
        const projectId = createRes.body.data.createProject.id;

        // [2] Mutation
        const updateRes = await gqlRequest({
            query: UPDATE_PROJECT,
            variables: { id: projectId, version: 1, name: 'New Name' },
            token: token1,
        });

        expect(updateRes.status).toBe(200);
        expect(updateRes.body.data.updateProject.name).toBe('New Name');
        expect(updateRes.body.data.updateProject.version).toBe(2);

        // [3] DB Check
        const project = await db
            .selectFrom('project')
            .selectAll()
            .where('id', '=', projectId)
            .executeTakeFirstOrThrow();
        expect(project.name).toBe('New Name');
        expect(project.version).toBe(2);
    });

    it('should fail update on version mismatch (Optimistic Locking)', async () => {
        const createRes = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Versioning Test' },
            token: token1,
        });
        const projectId = createRes.body.data.createProject.id;

        // Try to update with wrong version
        const updateRes = await gqlRequest({
            query: UPDATE_PROJECT,
            variables: { id: projectId, version: 99, name: 'Conflict' },
            token: token1,
        });
        expect(updateRes.body.errors).toBeDefined();
        expect(updateRes.body.errors[0].message).toContain('Version mismatch');
    });

    it('should fail when updating a project owned by another user', async () => {
        // [1] User 1 creates a project
        const createRes = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'User 1 Project' },
            token: token1,
        });
        const projectId = createRes.body.data.createProject.id;

        // [2] User 2 tries to update it
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

        const updateRes = await gqlRequest({
            query: UPDATE_PROJECT,
            variables: { id: projectId, version: 1, name: 'Hacked!' },
            token: token2,
        });

        expect(updateRes.body.errors).toBeDefined();
        expect(updateRes.body.errors[0].message).toContain(
            'Failed to update project',
        );

        // Verify DB didn't change
        const p = await db
            .selectFrom('project')
            .selectAll()
            .where('id', '=', projectId)
            .executeTakeFirstOrThrow();
        expect(p.name).toBe('User 1 Project');
    });

    it('should fail gracefully when updating a non-existent project ID', async () => {
        const randomId = '550e8400-e29b-41d4-a716-446655440000';
        const res = await gqlRequest({
            query: UPDATE_PROJECT,
            variables: { id: randomId, version: 1, name: 'Ghost' },
            token: token1,
        });
        expect(res.body.errors).toBeDefined();
    });
});
