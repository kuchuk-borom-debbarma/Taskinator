import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../../__tests__/helpers/db.ts';
import { db } from '../../../database/index.ts';
import { gqlRequest } from '../helpers/request.ts';
import { bootstrapE2E, teardownE2E } from '../helpers/server.ts';
import { CREATE_PROJECT } from '../project/mutation.ts';
import { CREATE_TEAM, REMOVE_TEAM_MEMBERS } from './mutation.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

describe('Team Member Removal E2E', () => {
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

    it('should allow removing team members', async () => {
        // [1] Add member first
        await db
            .insertInto('project_team_member')
            .values({
                fk_team_id: teamId,
                fk_project_id: projectId,
                fk_user_id: member.id,
            })
            .execute();

        // [2] Remove member
        const res = await gqlRequest({
            query: REMOVE_TEAM_MEMBERS,
            variables: { projectId, teamId, userIds: [member.id] },
            token: ownerToken,
        });

        expect(res.body.data.removeTeamMembers.success).toBe(true);
        expect(res.body.data.removeTeamMembers.removedCount).toBe(1);

        const membership = await db
            .selectFrom('project_team_member')
            .where('fk_team_id', '=', teamId)
            .where('fk_user_id', '=', member.id)
            .executeTakeFirst();
        expect(membership).toBeUndefined();
    });

    it('should allow a member to remove themselves from a team', async () => {
        await db
            .insertInto('project_team_member')
            .values({
                fk_team_id: teamId,
                fk_project_id: projectId,
                fk_user_id: member.id,
            })
            .execute();

        const res = await gqlRequest({
            query: REMOVE_TEAM_MEMBERS,
            variables: { projectId, teamId, userIds: [member.id] },
            token: memberToken,
        });

        expect(res.body.data.removeTeamMembers.removedCount).toBe(1);
    });

    it('should handle batch removal correctly', async () => {
        const u4 = await db
            .insertInto('users')
            .values({
                email: 'u4@test.com',
                username: 'u4',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();
        await db
            .insertInto('project_member')
            .values({ fk_project_id: projectId, fk_user_id: u4.id })
            .execute();
        await db
            .insertInto('project_team_member')
            .values([
                {
                    fk_team_id: teamId,
                    fk_project_id: projectId,
                    fk_user_id: member.id,
                },
                {
                    fk_team_id: teamId,
                    fk_project_id: projectId,
                    fk_user_id: u4.id,
                },
            ])
            .execute();

        const res = await gqlRequest({
            query: REMOVE_TEAM_MEMBERS,
            variables: { projectId, teamId, userIds: [member.id, u4.id] },
            token: ownerToken,
        });

        expect(res.body.data.removeTeamMembers.removedCount).toBe(2);
    });

    it('should return removedCount: 0 when removing non-members', async () => {
        const res = await gqlRequest({
            query: REMOVE_TEAM_MEMBERS,
            variables: { projectId, teamId, userIds: [stranger.id] },
            token: ownerToken,
        });

        expect(res.body.data.removeTeamMembers.removedCount).toBe(0);
    });

    it('should eventually update team members_count after removal (Event-Driven)', async () => {
        // [1] Add member
        await db
            .insertInto('project_team_member')
            .values({
                fk_team_id: teamId,
                fk_project_id: projectId,
                fk_user_id: member.id,
            })
            .execute();

        // [2] Wait for count to be 1 first (optional but safer)
        await gqlRequest({
            query: REMOVE_TEAM_MEMBERS,
            variables: { projectId, teamId, userIds: [member.id] },
            token: ownerToken,
        });

        let membersCount = 1;
        for (let i = 0; i < 20; i++) {
            const team = await db
                .selectFrom('project_team')
                .where('id', '=', teamId)
                .select(['members_count'])
                .executeTakeFirst();
            membersCount = team?.members_count || 0;
            if (membersCount === 0) break;
            await new Promise((resolve) => setTimeout(resolve, 500));
        }
        expect(membersCount).toBe(0);
    });
});
