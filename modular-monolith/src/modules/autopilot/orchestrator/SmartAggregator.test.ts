import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { db } from '../../../database/index.js';

// Mock logger
const loggerPathJs = import.meta.resolve('../../../logger/index.js');
mock.module(loggerPathJs, () => ({
    logger: {
        info: mock(() => {}),
        error: mock(() => {}),
        debug: mock(() => {}),
    },
}));

import { SmartAggregator } from './SmartAggregator.js';

const executeSpy = mock(async () => ({ rows: [] }));
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('SmartAggregator', () => {
    let aggregator: SmartAggregator;
    let originalExecuteQuery: any;

    beforeEach(() => {
        executeSpy.mockClear();
        const executor = db.getExecutor();
        originalExecuteQuery = executor.executeQuery;
        executor.executeQuery = executeSpy;
        aggregator = new SmartAggregator();
    });

    afterEach(() => {
        db.getExecutor().executeQuery = originalExecuteQuery;
    });

    it('should buffer multiple updates and flush them after the interval', async () => {
        aggregator.push(
            'project_task',
            'task-1',
            { status: 'DONE' },
            'trace-1',
        );
        aggregator.push('project_task', 'task-2', { priority: 5 }, 'trace-2');

        // Should not have executed yet
        expect(executeSpy).not.toHaveBeenCalled();

        // Wait for interval (100ms) + buffer
        await sleep(250);

        expect(executeSpy).toHaveBeenCalled();

        // Check if the query contains the expected CASE statements
        const executedQuery = (executeSpy as any).mock.calls[0][0];
        const sqlString = executedQuery.sql;

        expect(sqlString).toContain('UPDATE');
        expect(sqlString).toContain('"project_task"');
        expect(sqlString).toContain('INSERT INTO outbox_events');
        expect(sqlString).toContain('CASE id');
        expect(sqlString).toContain('ELSE "status" END');
        expect(sqlString).toContain('ELSE "priority" END');
        expect(sqlString).toContain('WHERE id IN');
    });

    it('should merge multiple updates for the same entity before flushing', async () => {
        aggregator.push(
            'project_task',
            'task-1',
            { status: 'IN_PROGRESS' },
            'trace-1',
        );
        aggregator.push('project_task', 'task-1', { priority: 3 }, 'trace-2');

        await sleep(250);

        expect(executeSpy).toHaveBeenCalledTimes(1);

        const executedQuery = (executeSpy as any).mock.calls[0][0];
        const parameters = executedQuery.parameters;

        expect(parameters).toContain('task-1');
        expect(parameters).toContain('IN_PROGRESS');
        expect(parameters).toContain(3);
    });

    it('should trigger immediate flush when batch size is reached', async () => {
        // Push 500 items
        for (let i = 0; i < 500; i++) {
            aggregator.push(
                'project_task',
                `task-${i}`,
                { status: 'DONE' },
                'trace-1',
            );
        }

        // Should have triggered flush immediately without waiting for timer
        expect(executeSpy).toHaveBeenCalled();
    });

    it('should handle multiple entity types independently', async () => {
        aggregator.push(
            'project_task',
            'task-1',
            { status: 'DONE' },
            'trace-1',
        );
        aggregator.push(
            'project_team',
            'team-1',
            { name: 'New Team' },
            'trace-2',
        );

        await sleep(250);

        // Two separate updates for two different tables
        expect(executeSpy).toHaveBeenCalledTimes(2);
    });

    it('should throw error if traceId is missing in push', () => {
        expect(() => {
            aggregator.push('project_task', 'task-1', { status: 'DONE' }, '');
        }).toThrow('Missing traceId for entity mutation');
    });

    it('should throw error if depth is missing or invalid in push', () => {
        expect(() => {
            aggregator.push(
                'project_task',
                'task-1',
                { status: 'DONE' },
                'trace-1',
                null as any,
            );
        }).toThrow('Missing or invalid depth header for entity mutation');
    });

    it('should keep the oldest traceId and depth during failed buffer recovery merge', async () => {
        // Mock executeBulkUpdate to throw an error
        const originalExecuteBulkUpdate = (aggregator as any).executeBulkUpdate;
        (aggregator as any).executeBulkUpdate = mock(async () => {
            throw new Error('Database error');
        });

        aggregator.push(
            'project_task',
            'task-1',
            { status: 'DONE' },
            'trace-1',
            5,
        );

        // Trigger flush (which will fail and restore buffer)
        try {
            await (aggregator as any).flush('project_task');
        } catch (e) {
            // ignore
        }

        // Now push a new change to the same entity with a new traceId/depth
        aggregator.push(
            'project_task',
            'task-1',
            { priority: 2 },
            'trace-2',
            10,
        );

        // Verify that the buffered item has the oldest traceId/depth (trace-1 and 5)
        const bufferedItem = (aggregator as any).buffer
            .get('project_task')
            ?.get('task-1');
        expect(bufferedItem).toBeDefined();
        expect(bufferedItem?.traceId).toBe('trace-1');
        expect(bufferedItem?.depth).toBe(5);
        expect(bufferedItem?.changes).toEqual({ status: 'DONE', priority: 2 });
    });

    it('should compile CTE queries for project_team and project correctly', async () => {
        // Push project_team changes
        aggregator.push(
            'project_team',
            'team-1',
            { name: 'Engineering Team' },
            'trace-1',
            2,
        );
        await sleep(250);

        const teamQuery = (executeSpy as any).mock.calls[0][0].sql;
        expect(teamQuery).toContain('UPDATE "project_team"');
        expect(teamQuery).toContain('team-events');
        expect(teamQuery).toContain('team.updated');
        expect(teamQuery).toContain('teamId');

        // Push project changes
        executeSpy.mockClear();
        aggregator.push(
            'project',
            'project-1',
            { name: 'Main Project' },
            'trace-2',
            3,
        );
        await sleep(250);

        const projectQuery = (executeSpy as any).mock.calls[0][0].sql;
        expect(projectQuery).toContain('UPDATE "project"');
        expect(projectQuery).toContain('project-events');
        expect(projectQuery).toContain('project.updated');
        expect(projectQuery).toContain('projectId');
    });
});
