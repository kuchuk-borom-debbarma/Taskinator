import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../../__tests__/helpers/db.ts';
import { db } from '../../../database/index.ts';
import { gqlRequest } from '../helpers/request.ts';
import { bootstrapE2E, teardownE2E } from '../helpers/server.ts';
import { CREATE_PROJECT } from '../project/mutation.ts';
import { ADD_TEAM_MEMBERS, CREATE_TEAM } from './mutation.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

describe('Team Member Addition E2E', () => {
    let owner: { id: string; username: string; email: string };
    let member: { id: string; username: string; email: string };
    let stranger: { id: string; username: string; email: string };
    let ownerToken: string;
    let memberToken: string;
    let strangerToken: string;
    let projectId: string;
    let teamId: string;

    beforeAll(async () => {
        await bootstrapE2E();
    });

    afterAll(async () => {
        await teardownE2E();
    });

    beforeEach(async () => {
        await cleanupDb();

        // [1] Setup Users
        owner = await db
            .insertInto('users')
            .values({
                email: 'owner@test.com',
                username: 'owner',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();
        member = await db
            .insertInto('users')
            .values({
                email: 'member@test.com',
                username: 'member',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();
        stranger = await db
            .insertInto('users')
            .values({
                email: 'stranger@test.com',
                username: 'stranger',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        ownerToken = jwt.sign(
            { id: owner.id, email: owner.email, username: owner.username },
            JWT_SECRET,
        );
        memberToken = jwt.sign(
            { id: member.id, email: member.email, username: member.username },
            JWT_SECRET,
        );
        strangerToken = jwt.sign(
            {
                id: stranger.id,
                email: stranger.email,
                username: stranger.username,
            },
            JWT_SECRET,
        );

        // [2] Create Project
        const pRes = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Collaboration Project' },
            token: ownerToken,
        });
        projectId = pRes.body.data.createProject.id;

        // [3] Add 'member' to Project
        await db
            .insertInto('project_member')
            .values({ fk_project_id: projectId, fk_user_id: member.id })
            .execute();

        // [4] Create Team
        const tRes = await gqlRequest({
            query: CREATE_TEAM,
            variables: { projectId, name: 'Core Team' },
            token: ownerToken,
        });
        teamId = tRes.body.data.createTeam.team.id;
    });

    it('should allow project owner to add members to a team', async () => {
        const res = await gqlRequest({
            query: ADD_TEAM_MEMBERS,
            variables: { projectId, teamId, userIds: [member.id] },
            token: ownerToken,
        });

        expect(res.status).toBe(200);
        expect(res.body.data.addTeamMembers.success).toBe(true);
        expect(res.body.data.addTeamMembers.addedCount).toBe(1);

        const membership = await db
            .selectFrom('project_team_member')
            .where('fk_team_id', '=', teamId)
            .where('fk_user_id', '=', member.id)
            .selectAll()
            .executeTakeFirst();
        expect(membership).toBeDefined();
    });

    it('should fail to add a user who is not a project member', async () => {
        const res = await gqlRequest({
            query: ADD_TEAM_MEMBERS,
            variables: { projectId, teamId, userIds: [stranger.id] },
            token: ownerToken,
        });

        expect(res.body.data.addTeamMembers.addedCount).toBe(0);
    });

    it('should allow project member to add other members to a team', async () => {
        const user3 = await db
            .insertInto('users')
            .values({
                email: 'user3@test.com',
                username: 'user3',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();
        await db
            .insertInto('project_member')
            .values({ fk_project_id: projectId, fk_user_id: user3.id })
            .execute();

        const res = await gqlRequest({
            query: ADD_TEAM_MEMBERS,
            variables: { projectId, teamId, userIds: [user3.id] },
            token: memberToken,
        });

        expect(res.body.data.addTeamMembers.addedCount).toBe(1);
    });

    it('should fail when a stranger tries to add team members', async () => {
        const res = await gqlRequest({
            query: ADD_TEAM_MEMBERS,
            variables: { projectId, teamId, userIds: [member.id] },
            token: strangerToken,
        });

        expect(res.body.data.addTeamMembers.addedCount).toBe(0);
    });

    it('should eventually update team members_count after addition (Event-Driven)', async () => {
        const u1 = await db
            .insertInto('users')
            .values({
                email: 'u1@test.com',
                username: 'u1',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();
        await db
            .insertInto('project_member')
            .values({ fk_project_id: projectId, fk_user_id: u1.id })
            .execute();

        await gqlRequest({
            query: ADD_TEAM_MEMBERS,
            variables: { projectId, teamId, userIds: [member.id, u1.id] },
            token: ownerToken,
        });

        let membersCount = 0;
        for (let i = 0; i < 20; i++) {
            const team = await db
                .selectFrom('project_team')
                .where('id', '=', teamId)
                .select(['members_count'])
                .executeTakeFirst();
            membersCount = team?.members_count || 0;
            if (membersCount === 2) break;
            await new Promise((resolve) => setTimeout(resolve, 500));
        }
        expect(membersCount).toBe(2);
    });

    it('should handle duplicate additions gracefully (Idempotency)', async () => {
        await gqlRequest({
            query: ADD_TEAM_MEMBERS,
            variables: { projectId, teamId, userIds: [member.id] },
            token: ownerToken,
        });

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
            .values({ fk_project_id: projectId, fk_user_id: u3.id })
            .execute();

        const res = await gqlRequest({
            query: ADD_TEAM_MEMBERS,
            variables: { projectId, teamId, userIds: [member.id, u3.id] },
            token: ownerToken,
        });

        expect(res.body.data.addTeamMembers.addedCount).toBe(1);
    });

    it('should handle partial additions (some valid, some invalid)', async () => {
        const res = await gqlRequest({
            query: ADD_TEAM_MEMBERS,
            variables: { projectId, teamId, userIds: [member.id, stranger.id] },
            token: ownerToken,
        });

        expect(res.body.data.addTeamMembers.addedCount).toBe(1);
    });

    it('should fail to add members to a non-existent team', async () => {
        const fakeTeamId = '00000000-0000-0000-0000-000000000000';
        const res = await gqlRequest({
            query: ADD_TEAM_MEMBERS,
            variables: { projectId, teamId: fakeTeamId, userIds: [member.id] },
            token: ownerToken,
        });

        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message).toBe('Team not found');
    });
});
