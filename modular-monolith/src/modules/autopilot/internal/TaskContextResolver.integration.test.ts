import { afterAll, describe, expect, it } from '@jest/globals';
import { pool } from '../../../database/index.ts';
import { projectService } from '../../project/index.ts';
import { taskService } from '../../task/index.ts';
import { TaskContextResolver } from './TaskContextResolver';

describe('TaskContextResolver Integration', () => {
    const resolver = new TaskContextResolver();

    afterAll(async () => {
        await pool.end();
    });

    it('should resolve a real task from the database', async () => {
        // Create project first
        const project = await projectService.createProject({
            actorId: 'test-user',
            name: 'Resolver Test Project',
        });
        if (!project) throw new Error('Failed to create project');

        // Create a task
        const task = await taskService.createTask({
            actorId: 'test-user',
            projectId: project.id,
            title: 'Context Resolver Test Task',
            status: 'TODO',
        });

        const context = await resolver.resolve(task.id);

        expect(context).toBeDefined();
        expect(context?.id).toBe(task.id);
        expect(context?.title).toBe('Context Resolver Test Task');
        expect(context?.status).toBe('TODO');
    });

    it('should return null for non-existent task', async () => {
        const context = await resolver.resolve(
            '00000000-0000-0000-0000-000000000001',
        );
        expect(context).toBeNull();
    });
});
