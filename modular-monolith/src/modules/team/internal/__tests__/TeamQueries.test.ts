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
import { getTeams, getTeamMembers, insertTeam } from '../TeamQueries.ts';
import { sql } from 'kysely';

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
            expect(result.members[0]!.userId).toBe(m.id);
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
});
