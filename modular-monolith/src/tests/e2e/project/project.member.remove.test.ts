import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../../infra/__tests__/helpers/db.ts';
import { db } from '../../../infra/database/index.ts';
import { gqlRequest } from '../helpers/request.ts';
import { bootstrapE2E, teardownE2E } from '../helpers/server.ts';
import { CREATE_PROJECT, REMOVE_PROJECT_MEMBERS } from './mutation.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

describe('Project Member Remove E2E', () => {
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
            variables: { name: 'Member Remove Project' },
            token: token1,
        });
        projectId = res.body.data.createProject.id;
    });

    it('should remove members and verify background members_count decrement', async () => {
        // [1] Setup: Add member
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

        // Wait for count to hit 1
        let attempts = 0;
        while (attempts < 20) {
            const p = await db
                .selectFrom('project')
                .select('members_count')
                .where('id', '=', projectId)
                .executeTakeFirstOrThrow();
            if (p.members_count === 1) break;
            await new Promise((r) => setTimeout(r, 500));
            attempts++;
        }

        // [2] Mutation: Remove member
        const removeRes = await gqlRequest({
            query: REMOVE_PROJECT_MEMBERS,
            variables: { projectId, memberIds: [u2.id] },
            token: token1,
        });

        expect(removeRes.body.data.removeProjectMembers.success).toBe(true);

        const membershipsAfterDelete = await db
            .selectFrom('project_member')
            .select('fk_user_id')
            .where('fk_project_id', '=', projectId)
            .execute();
        expect(membershipsAfterDelete).toHaveLength(0);

        // [3] Background Check
        let finalCount = 1;
        attempts = 0;
        while (attempts < 20) {
            const p = await db
                .selectFrom('project')
                .select('members_count')
                .where('id', '=', projectId)
                .executeTakeFirstOrThrow();
            if (p.members_count === 0) {
                finalCount = 0;
                break;
            }
            await new Promise((r) => setTimeout(r, 500));
            attempts++;
        }
        expect(finalCount).toBe(0);
    }, 20000);

    it('should fail when a non-member tries to remove members', async () => {
        // [1] Add User 2 as member
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

        // [2] Stranger tries to remove User 2
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

        const removeRes = await gqlRequest({
            query: REMOVE_PROJECT_MEMBERS,
            variables: { projectId, memberIds: [u2.id] },
            token: strangerToken,
        });

        // Verify member still exists
        const members = await db
            .selectFrom('project_member')
            .select('fk_user_id')
            .where('fk_project_id', '=', projectId)
            .execute();
        expect(members.length).toBe(1);
        expect(members[0]?.fk_user_id).toBe(u2.id);
        expect(removeRes.body.data.removeProjectMembers.success).toBe(true);
    });

    it('should handle non-existent member removal gracefully', async () => {
        const ghostId = '550e8400-e29b-41d4-a716-446655440001';
        const removeRes = await gqlRequest({
            query: REMOVE_PROJECT_MEMBERS,
            variables: { projectId, memberIds: [ghostId] },
            token: token1,
        });
        expect(removeRes.body.data.removeProjectMembers.success).toBe(true);

        const members = await db
            .selectFrom('project_member')
            .select('fk_user_id')
            .where('fk_project_id', '=', projectId)
            .execute();
        expect(members).toHaveLength(0);
    });

    it('should allow an existing member to remove another member (Permissive Role)', async () => {
        // [1] Setup: User 2 and User 3 are members
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
        await db
            .insertInto('project_member')
            .values([
                { fk_project_id: projectId, fk_user_id: u2.id },
                { fk_project_id: projectId, fk_user_id: u3.id },
            ])
            .execute();

        const token2 = jwt.sign(
            { id: u2.id, email: u2.email, username: u2.username },
            JWT_SECRET,
        );

        // [2] User 2 removes User 3
        const removeRes = await gqlRequest({
            query: REMOVE_PROJECT_MEMBERS,
            variables: { projectId, memberIds: [u3.id] },
            token: token2,
        });

        expect(removeRes.body.data.removeProjectMembers.success).toBe(true);
        const members = await db
            .selectFrom('project_member')
            .selectAll()
            .where('fk_project_id', '=', projectId)
            .execute();
        expect(members.length).toBe(1);
        expect(members[0]!.fk_user_id).toBe(u2.id);
    });
});
