import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ValidationError } from '../../../../infra/graphql/errors.ts';
import type { DomainEvent } from '../../../../infra/utils/event-bus';
import type { Task } from '../../TaskService.ts';

const projectId = '11111111-1111-4111-8111-111111111111';
const actorId = 'user-1';
const blockedTaskId = '33333333-3333-4333-8333-333333333333';

const mockTask: Task = {
    id: blockedTaskId,
    projectId,
    teamId: null,
    memberId: null,
    title: 'Test task',
    description: '',
    status: 'TODO',
    version: 1,
    createdBy: actorId,
    updatedBy: actorId,
    priority: 0,
    createdAt: new Date('2026-05-24T00:00:00.000Z'),
    updatedAt: new Date('2026-05-24T00:00:00.000Z'),
    directIncomingCount: 0,
    directOutgoingCount: 0,
    totalIncomingCount: 0,
    totalOutgoingCount: 0,
    incomingLabelCounts: {},
    outgoingLabelCounts: {},
};

const mockGetTasksByActorIdAndIds =
    jest.fn<(...args: any[]) => Promise<Task[]>>();
const mockUpdateTaskQuery = jest.fn<(...args: any[]) => Promise<Task>>();
const mockTaskServiceUpdateTask = jest.fn<(...args: any[]) => Promise<Task>>();
const mockEventBusSubscribe = jest.fn<(...args: any[]) => Promise<void>>();

const makeQuery = (rows: any[]) => {
    const query: any = {
        innerJoin: jest.fn(() => query),
        limit: jest.fn(() => query),
        orderBy: jest.fn(() => query),
        select: jest.fn(() => query),
        selectAll: jest.fn(() => query),
        where: jest.fn(() => query),
        execute: jest.fn(async () => rows),
        executeTakeFirst: jest.fn(async () => rows[0]),
    };
    return query;
};

const mockDb = {
    selectFrom: jest.fn((_table: string) => makeQuery([])),
};

jest.unstable_mockModule('../../../../infra/database/index.ts', () => ({
    db: mockDb,
}));

jest.unstable_mockModule('../../../../infra/utils/EventBus.ts', () => ({
    default: {
        subscribe: mockEventBusSubscribe,
    },
}));

jest.unstable_mockModule('../../index.ts', () => ({
    taskService: {
        updateTask: mockTaskServiceUpdateTask,
    },
}));

jest.unstable_mockModule('../TaskQueries.ts', () => ({
    BULK_DELETE_CHUNK_SIZE: 2000,
    contractTaskReachability: jest.fn(),
    deleteProjectTaskLinksChunk: jest.fn(),
    deleteProjectTaskReachabilityChunk: jest.fn(),
    deleteProjectTasksChunk: jest.fn(),
    deleteTask: jest.fn(),
    deleteTaskLink: jest.fn(),
    deleteTaskLinksByTaskIds: jest.fn(),
    deleteTaskReachabilityChunk: jest.fn(),
    expandTaskReachability: jest.fn(),
    getNeighbourhood: jest.fn(),
    getProjectTaskLinksPage: jest.fn(),
    getTaskContextById: jest.fn(),
    getTaskLinksPage: jest.fn(),
    getTasksByActorIdAndIds: mockGetTasksByActorIdAndIds,
    getTasksByIds: jest.fn(),
    getTasksPage: jest.fn(),
    insertTask: jest.fn(),
    insertTaskLink: jest.fn(),
    orphanTasksByTeamIdsBatch: jest.fn(),
    repairTaskReachabilityForProjects: jest.fn(),
    syncTaskGraphCounters: jest.fn(),
    unassignMembersFromTeamTasksBatch: jest.fn(),
    unassignProjectTaskMembersBatch: jest.fn(),
    updateTask: mockUpdateTaskQuery,
    updateTaskLink: jest.fn(),
}));

const { TaskServiceImpl } = await import('../TaskServiceImpl.ts');
const { TaskAutomationListener } = await import(
    '../listeners/TaskAutomationListener.ts'
);

