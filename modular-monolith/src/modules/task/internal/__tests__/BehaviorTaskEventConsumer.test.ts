import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { KAFKA_EVENTS } from '../../../../utils/event-bus/constants.ts';

const mockSelectFrom = jest.fn<any>();
const mockSelectAll = jest.fn<any>();
const mockWhere = jest.fn<any>();
const mockExecute = jest.fn<any>();

jest.unstable_mockModule('../../../../database/index.ts', () => ({
    db: {
        selectFrom: mockSelectFrom,
    },
}));

const mockResolveBlockers = jest.fn<(...args: any[]) => Promise<void>>();
const mockCascadePriority = jest.fn<(...args: any[]) => Promise<void>>();
const mockCascadeTeam = jest.fn<(...args: any[]) => Promise<void>>();
const mockCascadeDelete = jest.fn<(...args: any[]) => Promise<void>>();

jest.unstable_mockModule('../CascadeService.ts', () => ({
    cascadeService: {
        resolveBlockers: mockResolveBlockers,
        cascadePriority: mockCascadePriority,
        cascadeTeam: mockCascadeTeam,
        cascadeDelete: mockCascadeDelete,
    },
}));

const { BehaviorTaskEventConsumer } = await import(
    '../listeners/BehaviorTaskEventConsumer.ts'
);

describe('BehaviorTaskEventConsumer Cascades', () => {
    const consumer = new BehaviorTaskEventConsumer();
    const projectId = 'project-123';
    const taskId = 'task-123';
    const actorId = 'user-123';

    beforeEach(() => {
        jest.clearAllMocks();

        mockSelectFrom.mockReturnValue({
            selectAll: mockSelectAll,
        });
        mockSelectAll.mockReturnValue({
            where: mockWhere,
        });
        mockWhere.mockReturnValue({
            where: mockWhere,
            execute: mockExecute,
        });
    });

    it('BLOCKER_RESOLUTION triggers blocker resolution cascade when criteria matches', async () => {
        mockExecute.mockResolvedValue([
            {
                id: 'rule-cascade-1',
                fk_project_id: projectId,
                behavior_type: 'BLOCKER_RESOLUTION',
                is_active: true,
                criteria_field: 'status',
                criteria_operator: 'EQUALS',
                criteria_value: 'DONE',
                action_value: 'READY',
            },
        ]);

        await consumer.handleTaskEvents([
            {
                eventId: 'event-1',
                type: KAFKA_EVENTS.TASK.UPDATED,
                key: projectId,
                timestamp: new Date().toISOString(),
                data: {
                    projectId,
                    taskId,
                    actorId,
                    new: {
                        status: 'DONE',
                    },
                },
            },
        ]);

        expect(mockResolveBlockers).toHaveBeenCalledWith({
            actorId,
            taskId,
            targetStatus: 'READY',
            traceId: undefined,
        });
    });

    it('PRIORITY_CASCADE triggers priority cascade when criteria matches', async () => {
        mockExecute.mockResolvedValue([
            {
                id: 'rule-cascade-2',
                fk_project_id: projectId,
                behavior_type: 'PRIORITY_CASCADE',
                is_active: true,
                criteria_field: 'priority',
                criteria_operator: 'EQUALS',
                criteria_value: '5',
                action_value: '5',
            },
        ]);

        await consumer.handleTaskEvents([
            {
                eventId: 'event-2',
                type: KAFKA_EVENTS.TASK.UPDATED,
                key: projectId,
                timestamp: new Date().toISOString(),
                data: {
                    projectId,
                    taskId,
                    actorId,
                    new: {
                        priority: 5,
                    },
                },
            },
        ]);

        expect(mockCascadePriority).toHaveBeenCalledWith({
            actorId,
            taskId,
            priority: 5,
            traceId: undefined,
        });
    });

    it('TEAM_CASCADE triggers team assignment cascade when criteria matches', async () => {
        mockExecute.mockResolvedValue([
            {
                id: 'rule-cascade-3',
                fk_project_id: projectId,
                behavior_type: 'TEAM_CASCADE',
                is_active: true,
                criteria_field: 'teamId',
                criteria_operator: 'EQUALS',
                criteria_value: 'team-456',
            },
        ]);

        await consumer.handleTaskEvents([
            {
                eventId: 'event-3',
                type: KAFKA_EVENTS.TASK.UPDATED,
                key: projectId,
                timestamp: new Date().toISOString(),
                data: {
                    projectId,
                    taskId,
                    actorId,
                    new: {
                        teamId: 'team-456',
                    },
                },
            },
        ]);

        expect(mockCascadeTeam).toHaveBeenCalledWith({
            actorId,
            taskId,
            teamId: 'team-456',
            traceId: undefined,
        });
    });

    it('CASCADE_DELETE triggers cascade delete when parent task is deleted', async () => {
        mockExecute.mockResolvedValue([
            {
                id: 'rule-cascade-4',
                fk_project_id: projectId,
                behavior_type: 'CASCADE_DELETE',
                is_active: true,
            },
        ]);

        await consumer.handleTaskEvents([
            {
                eventId: 'event-4',
                type: KAFKA_EVENTS.TASK.DELETED,
                key: projectId,
                timestamp: new Date().toISOString(),
                data: {
                    projectId,
                    taskId,
                    actorId,
                },
            },
        ]);

        expect(mockCascadeDelete).toHaveBeenCalledWith({
            actorId,
            taskId,
            traceId: undefined,
        });
    });
});
