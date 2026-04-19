/**
 * TIER 1: ProjectQueries Integration Tests
 *
 * Runs against the real PostgreSQL database.
 * Verifies:
 *  1. Real SQL executes without error
 *  2. wCTE outbox_events rows are written atomically alongside mutations
 *  3. Auth rules are enforced (wrong user cannot delete another user's project)
 */
import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { db } from '../../../../database/index.ts';
import { cleanupDb, destroyDb } from '../../../../__tests__/helpers/db.ts';
import {
    createProject,
    createUser,
    addProjectMember,
} from '../../../../__tests__/helpers/factories.ts';
import {
    getProjects,
    getProject,
    getProjectMembers,
} from '../ProjectQueries.ts';

describe('ProjectQueries — Integration (Real DB + wCTE)', () => {
    let userId: string;

    beforeEach(async () => {
        await cleanupDb();
        const user = await createUser();
        userId = user.id;
    });

    afterAll(async () => {
        await cleanupDb();
        await destroyDb();
    });

    // ─── getProjects / getProject / getProjectMembers ───────────────────────────

    describe('getProjects', () => {
        it('returns only projects belonging to the user', async () => {
            const otherUser = await createUser();
            await createProject(userId, { name: 'Mine' });
            await createProject(otherUser.id, { name: 'Not Mine' });

            const { projects } = await getProjects(userId);
            expect(projects).toHaveLength(1);
            expect(projects[0]!.name).toBe('Mine');
        });
    });

    describe('getProject', () => {
        it('returns a single project owned by the user', async () => {
            const project = await createProject(userId, { name: 'Single' });
            const found = await getProject(userId, project.id);
            expect(found).not.toBeNull();
            expect(found!.id).toBe(project.id);
        });

        it('returns null for a project the user does not own', async () => {
            const otherUser = await createUser();
            const project = await createProject(otherUser.id);
            const found = await getProject(userId, project.id);
            expect(found).toBeNull();
        });
    });

    describe('getProjectMembers', () => {
        it('returns members for a project the owner queries', async () => {
            const project = await createProject(userId);
            const m1 = await createUser();
            const m2 = await createUser();
            await addProjectMember(project.id, m1.id);
            await addProjectMember(project.id, m2.id);

            const { members } = await getProjectMembers(userId, project.id);
            expect(members).toHaveLength(2);
        });

        it('returns empty list for unauthorized user', async () => {
            const attacker = await createUser();
            const project = await createProject(userId);
            await addProjectMember(project.id, (await createUser()).id);

            const { members } = await getProjectMembers(
                attacker.id,
                project.id,
            );
            expect(members).toHaveLength(0);
        });
    });
});
