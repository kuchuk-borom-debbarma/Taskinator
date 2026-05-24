import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../../infra/__tests__/helpers/db.ts';
import { db } from '../../../infra/database/index.ts';
import { gqlRequest } from '../helpers/request.ts';
import { bootstrapE2E, teardownE2E } from '../helpers/server.ts';
import {
    ADD_PROJECT_MEMBERS,
    CREATE_PROJECT,
    DELETE_PROJECTS,
} from './mutation.ts';

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

        const project = await db
            .selectFrom('project')
            .where('id', '=', projectId)
            .executeTakeFirst();
        expect(project).toBeUndefined();
    }, 20000);

    it('should fail when deleting a project owned by another user', async () => {
        // [1] User 1 creates project
        const createRes = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Untouchable Project' },
            token: token1,
        });
        const projectId = createRes.body.data.createProject.id;

        // [2] User 2 tries to delete it
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

        const deleteRes = await gqlRequest({
            query: DELETE_PROJECTS,
            variables: { projectIds: [projectId] },
            token: token2,
        });

        // The mutation might return success true but deletedCount 0
        expect(deleteRes.body.data.deleteProjects.deletedCount).toBe(0);

        // Verify project still exists
        const p = await db
            .selectFrom('project')
            .selectAll()
            .where('id', '=', projectId)
            .executeTakeFirstOrThrow();
        expect(p.name).toBe('Untouchable Project');
    });

    it('should delete project and verify background membership purge', async () => {
        // [1] Setup: Create project and add a member
        const createRes = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Cascade Test' },
            token: token1,
        });
        const projectId = createRes.body.data.createProject.id;

        const otherUser = await db
            .insertInto('users')
            .values({
                email: 'other@test.com',
                username: 'other',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        await gqlRequest({
            query: ADD_PROJECT_MEMBERS,
            variables: { projectId, userIds: [otherUser.id] },
            token: token1,
        });

        // Verify member exists in DB
        const mBefore = await db
            .selectFrom('project_member')
            .where('fk_project_id', '=', projectId)
            .execute();
        expect(mBefore.length).toBe(1);

        // [2] Delete Project
        await gqlRequest({
            query: DELETE_PROJECTS,
            variables: { projectIds: [projectId] },
            token: token1,
        });

        // [3] Background Check: Membership should be purged eventually
        let purged = false;
        let attempts = 0;
        while (attempts < 20) {
            const members = await db
                .selectFrom('project_member')
                .where('fk_project_id', '=', projectId)
                .execute();
            if (members.length === 0) {
                purged = true;
                break;
            }
            await new Promise((r) => setTimeout(r, 500));
            attempts++;
        }

        expect(purged).toBe(true);
    }, 20000);

    it('should be idempotent when deleting the same project multiple times', async () => {
        const createRes = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Idempotency Test' },
            token: token1,
        });
        const projectId = createRes.body.data.createProject.id;

        // Call delete twice
        const res1 = await gqlRequest({
            query: DELETE_PROJECTS,
            variables: { projectIds: [projectId] },
            token: token1,
        });
        const res2 = await gqlRequest({
            query: DELETE_PROJECTS,
            variables: { projectIds: [projectId] },
            token: token1,
        });

        expect(res1.body.data.deleteProjects.deletedCount).toBe(1);
        expect(res2.body.data.deleteProjects.deletedCount).toBe(0);
        expect(res2.body.data.deleteProjects.success).toBe(true);
    });

    it('should handle bulk deletion with some non-existent IDs', async () => {
        const createRes = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Exists' },
            token: token1,
        });
        const projectId = createRes.body.data.createProject.id;
        const ghostId = '550e8400-e29b-41d4-a716-446655440001';

        const deleteRes = await gqlRequest({
            query: DELETE_PROJECTS,
            variables: { projectIds: [projectId, ghostId] },
            token: token1,
        });

        expect(deleteRes.body.data.deleteProjects.deletedCount).toBe(1);
    });

    it('should handle empty ID list gracefully', async () => {
        const deleteRes = await gqlRequest({
            query: DELETE_PROJECTS,
            variables: { projectIds: [] },
            token: token1,
        });
        expect(deleteRes.body.data.deleteProjects.deletedCount).toBe(0);
    });
});