describe('Task TCA automation engine', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetTasksByActorIdAndIds.mockResolvedValue([mockTask]);
        mockUpdateTaskQuery.mockResolvedValue({
            ...mockTask,
            status: 'IN_PROGRESS',
            version: 2,
        });
        mockTaskServiceUpdateTask.mockResolvedValue({
            ...mockTask,
            memberId: actorId,
            version: 2,
        });
    });

    it('rejects sync status transitions if status condition matches and action is REJECT_TRANSITION', async () => {
        mockDb.selectFrom.mockReturnValueOnce(
            makeQuery([
                {
                    id: 'rule-1',
                    fk_project_id: projectId,
                    is_active: true,
                    is_sync: true,
                    trigger_type: 'STATUS_CHANGED',
                    trigger_value: JSON.stringify({ to: 'IN_PROGRESS' }),
                    condition_type: 'STATUS_EQUALS',
                    condition_value: 'TODO',
                    action_type: 'REJECT_TRANSITION',
                    action_value: 'Transition is blocked by sync rule.',
                },
            ]),
        );

        const service = new TaskServiceImpl();

        await expect(
            service.updateTask({
                actorId,
                projectId,
                taskId: blockedTaskId,
                version: 1,
                status: 'IN_PROGRESS',
            }),
        ).rejects.toThrow(ValidationError);

        expect(mockUpdateTaskQuery).not.toHaveBeenCalled();
    });

    it('triggers async status-changed rules and executes actions in the background', async () => {
        mockDb.selectFrom
            .mockReturnValueOnce(
                makeQuery([
                    {
                        id: 'rule-2',
                        fk_project_id: projectId,
                        is_active: true,
                        is_sync: false,
                        trigger_type: 'STATUS_CHANGED',
                        trigger_value: JSON.stringify({ to: 'DONE' }),
                        condition_type: 'STATUS_EQUALS',
                        condition_value: 'DONE',
                        action_type: 'SET_ASSIGNEE',
                        action_value: 'actor',
                    },
                ]),
            )
            .mockReturnValueOnce(
                makeQuery([
                    {
                        id: blockedTaskId,
                        fk_project_id: projectId,
                        fk_team_id: null,
                        fk_member_id: null,
                        title: 'Test task',
                        description: '',
                        status: 'DONE',
                        version: 1,
                        created_by: actorId,
                        updated_by: actorId,
                        priority: 0,
                        created_at: new Date('2026-05-24T00:00:00.000Z'),
                        updated_at: new Date('2026-05-24T00:00:00.000Z'),
                        direct_incoming_count: 0,
                        direct_outgoing_count: 0,
                        total_incoming_count: 0,
                        total_outgoing_count: 0,
                        incoming_label_counts: {},
                        outgoing_label_counts: {},
                    },
                ]),
            );

        const event: DomainEvent<{
            taskId: string;
            projectId: string;
            old: { status: string };
            new: { status: string };
            actorId: string;
        }> = {
            eventId: 'event-1',
            type: 'task.updated',
            key: projectId,
            data: {
                taskId: blockedTaskId,
                projectId,
                old: { status: 'TODO' },
                new: { status: 'DONE' },
                actorId,
            },
            timestamp: '2026-05-24T00:00:00.000Z',
        };

        const listener = new TaskAutomationListener();
        await (listener as any).handleTaskUpdated([event]);

        expect(mockTaskServiceUpdateTask).toHaveBeenCalledWith({
            actorId,
            projectId,
            taskId: blockedTaskId,
            version: 1,
            memberId: actorId,
        });
    });

    it('triggers async LINKED_INCOMING_STATUS_CHANGED rules and executes actions in the background', async () => {
        const mockTargetTaskId = 'target-task-1';
        let linkQueryCallCount = 0;
        mockDb.selectFrom.mockImplementation((table: string) => {
            if (table === 'task_link') {
                linkQueryCallCount++;
                if (linkQueryCallCount === 1) {
                    return makeQuery([
                        { target_task_id: mockTargetTaskId, label: 'blocks' },
                    ]);
                }
                return makeQuery([]);
            }
            if (table === 'task_automation_rule') {
                return makeQuery([
                    {
                        id: 'rule-3',
                        fk_project_id: projectId,
                        is_active: true,
                        is_sync: false,
                        trigger_type: 'LINKED_INCOMING_STATUS_CHANGED',
                        trigger_value: 'blocks',
                        condition_type: 'ALL_LINKED_INCOMING_IN_STATUS',
                        condition_value: JSON.stringify({
                            label: 'blocks',
                            status: 'DONE',
                        }),
                        action_type: 'SET_STATUS',
                        action_value: 'READY',
                    },
                ]);
            }
            if (table === 'project_task') {
                return makeQuery([
                    {
                        id: mockTargetTaskId,
                        fk_project_id: projectId,
                        fk_team_id: null,
                        fk_member_id: null,
                        title: 'Test task',
                        description: '',
                        status: 'TODO',
                        version: 1,
                        created_by: actorId,
                        updated_by: actorId,
                        priority: 0,
                        created_at: new Date('2026-05-24T00:00:00.000Z'),
                        updated_at: new Date('2026-05-24T00:00:00.000Z'),
                    },
                ]);
            }
            return makeQuery([]);
        });

        const event: DomainEvent<{
            taskId: string;
            projectId: string;
            old: { status: string };
            new: { status: string };
            actorId: string;
        }> = {
            eventId: 'event-2',
            type: 'task.updated',
            key: projectId,
            data: {
                taskId: blockedTaskId,
                projectId,
                old: { status: 'TODO' },
                new: { status: 'DONE' },
                actorId,
            },
            timestamp: '2026-05-24T00:00:00.000Z',
        };

        const listener = new TaskAutomationListener();
        await (listener as any).handleTaskUpdated([event]);

        expect(mockTaskServiceUpdateTask).toHaveBeenCalledWith({
            actorId,
            projectId,
            taskId: mockTargetTaskId,
            version: 1,
            status: 'READY',
        });
    });

    it('triggers async LINKED_OUTGOING_STATUS_CHANGED rules and executes actions in the background', async () => {
        const mockSourceTaskId = 'source-task-1';
        let linkQueryCallCount = 0;
        mockDb.selectFrom.mockImplementation((table: string) => {
            if (table === 'task_link') {
                linkQueryCallCount++;
                if (linkQueryCallCount === 1) {
                    return makeQuery([
                        { source_task_id: mockSourceTaskId, label: 'blocks' },
                    ]);
                }
                return makeQuery([]);
            }
            if (table === 'task_automation_rule') {
                return makeQuery([
                    {
                        id: 'rule-4',
                        fk_project_id: projectId,
                        is_active: true,
                        is_sync: false,
                        trigger_type: 'LINKED_OUTGOING_STATUS_CHANGED',
                        trigger_value: 'blocks',
                        condition_type: 'ALL_LINKED_OUTGOING_IN_STATUS',
                        condition_value: JSON.stringify({
                            label: 'blocks',
                            status: 'DONE',
                        }),
                        action_type: 'SET_STATUS',
                        action_value: 'READY',
                    },
                ]);
            }
            if (table === 'project_task') {
                return makeQuery([
                    {
                        id: mockSourceTaskId,
                        fk_project_id: projectId,
                        fk_team_id: null,
                        fk_member_id: null,
                        title: 'Test task',
                        description: '',
                        status: 'TODO',
                        version: 1,
                        created_by: actorId,
                        updated_by: actorId,
                        priority: 0,
                        created_at: new Date('2026-05-24T00:00:00.000Z'),
                        updated_at: new Date('2026-05-24T00:00:00.000Z'),
                    },
                ]);
            }
            return makeQuery([]);
        });

        const event: DomainEvent<{
            taskId: string;
            projectId: string;
            old: { status: string };
            new: { status: string };
            actorId: string;
        }> = {
            eventId: 'event-3',
            type: 'task.updated',
            key: projectId,
            data: {
                taskId: blockedTaskId,
                projectId,
                old: { status: 'TODO' },
                new: { status: 'DONE' },
                actorId,
            },
            timestamp: '2026-05-24T00:00:00.000Z',
        };

        const listener = new TaskAutomationListener();
        await (listener as any).handleTaskUpdated([event]);

        expect(mockTaskServiceUpdateTask).toHaveBeenCalledWith({
            actorId,
            projectId,
            taskId: mockSourceTaskId,
            version: 1,
            status: 'READY',
        });
    });

    it('rejects sync priority transitions if priority comparison matches and action is REJECT_TRANSITION', async () => {
        mockDb.selectFrom.mockReturnValueOnce(
            makeQuery([
                {
                    id: 'rule-priority-1',
                    fk_project_id: projectId,
                    is_active: true,
                    is_sync: true,
                    trigger_type: 'PRIORITY_CHANGED',
                    trigger_value: JSON.stringify({ to: 3 }),
                    condition_type: 'PRIORITY_COMPARISON',
                    condition_value: JSON.stringify({
                        operator: 'eq',
                        value: 0,
                    }),
                    action_type: 'REJECT_TRANSITION',
                    action_value: 'Priority increase blocked by policy.',
                },
            ]),
        );

        const service = new TaskServiceImpl();

        await expect(
            service.updateTask({
                actorId,
                projectId,
                taskId: blockedTaskId,
                version: 1,
                priority: 3,
            }),
        ).rejects.toThrow(ValidationError);

        expect(mockUpdateTaskQuery).not.toHaveBeenCalled();
    });

    it('triggers async task-created rules and auto assigns creator', async () => {
        mockDb.selectFrom
            .mockReturnValueOnce(
                makeQuery([
                    {
                        id: 'rule-created-1',
                        fk_project_id: projectId,
                        is_active: true,
                        is_sync: false,
                        trigger_type: 'TASK_CREATED',
                        trigger_value: null,
                        condition_type: 'STATUS_EQUALS',
                        condition_value: 'TODO',
                        action_type: 'AUTO_ASSIGN_CREATOR',
                        action_value: null,
                    },
                ]),
            )
            .mockReturnValueOnce(
                makeQuery([
                    {
                        id: blockedTaskId,
                        fk_project_id: projectId,
                        fk_team_id: null,
                        fk_member_id: null,
                        title: 'Created task',
                        description: '',
                        status: 'TODO',
                        version: 1,
                        created_by: actorId,
                        updated_by: actorId,
                        priority: 0,
                        created_at: new Date('2026-05-24T00:00:00.000Z'),
                        updated_at: new Date('2026-05-24T00:00:00.000Z'),
                        direct_incoming_count: 0,
                        direct_outgoing_count: 0,
                        total_incoming_count: 0,
                        total_outgoing_count: 0,
                        incoming_label_counts: {},
                        outgoing_label_counts: {},
                    },
                ]),
            );

        const event: DomainEvent<{
            taskId: string;
            projectId: string;
            actorId: string;
        }> = {
            eventId: 'event-created-1',
            type: 'task.created',
            key: projectId,
            data: {
                taskId: blockedTaskId,
                projectId,
                actorId,
            },
            timestamp: '2026-05-24T00:00:00.000Z',
        };

        const listener = new TaskAutomationListener();
        await (listener as any).handleTaskCreated([event]);

        expect(mockTaskServiceUpdateTask).toHaveBeenCalledWith({
            actorId,
            projectId,
            taskId: blockedTaskId,
            version: 1,
            memberId: actorId,
        });
    });

    it('rejects sync assignee changes if ASSIGNEE_NOT_IN_TEAM matches and action is REJECT_TRANSITION', async () => {
        mockDb.selectFrom.mockImplementation((table: string) => {
            if (table === 'task_automation_rule') {
                return makeQuery([
                    {
                        id: 'rule-assignee-1',
                        fk_project_id: projectId,
                        is_active: true,
                        is_sync: true,
                        trigger_type: 'ASSIGNEE_CHANGED',
                        trigger_value: null,
                        condition_type: 'ASSIGNEE_NOT_IN_TEAM',
                        condition_value: null,
                        action_type: 'REJECT_TRANSITION',
                        action_value:
                            'Assignee must be a member of the assigned team.',
                    },
                ]);
            }
            if (table === 'project_team_member') {
                return makeQuery([]);
            }
            return makeQuery([]);
        });

        const service = new TaskServiceImpl();

        await expect(
            service.updateTask({
                actorId,
                projectId,
                taskId: blockedTaskId,
                version: 1,
                memberId: 'invalid-user',
                teamId: 'some-team-id',
            }),
        ).rejects.toThrow(ValidationError);

        expect(mockUpdateTaskQuery).not.toHaveBeenCalled();
    });
});
