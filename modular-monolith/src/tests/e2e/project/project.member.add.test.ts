import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../../__tests__/helpers/db.ts';
import { db } from '../../../database/index.ts';
import { gqlRequest } from '../helpers/request.ts';
import { bootstrapE2E, teardownE2E } from '../helpers/server.ts';
import { ADD_PROJECT_MEMBERS, CREATE_PROJECT } from './mutation.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

describe('Project Member Add E2E', () => {
    let owner: { id: string; username: string; email: string };
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

        // Setup Owner
        owner = await db
            .insertInto('users')
            .values({
                email: 'owner@test.com',
                username: 'owner',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        token1 = jwt.sign(
            { id: owner.id, email: owner.email, username: owner.username },
            JWT_SECRET,
        );

        // Create Project
        const res = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Member Add Project' },
            token: token1,
        });
        projectId = res.body.data.createProject.id;
    });

    it('should add members and verify background members_count increment', async () => {
        const u2 = await db
            .insertInto('users')
            .values({
                email: 'u2@test.com',
                username: 'u2',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();
        const u3 = await db
            .insertInto('users')
            .values({
                email: 'u3@test.com',
                username: 'u3',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        const addRes = await gqlRequest({
            query: ADD_PROJECT_MEMBERS,
            variables: { projectId, userIds: [u2.id, u3.id] },
            token: token1,
        });

        expect(addRes.status).toBe(200);
        expect(addRes.body.data.addProjectMembers.success).toBe(true);

        // Verify in DB
        const members = await db
            .selectFrom('project_member')
            .select(['fk_user_id'])
            .where('fk_project_id', '=', projectId)
            .execute();
        expect(members.length).toBe(2);
        expect(members.map((m) => m.fk_user_id).sort()).toEqual(
            [u2.id, u3.id].sort(),
        );

        // Wait for background count increment
        let finalCount = 0;
        let attempts = 0;
        while (attempts < 20) {
            const p = await db
                .selectFrom('project')
                .select('members_count')
                .where('id', '=', projectId)
                .executeTakeFirstOrThrow();
            if (p.members_count === 2) {
                finalCount = 2;
                break;
            }
            await new Promise((r) => setTimeout(r, 500));
            attempts++;
        }
        expect(finalCount).toBe(2);
    }, 20000);

    it('should allow an existing member to add another member (Permissive Role)', async () => {
        const u2 = await db
            .insertInto('users')
            .values({
                email: 'u2@test.com',
                username: 'u2',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();
        await db
            .insertInto('project_member')
            .values({ fk_project_id: projectId, fk_user_id: u2.id })
            .execute();

        const token2 = jwt.sign(
            { id: u2.id, email: u2.email, username: u2.username },
            JWT_SECRET,
        );
        const u3 = await db
            .insertInto('users')
            .values({
                email: 'u3@test.com',
                username: 'u3',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        const addRes = await gqlRequest({
            query: ADD_PROJECT_MEMBERS,
            variables: { projectId, userIds: [u3.id] },
            token: token2,
        });

        expect(addRes.body.data.addProjectMembers.success).toBe(true);
        const members = await db
            .selectFrom('project_member')
            .select(['fk_user_id'])
            .where('fk_project_id', '=', projectId)
            .execute();
        expect(members.length).toBe(2);
        expect(members.map((m) => m.fk_user_id).sort()).toEqual(
            [u2.id, u3.id].sort(),
        );
    });

    it('should fail when a non-member tries to add members', async () => {
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

        const addRes = await gqlRequest({
            query: ADD_PROJECT_MEMBERS,
            variables: { projectId, userIds: [stranger.id] },
            token: strangerToken,
        });

        const members = await db
            .selectFrom('project_member')
            .select(['fk_user_id'])
            .where('fk_project_id', '=', projectId)
            .execute();
        expect(members.length).toBe(0);
        expect(addRes.body.data.addProjectMembers.success).toBe(true);
    });

    it('should be idempotent when adding the same user multiple times', async () => {
        const u2 = await db
            .insertInto('users')
            .values({
                email: 'u2@test.com',
                username: 'u2',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        await gqlRequest({
            query: ADD_PROJECT_MEMBERS,
            variables: { projectId, userIds: [u2.id] },
            token: token1,
        });
        const res2 = await gqlRequest({
            query: ADD_PROJECT_MEMBERS,
            variables: { projectId, userIds: [u2.id] },
            token: token1,
        });

        expect(res2.body.data.addProjectMembers.success).toBe(true);
        const members = await db
            .selectFrom('project_member')
            .select(['fk_user_id'])
            .where('fk_project_id', '=', projectId)
            .execute();
        expect(members.length).toBe(1);
        expect(members[0]?.fk_user_id).toBe(u2.id);
    });
});
