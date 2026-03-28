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
}));

jest.unstable_mockModule('../../../../kafka/index.ts', () => {
    const mockProducer = {
        connect: (jest.fn() as any).mockResolvedValue(undefined),
        send: (jest.fn() as any).mockResolvedValue(undefined),
        disconnect: (jest.fn() as any).mockResolvedValue(undefined),
    };
    return {
        kafka: {
            producer: jest.fn().mockReturnValue(mockProducer),
        },
    };
});

// Dynamic imports AFTER mockModule
const { TaskServiceImpl } = (await import('../TaskServiceImpl.ts')) as any;
const TaskQueries = (await import('../TaskQueries.ts')) as any;
const { kafka } = (await import('../../../../kafka/index.ts')) as any;
const { KAFKA_TOPICS } = (await import('../../../../utils/kafka.ts')) as any;

const mockedQueries = TaskQueries as jest.Mocked<typeof TaskQueries>;

describe('TaskServiceImpl', () => {
    let taskService: any;
    let mockProducer: any;

    beforeEach(async () => {
        jest.clearAllMocks();
        taskService = new TaskServiceImpl();
        mockProducer = (kafka.producer as jest.Mock).mock.results[0]?.value;
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
            expect(mockProducer.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    topic: KAFKA_TOPICS.PROJECT_TASK,
                    messages: expect.arrayContaining([
                        expect.objectContaining({
                            key: 't1',
                        }),
                    ]),
                }),
            );
            expect(result).toEqual([mockTask]);
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
            expect(mockProducer.send).toHaveBeenCalled();
            expect(mockProducer.send.mock.calls[0][0].messages).toHaveLength(2);
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
            expect(mockProducer.send).toHaveBeenCalledTimes(2);
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
                'Unauthorized or some tasks not found/invalid',
            );
        });
    });
});
