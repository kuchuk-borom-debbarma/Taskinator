import {
    jest,
    describe,
    it,
    expect,
    beforeEach,
    afterEach,
} from '@jest/globals';

// Use unstable_mockModule for ESM
jest.unstable_mockModule('../TaskQueries.ts', () => ({
    insertTask: jest.fn(),
    deleteTasks: jest.fn(),
    updateTask: jest.fn(),
    getTasks: jest.fn(),
}));

jest.unstable_mockModule('../../../../utils/EventBus.ts', () => ({
    eventBus: {
        init: (jest.fn() as any).mockResolvedValue(undefined),
        publish: (jest.fn() as any).mockResolvedValue(undefined),
        destroy: (jest.fn() as any).mockResolvedValue(undefined),
    },
    KAFKA_EVENTS: {
        PROJECT: { CREATED: 'PROJECT_CREATED', DELETED: 'PROJECT_DELETED' },
        PROJECT_MEMBER: {
            ADDED: 'PROJECT_MEMBER_ADDED',
            DELETED: 'PROJECT_MEMBER_DELETED',
        },
        PROJECT_TEAM: {
            ADDED: 'PROJECT_TEAM_ADDED',
            DELETED: 'PROJECT_TEAM_DELETED',
        },
        PROJECT_TEAM_MEMBER: {
            ADDED: 'PROJECT_TEAM_MEMBER_ADDED',
            DELETED: 'PROJECT_TEAM_MEMBER_DELETED',
        },
        PROJECT_TASK: {
            CREATED: 'PROJECT_TASK_CREATED',
            UPDATED: 'PROJECT_TASK_UPDATED',
            DELETED: 'PROJECT_TASK_DELETED',
        },
    },
}));

// Dynamic imports AFTER mockModule
const { TaskServiceImpl } = (await import('../TaskServiceImpl.ts')) as any;
const TaskQueries = (await import('../TaskQueries.ts')) as any;
const { eventBus, KAFKA_EVENTS } = (await import(
    '../../../../utils/EventBus.ts'
)) as any;

const mockedQueries = TaskQueries as jest.Mocked<typeof TaskQueries>;

describe('TaskServiceImpl', () => {
    let taskService: any;

    beforeEach(async () => {
        jest.clearAllMocks();
        taskService = new TaskServiceImpl();
        await taskService.init();
    });

    afterEach(async () => {
        await taskService.destroy();
    });

    describe('createTask', () => {
        it('should create a task and send a kafka message', async () => {
            const data = {
                userId: 'user-1',
                projectId: 'project-1',
                title: 'Task 1',
                description: 'Desc 1',
                initialStatus: 'TODO',
            };

            const mockTask = {
                id: 't1',
                projectId: 'project-1',
                title: 'Task 1',
                status: 'TODO',
            };

            mockedQueries.insertTask.mockResolvedValue(mockTask as any);

            const result = await taskService.createTask(data);

            expect(mockedQueries.insertTask).toHaveBeenCalledWith(data);
            expect(eventBus.publish).toHaveBeenCalledWith(
                KAFKA_EVENTS.PROJECT_TASK.CREATED,
                expect.objectContaining({
                    key: 't1',
                    data: expect.any(Object),
                }),
            );
            expect(result).toEqual(mockTask);
        });
    });

    describe('deleteTask', () => {
        it('should delete tasks and send kafka messages', async () => {
            const data = {
                userId: 'user-1',
                projectId: 'project-1',
                taskIds: ['t1', 't2'],
            };

            mockedQueries.deleteTasks.mockResolvedValue(['t1', 't2']);

            const result = await taskService.deleteTask(data);

            expect(mockedQueries.deleteTasks).toHaveBeenCalledWith(data);
            expect(eventBus.publish).toHaveBeenCalledWith(
                KAFKA_EVENTS.PROJECT_TASK.DELETED,
                expect.any(Array),
            );
            expect(eventBus.publish.mock.calls[0][1]).toHaveLength(2);
            expect(result).toEqual(['t1', 't2']);
        });
    });

    describe('updateTasks', () => {
        it('should update multiple tasks and send kafka messages', async () => {
            const data = {
                userId: 'user-1',
                projectId: 'project-1',
                tasks: [
                    { id: 't1', status: 'DONE' },
                    { id: 't2', status: 'IN_PROGRESS' },
                ],
            };

            mockedQueries.updateTask.mockImplementation(
                async (params: any) => params.taskId,
            );

            const result = await taskService.updateTasks(data);

            expect(mockedQueries.updateTask).toHaveBeenCalledTimes(2);
            expect(eventBus.publish).toHaveBeenCalledWith(
                KAFKA_EVENTS.PROJECT_TASK.UPDATED,
                expect.any(Array),
            );
            expect(eventBus.publish.mock.calls[0][1]).toHaveLength(2);
            expect(result).toEqual(['t1', 't2']);
        });

        it('should throw error if some tasks fail to update', async () => {
            const data = {
                userId: 'user-1',
                projectId: 'project-1',
                tasks: [
                    { id: 't1', status: 'DONE' },
                    { id: 't2', status: 'IN_PROGRESS' },
                ],
            };

            mockedQueries.updateTask.mockImplementation(async (params: any) => {
                if (params.taskId === 't1') return 't1';
                return null; // Fail t2
            });

            await expect(taskService.updateTasks(data)).rejects.toThrow(
                'Unauthorized, some tasks not found, or version conflict',
            );
        });
    });
});
