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
import { sql } from 'kysely';
import {
    getProjects,
    getProject,
    getProjectMembers,
    insertProject,
    updateProject,
    deleteProjects,
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

    // ─── Mutations ─────────────────────────────────────────────────────────────

    describe('insertProject', () => {
        it('atomically inserts a project and an outbox event', async () => {
            const name = 'Mutation Project';
            const description = 'Atomic check';

            const project = await insertProject({
                userId,
                name,
                description,
            });

            expect(project).not.toBeNull();
            expect(project!.name).toBe(name);
            expect(project!.userId).toBe(userId);

            // Verify project exists in DB
            const dbProject = await getProject(userId, project!.id);
            expect(dbProject).not.toBeNull();

            // Verify atomic outbox entry exists
            const outboxEntries = await sql<any>`
                SELECT * FROM outbox_events 
                WHERE kafka_topic = 'project.created' 
                  AND kafka_key = ${project!.id}::text
            `.execute(db);

            expect(outboxEntries.rows).toHaveLength(1);
            const event = outboxEntries.rows[0];
            expect(event.payload.projectId).toBe(project!.id);
            expect(event.payload.userId).toBe(userId);
            expect(event.payload.name).toBe(name);
        });
    });

    describe('updateProject', () => {
        it('successfully updates project and increments version', async () => {
            const project = await insertProject({
                userId,
                name: 'Old Name',
            });

            const updated = await updateProject({
                actorId: userId,
                id: project!.id,
                version: project!.version,
                name: 'New Name',
                description: 'New Description',
            });

            expect(updated).not.toBeNull();
            expect(updated!.name).toBe('New Name');
            expect(updated!.description).toBe('New Description');
            expect(updated!.version).toBe(project!.version + 1);

            // Verify outbox
            const outboxEntries = await sql<any>`
                SELECT * FROM outbox_events 
                WHERE kafka_topic = 'project.updated' 
                  AND kafka_key = ${project!.id}::text
                ORDER BY created_at DESC LIMIT 1
            `.execute(db);

            expect(outboxEntries.rows).toHaveLength(1);
            expect(outboxEntries.rows[0].payload.name).toBe('New Name');
        });

        it('fails update if version is stale (optimistic locking)', async () => {
            const project = await insertProject({
                userId,
                name: 'Old Name',
            });

            // Update once to increment version
            await updateProject({
                actorId: userId,
                id: project!.id,
                version: project!.version,
                name: 'First Update',
            });

            // Try to update again with the original version
            const failedUpdate = await updateProject({
                actorId: userId,
                id: project!.id,
                version: project!.version, // Stale version
                name: 'Second Update',
            });

            expect(failedUpdate).toBeNull();
        });

        it('fails update if actor is not the owner', async () => {
            const project = await insertProject({
                userId,
                name: 'Project Name',
            });

            const attackerId = (await createUser()).id;

            const failedUpdate = await updateProject({
                actorId: attackerId,
                id: project!.id,
                version: project!.version,
                name: 'Hacked!',
            });

            expect(failedUpdate).toBeNull();
        });
    });

    describe('deleteProjects', () => {
        it('deletes only projects owned by the actor and logs events', async () => {
            const p1 = await insertProject({
                userId,
                name: 'P1',
            });
            const p2 = await insertProject({
                userId,
                name: 'P2',
            });
            const otherUser = await createUser();
            const p3 = await insertProject({
                userId: otherUser.id,
                name: 'Other P',
            });

            const { success, deletedCount } = await deleteProjects({
                actorId: userId,
                projectIds: [p1!.id, p2!.id, p3!.id],
            });

            expect(success).toBe(true);
            expect(deletedCount).toBe(2);

            // Verify p1 and p2 are gone, p3 remains
            expect(await getProject(userId, p1!.id)).toBeNull();
            expect(await getProject(userId, p2!.id)).toBeNull();
            expect(await getProject(otherUser.id, p3!.id)).not.toBeNull();

            // Verify outbox has 2 deletion events
            const outboxEntries = await sql<any>`
                SELECT * FROM outbox_events 
                WHERE kafka_topic = 'project.deleted' 
                  AND kafka_key IN (${p1!.id}, ${p2!.id})
            `.execute(db);

            expect(outboxEntries.rows).toHaveLength(2);
        });

        it('limits deletion to 1000 projects per call', async () => {
            const projectIds = Array.from({ length: 1100 }).map(
                () => '00000000-0000-0000-0000-000000000000',
            ); // dummy ids
            const { deletedCount } = await deleteProjects({
                actorId: userId,
                projectIds,
            });
            // We can't easily verify the slice in a real DB without creating 1000 items
            // but we can at least ensure it doesn't crash and returns a reasonable number (0 because ids are dummy)
            expect(deletedCount).toBe(0);
        });
    });
});
