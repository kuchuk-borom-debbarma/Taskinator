/**
 * TIER 1: TeamQueries Integration Tests
 *
 * Runs against the real PostgreSQL database.
 * Verifies:
 *  1. Real SQL executes correctly (SQL syntax bugs now fixed)
 *  2. wCTE outbox_events rows are written atomically
 *  3. Auth rules prevent unauthorized operations
 */
import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { db } from '../../../../database/index.ts';
import { cleanupDb, destroyDb } from '../../../../__tests__/helpers/db.ts';
import {
    createUser,
    createProject,
    addProjectMember,
    createTeam,
    addTeamMember,
} from '../../../../__tests__/helpers/factories.ts';
import {
    insertTeam,
    deleteTeams,
    insertTeamMembers,
    deleteTeamMembers,
    getTeams,
    getTeamMembers,
} from '../TeamQueries.ts';

describe('TeamQueries — Integration (Real DB + wCTE)', () => {
    let ownerId: string;
    let projectId: string;

    beforeEach(async () => {
        await cleanupDb();
        const owner = await createUser();
        ownerId = owner.id;
        const project = await createProject(ownerId);
        projectId = project.id;
    });

    afterAll(async () => {
        await cleanupDb();
        await destroyDb();
    });

    // ─── insertTeam ─────────────────────────────────────────────────────────────

    describe('insertTeam', () => {
        it('creates multiple teams and returns them', async () => {
            const result = await insertTeam({
                userId: ownerId,
                projectId,
                teams: ['Backend', 'Frontend'],
            });

            expect(result).toHaveLength(2);
            const names = result.map((t) => t.name).sort();
            expect(names).toEqual(['Backend', 'Frontend']);
            expect(result[0]!.projectId).toBe(projectId);
        });

        it('writes one outbox_events row per team created', async () => {
            await insertTeam({
                userId: ownerId,
                projectId,
                teams: ['Alpha', 'Beta'],
            });

            const outbox = await db
                .selectFrom('outbox_events')
                .selectAll()
                .where('kafka_topic', '=', 'project.team.created')
                .execute();

            expect(outbox).toHaveLength(2);
            expect((outbox[0]!.payload as any).projectId).toBe(projectId);
        });

        it('returns empty array if caller is not authorized', async () => {
            const attacker = await createUser();

            const result = await insertTeam({
                userId: attacker.id,
                projectId,
                teams: ['Hackers'],
            });

            // Auth check blocks INSERT — no rows returned
            expect(result).toHaveLength(0);
        });

        it('allows a project member (non-owner) to create teams', async () => {
            const member = await createUser();
            await addProjectMember(projectId, member.id);

            const result = await insertTeam({
                userId: member.id,
                projectId,
                teams: ['Member Team'],
            });

            expect(result).toHaveLength(1);
        });
    });

    // ─── deleteTeams ─────────────────────────────────────────────────────────────

    describe('deleteTeams', () => {
        it('deletes own teams and writes outbox events', async () => {
            const teams = await insertTeam({
                userId: ownerId,
                projectId,
                teams: ['To Delete'],
            });
            const teamId = teams[0]!.id;

            // Clear outbox from insertTeam call
            await db.deleteFrom('outbox_events').execute();

            const deleted = await deleteTeams({
                userId: ownerId,
                projectId,
                teamIds: [teamId],
            });

            expect(deleted).toHaveLength(1);
            expect(deleted[0]).toBe(teamId);

            const outbox = await db
                .selectFrom('outbox_events')
                .selectAll()
                .where('kafka_topic', '=', 'project.team.deleted')
                .execute();

            expect(outbox).toHaveLength(1);
            expect((outbox[0]!.payload as any).teamId).toBe(teamId);
        });

        it('throws when trying to delete a team from another project', async () => {
            const otherUser = await createUser();
            const otherProject = await createProject(otherUser.id);
            const foreignTeams = await insertTeam({
                userId: otherUser.id,
                projectId: otherProject.id,
                teams: ['Foreign Team'],
            });

            await expect(
                deleteTeams({
                    userId: ownerId,
                    projectId,
                    teamIds: [foreignTeams[0]!.id],
                }),
            ).rejects.toThrow('Unauthorized or some teams not found');
        });
    });

    // ─── insertTeamMembers ───────────────────────────────────────────────────────

    describe('insertTeamMembers', () => {
        it('adds project members to a team', async () => {
            const team = await createTeam(projectId, ownerId);
            const user = await createUser();
            await addProjectMember(projectId, user.id);

            const result = await insertTeamMembers({
                userId: ownerId,
                projectId,
                teamId: team.id,
                members: [user.id],
            });

            expect(result).toHaveLength(1);
            expect(result[0]!.userId).toBe(user.id);
            expect(result[0]!.teamId).toBe(team.id);
        });

        it('writes outbox_events row for each member added', async () => {
            const team = await createTeam(projectId, ownerId);
            const memberA = await createUser();
            const memberB = await createUser();
            await addProjectMember(projectId, memberA.id);
            await addProjectMember(projectId, memberB.id);

            await db.deleteFrom('outbox_events').execute();

            await insertTeamMembers({
                userId: ownerId,
                projectId,
                teamId: team.id,
                members: [memberA.id, memberB.id],
            });

            const outbox = await db
                .selectFrom('outbox_events')
                .selectAll()
                .where('kafka_topic', '=', 'project.team.member.added')
                .execute();

            expect(outbox).toHaveLength(2);
        });

        it('throws if user is not part of the project', async () => {
            const team = await createTeam(projectId, ownerId);
            const outsider = await createUser(); // NOT added to project

            await expect(
                insertTeamMembers({
                    userId: ownerId,
                    projectId,
                    teamId: team.id,
                    members: [outsider.id],
                }),
            ).rejects.toThrow();
        });
    });

    // ─── deleteTeamMembers ───────────────────────────────────────────────────────

    describe('deleteTeamMembers', () => {
        it('removes team members and writes outbox events', async () => {
            const team = await createTeam(projectId, ownerId);
            const member = await createUser();
            await addProjectMember(projectId, member.id);
            await addTeamMember(projectId, team.id, member.id);

            await db.deleteFrom('outbox_events').execute();

            const deleted = await deleteTeamMembers({
                userId: ownerId,
                projectId,
                teamId: team.id,
                members: [member.id],
            });

            expect(deleted).toHaveLength(1);
            expect(deleted[0]).toBe(member.id);

            const outbox = await db
                .selectFrom('outbox_events')
                .selectAll()
                .where('kafka_topic', '=', 'project.team.member.deleted')
                .execute();

            expect(outbox).toHaveLength(1);
        });

        it('throws if trying to delete members that are not in the team', async () => {
            const team = await createTeam(projectId, ownerId);
            const ghost = await createUser();
            await addProjectMember(projectId, ghost.id);
            // ghost added to project but NOT to team

            await expect(
                deleteTeamMembers({
                    userId: ownerId,
                    projectId,
                    teamId: team.id,
                    members: [ghost.id],
                }),
            ).rejects.toThrow('Unauthorized or some members not found');
        });
    });

    // ─── getTeams / getTeamMembers ───────────────────────────────────────────────

    describe('getTeams', () => {
        it('returns teams for an authorized user', async () => {
            await createTeam(projectId, ownerId, 'Team Alpha');
            await createTeam(projectId, ownerId, 'Team Beta');

            const teams = await getTeams(ownerId, projectId);
            expect(teams).toHaveLength(2);
        });

        it('returns empty for unauthorized user', async () => {
            await createTeam(projectId, ownerId, 'Secret Team');
            const stranger = await createUser();

            const teams = await getTeams(stranger.id, projectId);
            expect(teams).toHaveLength(0);
        });
    });

    describe('getTeamMembers', () => {
        it('returns members of a team when authorized', async () => {
            const team = await createTeam(projectId, ownerId);
            const m = await createUser();
            await addProjectMember(projectId, m.id);
            await addTeamMember(projectId, team.id, m.id);

            const result = await getTeamMembers(ownerId, projectId, team.id);
            expect(result.members).toHaveLength(1);
            expect(result.members[0]!.userId).toBe(m.id);
        });
    });
});
