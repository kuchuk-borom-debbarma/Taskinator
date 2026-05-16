/**
 * @file ContextBuilder.test.ts
 * @description Tests for the Evaluation Context Builder.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../database/index.js';
import { ContextBuilder } from './ContextBuilder.js';

describe('ContextBuilder', () => {
    let builder: ContextBuilder;
    const projectId = uuidv4();
    const taskId = uuidv4();
    const userId = 'user-123';

    beforeEach(async () => {
        builder = new ContextBuilder();

        // Clean up and setup minimal data
        await db
            .deleteFrom('project_task')
            .where('id', '=', taskId as any)
            .execute();
        await db
            .deleteFrom('project')
            .where('id', '=', projectId as any)
            .execute();

        await db
            .insertInto('project')
            .values({
                id: projectId,
                name: 'Test Project',
                fk_user_id: userId,
                version: 1,
            })
            .execute();

        await db
            .insertInto('project_task')
            .values({
                id: taskId,
                fk_project_id: projectId,
                title: 'Initial Title',
                status: 'TODO',
                created_by: userId,
                updated_by: userId,
                version: 1,
            })
            .execute();
    });

    it('should build context with fresh "is" state from DB', async () => {
        const was = { title: 'Old Title', status: 'TODO' };

        const context = await builder.buildContext('project_task', taskId, was);

        expect(context.is.title).toBe('Initial Title');
        expect(context.is.status).toBe('TODO');
        expect(context.was.title).toBe('Old Title');
    });

    it('should reflect live updates in "is" state', async () => {
        const was = { status: 'TODO' };

        // 1. Initial build
        let context = await builder.buildContext('project_task', taskId, was);
        expect(context.is.status).toBe('TODO');

        // 2. Update DB manually
        await db
            .updateTable('project_task')
            .set({ status: 'IN_PROGRESS' })
            .where('id', '=', taskId as any)
            .execute();

        // 3. Re-build context should show fresh data
        context = await builder.buildContext('project_task', taskId, was);
        expect(context.is.status).toBe('IN_PROGRESS');
    });

    it('should handle non-existent entities gracefully', async () => {
        const context = await builder.buildContext('project_task', uuidv4(), {
            status: 'NONE',
        });

        expect(context.is).toEqual({});
        expect(context.was.status).toBe('NONE');
    });

    it('should support project entities', async () => {
        const context = await builder.buildContext('project', projectId);

        expect(context.is.name).toBe('Test Project');
        expect(context.was).toEqual({});
    });
});
