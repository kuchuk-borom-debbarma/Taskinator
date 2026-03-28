import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { projectService } from '../../index';
import { taskProjectCleanup } from '../../../../kafka/registry';
import { db } from '../../../../database';
import { insertProject } from '../ProjectQueries';
import { insertTask } from '../../../task/internal/TaskQueries';

// Helper to wait for async event processing
const waitFor = async (assertion: () => Promise<void>, timeout = 2000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        try {
            await assertion();
            return;
        } catch (e) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }
    await assertion();
};

describe('Project Cleanup Integration (In-Memory Event Bus)', () => {
    const userId = 'test-user-123';
    let projectId: string;

    beforeAll(async () => {
        // EventBus will automatically be MemoryBus because process.env.NODE_ENV === 'test'
        await projectService.init();
        await taskProjectCleanup.init();
    });

    afterAll(async () => {
        await projectService.destroy();
        await taskProjectCleanup.stop();
    });

    it('should delete all tasks when a project is deleted', async () => {
        // 1. Setup
        const project = await insertProject({
            userId,
            name: 'Test Project',
            description: 'Memory Cleanup Test',
        });
        projectId = project!.id;

        const task = await insertTask({
            projectId,
            userId,
            title: 'Task to be deleted',
            initialStatus: 'OPEN',
            description: 'This should disappear',
        });

        // 2. Act
        await projectService.deleteProjects({
            userId,
            projectIds: [projectId],
        });

        // 3. Assert (Poll DB for cleanup)
        await waitFor(async () => {
            const remainingTasks = await db
                .selectFrom('projectTask')
                .where('fk_project_id', '=', projectId)
                .execute();

            expect(remainingTasks.length).toBe(0);
        });
    });
});
