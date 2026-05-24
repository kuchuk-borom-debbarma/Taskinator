import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../../infra/__tests__/helpers/db.ts';
import { db } from '../../../infra/database/index.ts';
import { gqlRequest } from '../helpers/request.ts';
import { bootstrapE2E, teardownE2E } from '../helpers/server.ts';
import { CREATE_PROJECT } from '../project/mutation.ts';
import { CREATE_TEAM, UPDATE_TEAM } from './mutation.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

describe('Team Update E2E', () => {
    let owner: { id: string; username: string; email: string };
    let member: { id: string; username: string; email: string };
    let stranger: { id: string; username: string; email: string };
    let ownerToken: string;
    let memberToken: string;
    let strangerToken: string;
    let projectId: string;
    let teamId: string;
    let initialVersion: number;

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
            variables: { name: 'Update Project' },
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
            variables: { projectId, name: 'Old Name' },
            token: ownerToken,
        });
        teamId = tRes.body.data.createTeam.team.id;
        initialVersion = tRes.body.data.createTeam.team.version;
    });

    it('should allow project owner to rename a team', async () => {
        const newName = 'New Team Name';
        const res = await gqlRequest({
            query: UPDATE_TEAM,
            variables: {
                projectId,
                teamId,
                name: newName,
                version: initialVersion,
            },
            token: ownerToken,
        });

        expect(res.status).toBe(200);
        expect(res.body.data.updateTeam.success).toBe(true);
        expect(res.body.data.updateTeam.team.name).toBe(newName);
        expect(res.body.data.updateTeam.team.version).toBe(initialVersion + 1);

        // Verify in DB
        const team = await db
            .selectFrom('project_team')
            .where('id', '=', teamId)
            .selectAll()
            .executeTakeFirst();
        expect(team?.name).toBe(newName);
        expect(team?.version).toBe(initialVersion + 1);
    });

    it('should allow project member to rename a team', async () => {
        const newName = 'Member Renamed This';
        const res = await gqlRequest({
            query: UPDATE_TEAM,
            variables: {
                projectId,
                teamId,
                name: newName,
                version: initialVersion,
            },
            token: memberToken,
        });

        expect(res.body.data.updateTeam.success).toBe(true);
        expect(res.body.data.updateTeam.team.name).toBe(newName);
    });

    it('should fail with ConflictError on version mismatch (Optimistic Locking)', async () => {
        const res = await gqlRequest({
            query: UPDATE_TEAM,
            variables: {
                projectId,
                teamId,
                name: 'Conflict Attempt',
                version: initialVersion + 99, // Wrong version
            },
            token: ownerToken,
        });

        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message).toContain('Team version mismatch');
    });

    it('should fail when a stranger tries to rename a team', async () => {
        const res = await gqlRequest({
            query: UPDATE_TEAM,
            variables: {
                projectId,
                teamId,
                name: 'Illegal Name',
                version: initialVersion,
            },
            token: strangerToken,
        });

        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message).toContain(
            'not found or you are not authorized',
        );
    });

    it('should fail if team name is too short', async () => {
        const res = await gqlRequest({
            query: UPDATE_TEAM,
            variables: {
                projectId,
                teamId,
                name: 'Ab', // < 3 chars
                version: initialVersion,
            },
            token: ownerToken,
        });

        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message).toContain(
            'Team name must be between 3 and 255 characters',
        );
    });
});
