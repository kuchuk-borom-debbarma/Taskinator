import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../../infra/__tests__/helpers/db.ts';
import { db } from '../../../infra/database/index.ts';
import { gqlRequest } from '../helpers/request.ts';
import { bootstrapE2E, teardownE2E } from '../helpers/server.ts';
import { CREATE_PROJECT } from '../project/mutation.ts';
import { CREATE_TEAM, DELETE_TEAMS } from './mutation.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

describe('Team Deletion E2E', () => {
    let owner: { id: string; username: string; email: string };
    let member: { id: string; username: string; email: string };
    let stranger: { id: string; username: string; email: string };
    let ownerToken: string;
    let memberToken: string;
    let strangerToken: string;
    let projectId: string;
    let teamId1: string;
    let teamId2: string;

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
            variables: { name: 'Deletion Project' },
            token: ownerToken,
        });
        projectId = pRes.body.data.createProject.id;

        // [3] Add 'member' to Project
        await db
            .insertInto('project_member')
            .values({ fk_project_id: projectId, fk_user_id: member.id })
            .execute();

        // [4] Create 2 Teams
        const t1Res = await gqlRequest({
            query: CREATE_TEAM,
            variables: { projectId, name: 'Team 1' },
            token: ownerToken,
        });
        teamId1 = t1Res.body.data.createTeam.team.id;

        const t2Res = await gqlRequest({
            query: CREATE_TEAM,
            variables: { projectId, name: 'Team 2' },
            token: ownerToken,
        });
        teamId2 = t2Res.body.data.createTeam.team.id;
    });

    it('should allow project owner to delete teams', async () => {
        // [1] Add a member to team1 to verify cascade
        await db
            .insertInto('project_team_member')
            .values({
                fk_team_id: teamId1,
                fk_project_id: projectId,
                fk_user_id: member.id,
            })
            .execute();

        // [2] Delete teams
        const res = await gqlRequest({
            query: DELETE_TEAMS,
            variables: { projectId, teamIds: [teamId1, teamId2] },
            token: ownerToken,
        });

        expect(res.status).toBe(200);
        expect(res.body.data.deleteTeams.success).toBe(true);
        expect(res.body.data.deleteTeams.deletedCount).toBe(2);

        // Verify Team Deletion
        const teams = await db
            .selectFrom('project_team')
            .where('id', 'in', [teamId1, teamId2])
            .selectAll()
            .execute();
        expect(teams.length).toBe(0);

        // Verify Cascade Deletion (Memberships should be gone - Event-Driven)
        let membershipsCount = 1;
        for (let i = 0; i < 20; i++) {
            const memberships = await db
                .selectFrom('project_team_member')
                .where('fk_team_id', '=', teamId1)
                .execute();
            membershipsCount = memberships.length;
            if (membershipsCount === 0) break;
            await new Promise((r) => setTimeout(r, 500));
        }
        expect(membershipsCount).toBe(0);
    });

    it('should allow project member to delete teams', async () => {
        const res = await gqlRequest({
            query: DELETE_TEAMS,
            variables: { projectId, teamIds: [teamId1] },
            token: memberToken,
        });

        expect(res.body.data.deleteTeams.success).toBe(true);
        expect(res.body.data.deleteTeams.deletedCount).toBe(1);
    });

    it('should fail when a stranger tries to delete teams', async () => {
        const res = await gqlRequest({
            query: DELETE_TEAMS,
            variables: { projectId, teamIds: [teamId1] },
            token: strangerToken,
        });

        expect(res.body.data.deleteTeams.deletedCount).toBe(0);
    });

    it('should eventually update project teams_count (Event-Driven)', async () => {
        // [1] Verify initial count is 2
        let project = await db
            .selectFrom('project')
            .where('id', '=', projectId)
            .select(['teams_count'])
            .executeTakeFirst();

        // Polling for initial creation count if needed (usually fast)
        for (let i = 0; i < 10 && project?.teams_count !== 2; i++) {
            await new Promise((r) => setTimeout(r, 200));
            project = await db
                .selectFrom('project')
                .where('id', '=', projectId)
                .select(['teams_count'])
                .executeTakeFirst();
        }
        expect(project?.teams_count).toBe(2);

        // [2] Delete 1 team
        await gqlRequest({
            query: DELETE_TEAMS,
            variables: { projectId, teamIds: [teamId1] },
            token: ownerToken,
        });

        // [3] Poll for counter update (2 -> 1)
        let teamsCount = 2;
        for (let i = 0; i < 20; i++) {
            const p = await db
                .selectFrom('project')
                .where('id', '=', projectId)
                .select(['teams_count'])
                .executeTakeFirst();

            teamsCount = p?.teams_count || 0;
            if (teamsCount === 1) break;
            await new Promise((resolve) => setTimeout(resolve, 500));
        }

        expect(teamsCount).toBe(1);
    });
});
