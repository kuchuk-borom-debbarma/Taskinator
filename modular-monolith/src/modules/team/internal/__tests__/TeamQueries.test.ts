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
import { sql } from 'kysely';
import { cleanupDb, destroyDb } from '../../../../__tests__/helpers/db.ts';
import {
    addProjectMember,
    addTeamMember,
    createProject,
    createTeam,
    createUser,
} from '../../../../__tests__/helpers/factories.ts';
import { db } from '../../../../database/index.ts';
import { ConflictError, NotFoundError } from '../../../../graphql/errors.ts';
import {
    deleteTeamMembers,
    deleteTeams,
    getTeamMembers,
    getTeams,
    insertTeam,
    insertTeamMembers,
    updateTeam,
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
            expect(result.members[0]?.userId).toBe(m.id);
        });
    });

    // ─── insertTeam ─────────────────────────────────────────────────────────────
    describe('insertTeam', () => {
        it('allows project owner to create a team', async () => {
            const team = await insertTeam({
                actorId: ownerId,
                projectId: projectId,
                name: 'Owner Team',
            });

            expect(team.name).toBe('Owner Team');
            expect(team.projectId).toBe(projectId);

            // Verify outbox
            const outbox =
                await sql<any>`SELECT * FROM outbox_events WHERE kafka_topic = 'team.created'`.execute(
                    db,
                );
            expect(outbox.rows).toHaveLength(1);
            expect(outbox.rows[0].payload.teamId).toBe(team.id);
        });

        it('allows project member to create a team', async () => {
            const member = await createUser();
            await addProjectMember(projectId, member.id);

            const team = await insertTeam({
                actorId: member.id,
                projectId: projectId,
                name: 'Member Team',
            });

            expect(team.name).toBe('Member Team');
        });

        it('throws NotFoundError for non-members', async () => {
            const stranger = await createUser();
            await expect(
                insertTeam({
                    actorId: stranger.id,
                    projectId: projectId,
                    name: 'Rogue Team',
                }),
            ).rejects.toThrow('Project with ID');
        });
    });

    describe('deleteTeams', () => {
        it('deletes teams and logs outbox events', async () => {
            const t1 = await createTeam(projectId, ownerId);
            const t2 = await createTeam(projectId, ownerId);

            const { deletedCount } = await deleteTeams({
                actorId: ownerId,
                projectId,
                teamIds: [t1.id, t2.id],
            });

            expect(deletedCount).toBe(2);

            const remaining = await getTeams(ownerId, projectId);
            expect(remaining).toHaveLength(0);

            const outbox =
                await sql<any>`SELECT * FROM outbox_events WHERE kafka_topic = 'team.deleted'`.execute(
                    db,
                );
            expect(outbox.rows).toHaveLength(2);
        });
    });

    describe('addTeamMembers', () => {
        it('adds members and logs outbox event', async () => {
            const team = await createTeam(projectId, ownerId);
            const u1 = await createUser();
            const u2 = await createUser();
            await addProjectMember(projectId, u1.id);
            await addProjectMember(projectId, u2.id);

            const { addedCount } = await insertTeamMembers({
                actorId: ownerId,
                projectId,
                teamId: team.id,
                userIds: [u1.id, u2.id],
            });

            expect(addedCount).toBe(2);

            const members = await getTeamMembers(ownerId, projectId, team.id);
            expect(members.members).toHaveLength(2);

            const outbox =
                await sql<any>`SELECT * FROM outbox_events WHERE kafka_topic = 'team.members_added'`.execute(
                    db,
                );
            expect(outbox.rows).toHaveLength(1);
            expect(outbox.rows[0].payload.userIds).toContain(u1.id);
        });
    });

    describe('removeTeamMembers', () => {
        it('removes members and logs outbox event', async () => {
            const team = await createTeam(projectId, ownerId);
            const u1 = await createUser();
            await addProjectMember(projectId, u1.id);
            await addTeamMember(projectId, team.id, u1.id);

            const { removedCount } = await deleteTeamMembers({
                actorId: ownerId,
                projectId,
                teamId: team.id,
                userIds: [u1.id],
            });

            expect(removedCount).toBe(1);

            const members = await getTeamMembers(ownerId, projectId, team.id);
            expect(members.members).toHaveLength(0);

            const outbox =
                await sql<any>`SELECT * FROM outbox_events WHERE kafka_topic = 'team.members_removed'`.execute(
                    db,
                );
            expect(outbox.rows).toHaveLength(1);
        });
    });

    describe('updateTeam', () => {
        it('updates team name and increments version', async () => {
            const team = await createTeam(projectId, ownerId, 'Old Name');

            const updated = await updateTeam({
                actorId: ownerId,
                projectId,
                teamId: team.id,
                name: 'New Name',
                version: team.version,
            });

            expect(updated.name).toBe('New Name');
            expect(updated.version).toBe(team.version + 1);

            const outbox =
                await sql<any>`SELECT * FROM outbox_events WHERE kafka_topic = 'team.updated'`.execute(
                    db,
                );
            expect(outbox.rows).toHaveLength(1);
            expect(outbox.rows[0].payload.name).toBe('New Name');
        });

        it('throws ConflictError on version mismatch', async () => {
            const team = await createTeam(projectId, ownerId);

            await expect(
                updateTeam({
                    actorId: ownerId,
                    projectId,
                    teamId: team.id,
                    name: 'Stale Update',
                    version: team.version - 1, // Wrong version
                }),
            ).rejects.toThrow(ConflictError);
        });

        it('throws NotFoundError for non-existent team', async () => {
            const randomId = '00000000-0000-0000-0000-000000000000';
            await expect(
                updateTeam({
                    actorId: ownerId,
                    projectId,
                    teamId: randomId,
                    name: 'Ghost Team',
                    version: 0,
                }),
            ).rejects.toThrow(NotFoundError);
        });
    });
});
