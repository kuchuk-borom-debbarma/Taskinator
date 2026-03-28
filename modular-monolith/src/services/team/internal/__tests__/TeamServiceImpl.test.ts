import {
    jest,
    describe,
    it,
    expect,
    beforeEach,
    afterEach,
} from '@jest/globals';

// Use unstable_mockModule for ESM
jest.unstable_mockModule('../TeamQueries.ts', () => ({
    insertTeam: jest.fn(),
    deleteTeams: jest.fn(),
    insertTeamMembers: jest.fn(),
    deleteTeamMembers: jest.fn(),
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
const { TeamServiceImpl } = (await import('../TeamServiceImpl.ts')) as any;
const TeamQueries = (await import('../TeamQueries.ts')) as any;
const { kafka } = (await import('../../../../kafka/index.ts')) as any;
const { KAFKA_TOPICS } = (await import('../../../../utils/kafka.ts')) as any;

const mockedQueries = TeamQueries as jest.Mocked<typeof TeamQueries>;

describe('TeamServiceImpl', () => {
    let teamService: any;
    let mockProducer: any;

    beforeEach(async () => {
        jest.clearAllMocks();
        teamService = new TeamServiceImpl();
        mockProducer = (kafka.producer as jest.Mock).mock.results[0]?.value;
        await teamService.init();
    });

    afterEach(async () => {
        await teamService.destroy();
    });

    describe('createTeams', () => {
        it('should create teams and send kafka messages', async () => {
            const data = {
                userId: 'user-1',
                projectId: 'project-1',
                teams: ['Team A', 'Team B'],
            };

            const mockTeams = [
                {
                    id: 't1',
                    name: 'Team A',
                    projectId: 'project-1',
                    createdBy: 'user-1',
                },
                {
                    id: 't2',
                    name: 'Team B',
                    projectId: 'project-1',
                    createdBy: 'user-1',
                },
            ];

            mockedQueries.insertTeam.mockResolvedValue(mockTeams);

            const result = await teamService.createTeams(data);

            expect(mockedQueries.insertTeam).toHaveBeenCalledWith(data);
            expect(mockProducer.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    topic: KAFKA_TOPICS.PROJECT_TEAM,
                    messages: expect.any(Array),
                }),
            );
            expect(mockProducer.send.mock.calls[0][0].messages).toHaveLength(2);
            expect(result).toEqual(mockTeams);
        });
    });

    describe('deleteTeams', () => {
        it('should delete teams and send kafka messages', async () => {
            const data = {
                userId: 'user-1',
                projectId: 'project-1',
                teamIds: ['t1', 't2'],
            };

            mockedQueries.deleteTeams.mockResolvedValue(['t1', 't2']);

            const result = await teamService.deleteTeams(data);

            expect(mockedQueries.deleteTeams).toHaveBeenCalledWith(data);
            expect(mockProducer.send).toHaveBeenCalled();
            expect(result).toEqual(['t1', 't2']);
        });

        it('should throw error if no teams deleted', async () => {
            mockedQueries.deleteTeams.mockResolvedValue([]);

            await expect(
                teamService.deleteTeams({
                    userId: 'user-1',
                    projectId: 'project-1',
                    teamIds: ['t1'],
                }),
            ).rejects.toThrow('Failed to delete any teams');
        });
    });

    describe('addTeamMembers', () => {
        it('should add team members and send kafka messages', async () => {
            const data = {
                userId: 'user-1',
                projectId: 'project-1',
                teamId: 't1',
                members: ['u1', 'u2'],
            };

            const mockMembers = [
                {
                    id: 'tm1',
                    teamId: 't1',
                    userId: 'u1',
                    projectId: 'project-1',
                },
                {
                    id: 'tm2',
                    teamId: 't1',
                    userId: 'u2',
                    projectId: 'project-1',
                },
            ];

            mockedQueries.insertTeamMembers.mockResolvedValue(mockMembers);

            const result = await teamService.addTeamMembers(data);

            expect(mockedQueries.insertTeamMembers).toHaveBeenCalledWith(data);
            expect(mockProducer.send).toHaveBeenCalled();
            expect(result).toEqual(mockMembers);
        });
    });

    describe('deleteTeamMembers', () => {
        it('should delete team members and send kafka messages', async () => {
            const data = {
                userId: 'user-1',
                projectId: 'project-1',
                teamId: 't1',
                members: ['u1'],
            };

            mockedQueries.deleteTeamMembers.mockResolvedValue(['tm1']);

            const result = await teamService.deleteTeamMembers(data);

            expect(mockedQueries.deleteTeamMembers).toHaveBeenCalledWith(data);
            expect(mockProducer.send).toHaveBeenCalled();
            expect(result).toEqual(['tm1']);
        });
    });
});
