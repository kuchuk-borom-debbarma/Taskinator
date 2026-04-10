/**
 * TIER 2 EDA: Project Deleted — Full Chain Integration Test
 *
 * Verifies the complete fan-out chain when a project is deleted:
 *
 *   deleteProjects (wCTE)
 *       ↓ writes outbox_events[project.deleted]
 *   OutboxRelay polls
 *       ↓ publishes to MemoryBus (project-events topic)
 *   task-cleanup-group listener (ProjectDeletedListener in task module)
 *       ↓ deleteAllProjectTasks(projectId)
 *   member-cleanup-group listener (MemberCleanupListener in project module)
 *       ↓ deleteAllProjectMembers(projectId)
 *
 * This is a real end-to-end flow with a real DB and the in-memory event bus.
 * NODE_ENV=test means the MemoryBus is used automatically.
 */
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
} from '@jest/globals';
import { db } from '../database/index.ts';
import { cleanupDb, destroyDb } from './helpers/db.ts';
import {
    createUser,
    createProject,
    createTask,
    addProjectMember,
} from './helpers/factories.ts';
import { waitFor } from './helpers/waitFor.ts';
import { projectService } from '../modules/project/index.ts';
import { projectDeletedListener as taskProjectCleanup } from '../modules/task/internal/listeners/ProjectDeletedListener.ts';
import { memberCleanupListener as memberProjectCleanup } from '../modules/project/internal/listeners/ProjectDeletedListener.ts';
import {
    startOutboxRelay,
    stopOutboxRelay,
} from '../utils/event-bus/OutboxRelay.ts';

describe('Project Deleted EDA Flow — Integration', () => {
    beforeAll(async () => {
        await projectService.init();
        await taskProjectCleanup.init();
        await memberProjectCleanup.init();
        startOutboxRelay();
    });

    afterAll(async () => {
        stopOutboxRelay();
        await projectService.destroy();
        await cleanupDb();
        await destroyDb();
    });

    beforeEach(async () => {
        await cleanupDb();
    });

    it('deletes all tasks when a project is deleted', async () => {
        const owner = await createUser();
        const project = await createProject(owner.id, {
            name: 'Doomed Project',
        });
        await createTask(project.id, owner.id, { title: 'Task 1' });
        await createTask(project.id, owner.id, { title: 'Task 2' });

        // Act: delete via service (which uses the wCTE to write outbox)
        await projectService.deleteProjects({
            userId: owner.id,
            projectIds: [project.id],
        });

        // Assert: relay picks up outbox event → listener deletes tasks
        await waitFor(async () => {
            const remaining = await db
                .selectFrom('project_task')
                .where('fk_project_id', '=', project.id as any)
                .execute();
            expect(remaining).toHaveLength(0);
        });
    });

    it('deletes all project members when a project is deleted', async () => {
        const owner = await createUser();
        const project = await createProject(owner.id, {
            name: 'Members Project',
        });
        const m1 = await createUser();
        const m2 = await createUser();
        await addProjectMember(project.id, m1.id);
        await addProjectMember(project.id, m2.id);

        await projectService.deleteProjects({
            userId: owner.id,
            projectIds: [project.id],
        });

        await waitFor(async () => {
            const remaining = await db
                .selectFrom('project_member')
                .where('fk_project_id', '=', project.id as any)
                .execute();
            expect(remaining).toHaveLength(0);
        });
    });

    it('cleans up both tasks and members from a fully populated project', async () => {
        const owner = await createUser();
        const project = await createProject(owner.id, { name: 'Full Project' });
        const member = await createUser();
        await addProjectMember(project.id, member.id);
        await createTask(project.id, owner.id, { title: 'T1' });
        await createTask(project.id, owner.id, { title: 'T2' });
        await createTask(project.id, member.id, { title: 'T3' });

        await projectService.deleteProjects({
            userId: owner.id,
            projectIds: [project.id],
        });

        await waitFor(async () => {
            const tasks = await db
                .selectFrom('project_task')
                .where('fk_project_id', '=', project.id as any)
                .execute();
            const members = await db
                .selectFrom('project_member')
                .where('fk_project_id', '=', project.id as any)
                .execute();

            expect(tasks).toHaveLength(0);
            expect(members).toHaveLength(0);
        });
    });

    it('clears matching outbox_events rows after relay publishes', async () => {
        const owner = await createUser();
        const project = await createProject(owner.id);

        await projectService.deleteProjects({
            userId: owner.id,
            projectIds: [project.id],
        });

        // Relay should delete outbox rows after publishing
        await waitFor(async () => {
            const outbox = await db
                .selectFrom('outbox_events')
                .where('kafka_topic', '=', 'project.deleted')
                .execute();
            expect(outbox).toHaveLength(0);
        });
    });
});
