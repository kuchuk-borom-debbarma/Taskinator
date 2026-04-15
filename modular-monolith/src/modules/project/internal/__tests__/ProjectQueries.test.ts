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
    insertProject,
    insertProjects,
    deleteProjects,
    insertProjectMembers,
    deleteProjectMembers,
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

    // ─── insertProject ─────────────────────────────────────────────────────────

    describe('insertProject', () => {
        it('returns the created project with camelCase fields', async () => {
            const result = await insertProject({
                name: 'My Project',
                description: 'Hello World',
                userId,
            });

            expect(result).not.toBeNull();
            expect(result!.name).toBe('My Project');
            expect(result!.description).toBe('Hello World');
            expect(result!.userId).toBe(userId);
            expect(result!.id).toBeDefined();
            expect(result!.version).toBe(1);
        });

        it('atomically writes an outbox_events row (wCTE guarantee)', async () => {
            const project = await insertProject({
                name: 'Outbox Test',
                userId,
            });

            const outbox = await db
                .selectFrom('outbox_events')
                .selectAll()
                .where('kafka_topic', '=', 'project.created')
                .where('kafka_key', '=', project!.id)
                .execute();

            expect(outbox).toHaveLength(1);
            expect((outbox[0]!.payload as any).projectId).toBe(project!.id);
            expect((outbox[0]!.payload as any).userId).toBe(userId);
        });
    });

    // ─── insertProjects (batch) ─────────────────────────────────────────────────

    describe('insertProjects', () => {
        it('inserts multiple projects atomically', async () => {
            const result = await insertProjects([
                { name: 'Project A', userId },
                { name: 'Project B', userId },
            ]);

            expect(result).toHaveLength(2);
            const names = result.map((p) => p.name).sort();
            expect(names).toEqual(['Project A', 'Project B']);
        });

        it('writes one outbox_events row per project (batch wCTE)', async () => {
            const projects = await insertProjects([
                { name: 'Batch 1', userId },
                { name: 'Batch 2', userId },
            ]);

            const outbox = await db
                .selectFrom('outbox_events')
                .selectAll()
                .where('kafka_topic', '=', 'project.created')
                .execute();

            expect(outbox).toHaveLength(2);
            const outboxKeys = outbox.map((o) => o.kafka_key).sort();
            const projectIds = projects.map((p) => p.id).sort();
            expect(outboxKeys).toEqual(projectIds);
        });

        it('returns empty array when given empty input', async () => {
            const result = await insertProjects([]);
            expect(result).toHaveLength(0);
        });
    });

    // ─── deleteProjects ─────────────────────────────────────────────────────────

    describe('deleteProjects', () => {
        it('deletes own projects and writes an outbox event', async () => {
            const project = await createProject(userId, { name: 'To Delete' });

            const deleted = await deleteProjects({
                userId,
                projectIds: [project.id],
            });

            expect(deleted).toHaveLength(1);
            expect(deleted[0]!.id).toBe(project.id);

            // Row gone from table
            const remaining = await db
                .selectFrom('project')
                .where('id', '=', project.id as any)
                .execute();
            expect(remaining).toHaveLength(0);

            // Outbox row written
            const outbox = await db
                .selectFrom('outbox_events')
                .selectAll()
                .where('kafka_topic', '=', 'project.deleted')
                .where('kafka_key', '=', project.id)
                .execute();
            expect(outbox).toHaveLength(1);
        });

        it('throws if user does not own the project (auth rule)', async () => {
            const otherUser = await createUser();
            const project = await createProject(otherUser.id, {
                name: 'Other Project',
            });

            await expect(
                deleteProjects({ userId, projectIds: [project.id] }),
            ).rejects.toThrow('Unauthorized or some projects not found');
        });
    });

    // ─── insertProjectMembers ───────────────────────────────────────────────────

    describe('insertProjectMembers', () => {
        it('adds members to a project the owner controls', async () => {
            const project = await createProject(userId);
            const member = await createUser();

            const added = await insertProjectMembers({
                userId,
                projectId: project.id,
                usersToAdd: [member.id],
            });

            expect(added).toHaveLength(1);
            expect(added[0]!.userId).toBe(member.id);
            expect(added[0]!.projectId).toBe(project.id);
        });

        it('writes outbox_events row per member added', async () => {
            const project = await createProject(userId);
            const memberA = await createUser();
            const memberB = await createUser();

            await insertProjectMembers({
                userId,
                projectId: project.id,
                usersToAdd: [memberA.id, memberB.id],
            });

            const outbox = await db
                .selectFrom('outbox_events')
                .selectAll()
                .where('kafka_topic', '=', 'project.member.added')
                .execute();

            expect(outbox).toHaveLength(2);
        });

        it('throws if caller is not the project owner', async () => {
            const project = await createProject(userId);
            const attacker = await createUser();
            const victim = await createUser();

            await expect(
                insertProjectMembers({
                    userId: attacker.id,
                    projectId: project.id,
                    usersToAdd: [victim.id],
                }),
            ).rejects.toThrow();
        });
    });

    // ─── deleteProjectMembers ───────────────────────────────────────────────────

    describe('deleteProjectMembers', () => {
        it('removes a member and writes an outbox event', async () => {
            const project = await createProject(userId);
            const member = await createUser();
            const membership = await addProjectMember(project.id, member.id);

            const deleted = await deleteProjectMembers({
                userId,
                projectId: project.id,
                memberIds: [membership.id],
            });

            expect(deleted).toHaveLength(1);
            expect(deleted[0]!.userId).toBe(member.id);

            const outbox = await db
                .selectFrom('outbox_events')
                .selectAll()
                .where('kafka_topic', '=', 'project.member.deleted')
                .execute();
            expect(outbox).toHaveLength(1);
        });
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
