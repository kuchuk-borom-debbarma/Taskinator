import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../../infra/__tests__/helpers/db.ts';
import { db } from '../../../infra/database/index.ts';
import { gqlRequest } from '../helpers/request.ts';
import { bootstrapE2E, teardownE2E } from '../helpers/server.ts';
import { CREATE_PROJECT } from '../project/mutation.ts';
import { ADD_TEAM_MEMBERS, CREATE_TEAM } from './mutation.ts';
import { GET_PROJECT_TEAMS } from './query.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

describe('Team Stress Test E2E', () => {
    let owner: { id: string; username: string; email: string };
    let ownerToken: string;
    let projectId: string;

    beforeAll(async () => {
        await bootstrapE2E();
    });

    afterAll(async () => {
        await teardownE2E();
    });

    beforeEach(async () => {
        await cleanupDb();

        owner = await db
            .insertInto('users')
            .values({
                email: 'team-stress@test.com',
                username: 'team_stress_owner',
                password_hash: 'a',
            })
            .returning(['id', 'username', 'email'])
            .executeTakeFirstOrThrow();

        ownerToken = jwt.sign(
            { id: owner.id, email: owner.email, username: owner.username },
            JWT_SECRET,
        );

        const res = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Stress Test Project' },
            token: ownerToken,
        });
        projectId = res.body.data.createProject.id;
    });

    it('should handle high throughput creation (100 concurrent teams)', async () => {
        const TEAM_COUNT = 100;
        const creationRequests = Array.from({ length: TEAM_COUNT }, (_, i) =>
            gqlRequest({
                query: CREATE_TEAM,
                variables: { projectId, name: `Stress Team ${i}` },
                token: ownerToken,
            }),
        );

        const results = await Promise.all(creationRequests);

        for (const res of results) {
            expect(res.status).toBe(200);
            expect(res.body.data.createTeam.success).toBe(true);
        }

        const teamsInDb = await db
            .selectFrom('project_team')
            .select('id')
            .where('fk_project_id', '=', projectId)
            .execute();

        expect(teamsInDb).toHaveLength(TEAM_COUNT);
    }, 60000);

    it('should handle simultaneous high volume reads and writes', async () => {
        const WRITE_COUNT = 50;
        const READ_COUNT = 100;

        // 1. Fire writes and reads concurrently
        const writeRequests = Array.from({ length: WRITE_COUNT }, (_, i) =>
            gqlRequest({
                query: CREATE_TEAM,
                variables: { projectId, name: `Volume Team ${i}` },
                token: ownerToken,
            }),
        );

        const readRequests = Array.from({ length: READ_COUNT }, () =>
            gqlRequest({
                query: GET_PROJECT_TEAMS,
                variables: { projectId, first: 10 },
                token: ownerToken,
            }),
        );

        const results = await Promise.all([...writeRequests, ...readRequests]);

        const writeResults = results.slice(0, WRITE_COUNT);
        const readResults = results.slice(WRITE_COUNT);

        for (const res of writeResults) {
            expect(res.status).toBe(200);
            expect(res.body.data.createTeam.success).toBe(true);
        }

        for (const res of readResults) {
            expect(res.status).toBe(200);
            expect(res.body.data.project.teams).toBeDefined();
        }
    }, 60000);

    it('should handle massive member additions (1000 members) in parallel batches', async () => {
        const teamRes = await gqlRequest({
            query: CREATE_TEAM,
            variables: { projectId, name: 'Mass Member Team' },
            token: ownerToken,
        });
        const teamId = teamRes.body.data.createTeam.team.id;

        const TOTAL_MEMBERS = 1000;
        const BATCH_SIZE = 100;

        // 1. Pre-create 1000 users
        const userValues = Array.from({ length: TOTAL_MEMBERS }, (_, i) => ({
            email: `team-bulk${i}@volume.com`,
            username: `team_bulk_${i}`,
            password_hash: 'a',
        }));

        await db.insertInto('users').values(userValues).execute();
        const allUsers = await db
            .selectFrom('users')
            .select('id')
            .where('email', 'like', 'team-bulk%')
            .execute();
        const userIds = allUsers.map((u) => u.id);

        // 2. Add users to PROJECT first (prerequisite for team membership)
        // We do this in 2 batches of 500 to not hit Postgres param limits too hard
        await db
            .insertInto('project_member')
            .values(
                userIds.map((id) => ({
                    fk_project_id: projectId,
                    fk_user_id: id,
                })),
            )
            .execute();

        // 3. Parallel batches for TEAM membership
        const batches = [];
        for (let i = 0; i < TOTAL_MEMBERS; i += BATCH_SIZE) {
            batches.push(userIds.slice(i, i + BATCH_SIZE));
        }

        const requests = batches.map((batch) =>
            gqlRequest({
                query: ADD_TEAM_MEMBERS,
                variables: { projectId, teamId, userIds: batch },
                token: ownerToken,
            }),
        );

        const results = await Promise.all(requests);

        for (const res of results) {
            expect(res.status).toBe(200);
            expect(res.body.data.addTeamMembers.success).toBe(true);
            expect(res.body.data.addTeamMembers.addedCount).toBe(BATCH_SIZE);
        }

        // 4. Verify final DB state
        const countRes = await db
            .selectFrom('project_team_member')
            .select(db.fn.count('id').as('count'))
            .where('fk_team_id', '=', teamId)
            .executeTakeFirstOrThrow();

        expect(Number(countRes.count)).toBe(TOTAL_MEMBERS);

        // 5. Verify membersCount update (eventually consistent)
        let membersCount = 0;
        let attempts = 0;
        while (attempts < 20) {
            const team = await db
                .selectFrom('project_team')
                .select('members_count')
                .where('id', '=', teamId)
                .executeTakeFirstOrThrow();

            if (Number(team.members_count) === TOTAL_MEMBERS) {
                membersCount = Number(team.members_count);
                break;
            }
            await new Promise((r) => setTimeout(r, 500));
            attempts++;
        }
        expect(membersCount).toBe(TOTAL_MEMBERS);
    }, 90000);
});
