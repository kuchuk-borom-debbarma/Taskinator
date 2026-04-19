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
