import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Use unstable_mockModule for ESM
jest.unstable_mockModule('../queries/ProjectQueries.ts', () => ({
    insertProject: jest.fn(),
    insertProjects: jest.fn(),
    insertProjectMembers: jest.fn(),
    deleteProjects: jest.fn(),
    deleteProjectMembers: jest.fn(),
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
const { ProjectServiceImpl } = (await import('../ProjectServiceImpl.ts')) as any;
const ProjectQueries = (await import('../queries/ProjectQueries.ts')) as any;
const { kafka } = (await import('../../../../kafka/index.ts')) as any;
const { KAFKA_TOPICS } = (await import('../../../../utils/kafka.ts')) as any;

const mockedQueries = ProjectQueries as jest.Mocked<typeof ProjectQueries>;

describe('ProjectServiceImpl', () => {
    let projectService: any;
    let mockProducer: any;

    beforeEach(async () => {
        jest.clearAllMocks();
        projectService = new ProjectServiceImpl();
        // Since we mocked kafka.producer, we can get the mock producer instance
        mockProducer = (kafka.producer as jest.Mock).mock.results[0]?.value;
        await projectService.init();
    });

    afterEach(async () => {
        await projectService.destroy();
    });

    describe('createProject', () => {
        it('should create a project and send a kafka message', async () => {
            const createParam = {
                name: 'Test Project',
                description: 'A test description',
                userId: 'user-123',
            };

            const mockProject = {
                id: 'project-123',
                name: 'Test Project',
                description: 'A test description',
                userId: 'user-123',
                createdAt: new Date(),
            };

            mockedQueries.insertProject.mockResolvedValue(mockProject);

            const result = await projectService.createProject(createParam);

            expect(mockedQueries.insertProject).toHaveBeenCalledWith(createParam);
            expect(mockProducer.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    topic: KAFKA_TOPICS.PROJECT,
                    messages: expect.arrayContaining([
                        expect.objectContaining({
                            key: 'project-123',
                        }),
                    ]),
                }),
            );
            expect(result).toEqual(mockProject);
        });

        it('should throw an error if project creation fails', async () => {
            mockedQueries.insertProject.mockResolvedValue(null);

            await expect(projectService.createProject({
                name: 'Fail',
                userId: 'user-1',
            })).rejects.toThrow('Failed to create project');

            expect(mockProducer.send).not.toHaveBeenCalled();
        });
    });

    describe('addProjectMembers', () => {
        it('should add members and send kafka messages', async () => {
            const data = {
                userId: 'owner-1',
                projectId: 'project-1',
                usersToAdd: ['user-A', 'user-B'],
            };

            const mockMembers = [
                { id: 'm1', projectId: 'project-1', userId: 'user-A', createdAt: new Date(), updatedAt: new Date() },
                { id: 'm2', projectId: 'project-1', userId: 'user-B', createdAt: new Date(), updatedAt: new Date() },
            ];

            mockedQueries.insertProjectMembers.mockResolvedValue(mockMembers);

            const result = await projectService.addProjectMembers(data);

            expect(mockedQueries.insertProjectMembers).toHaveBeenCalledWith(data);
            expect(mockProducer.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    topic: KAFKA_TOPICS.PROJECT_MEMBER,
                    messages: expect.any(Array),
                }),
            );
            expect(mockProducer.send.mock.calls[0][0].messages).toHaveLength(2);
            expect(result).toEqual(mockMembers);
        });

        it('should throw an error if no members are added', async () => {
            mockedQueries.insertProjectMembers.mockResolvedValue([]);

            await expect(projectService.addProjectMembers({
                userId: 'owner-1',
                projectId: 'project-1',
                usersToAdd: [],
            })).rejects.toThrow('Failed to add any project members');

            expect(mockProducer.send).not.toHaveBeenCalled();
        });
    });

    describe('deleteProjects', () => {
        it('should delete projects and send kafka messages', async () => {
            const data = {
                userId: 'owner-1',
                projectIds: ['p1', 'p2'],
            };

            const deletedProjects = [
                { id: 'p1', userId: 'owner-1', name: 'P1', description: null, createdAt: new Date() },
                { id: 'p2', userId: 'owner-1', name: 'P2', description: null, createdAt: new Date() },
            ];

            mockedQueries.deleteProjects.mockResolvedValue(deletedProjects as any);

            await projectService.deleteProjects(data);

            expect(mockedQueries.deleteProjects).toHaveBeenCalledWith(data);
            expect(mockProducer.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    topic: KAFKA_TOPICS.PROJECT,
                    messages: expect.any(Array),
                }),
            );
            expect(mockProducer.send.mock.calls[0][0].messages).toHaveLength(2);
        });

        it('should throw an error if no projects are deleted', async () => {
            mockedQueries.deleteProjects.mockResolvedValue([]);

            await expect(projectService.deleteProjects({
                userId: 'owner-1',
                projectIds: ['p1'],
            })).rejects.toThrow('Failed to delete any project');
        });
    });

    describe('createProjects', () => {
        it('should create multiple projects and send kafka messages', async () => {
            const params = [
                { name: 'P1', userId: 'u1' },
                { name: 'P2', userId: 'u1' },
            ];

            const mockProjects = [
                { id: 'p1', name: 'P1', userId: 'u1', createdAt: new Date() },
                { id: 'p2', name: 'P2', userId: 'u1', createdAt: new Date() },
            ];

            mockedQueries.insertProjects.mockResolvedValue(mockProjects as any);

            const result = await projectService.createProjects(params);

            expect(mockedQueries.insertProjects).toHaveBeenCalledWith(params);
            expect(mockProducer.send).toHaveBeenCalled();
            expect(mockProducer.send.mock.calls[0][0].messages).toHaveLength(2);
            expect(result).toEqual(mockProjects);
        });
    });

    describe('deleteProjectMembers', () => {
        it('should delete project members and send kafka messages', async () => {
            const data = {
                userId: 'owner-1',
                projectId: 'project-1',
                memberIds: ['m1'],
            };

            const deletedMembers = [
                { id: 'm1', userId: 'user-A', projectId: 'project-1', createdAt: new Date(), updatedAt: new Date() },
            ];

            mockedQueries.deleteProjectMembers.mockResolvedValue(deletedMembers as any);

            await projectService.deleteProjectMembers(data);

            expect(mockedQueries.deleteProjectMembers).toHaveBeenCalledWith(data);
            expect(mockProducer.send).toHaveBeenCalled();
        });
    });
});
