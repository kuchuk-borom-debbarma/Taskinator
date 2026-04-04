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
    getTeams: jest.fn(),
    getTeamMembers: jest.fn(),
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
const { TeamServiceImpl } = (await import('../TeamServiceImpl.ts')) as any;
const TeamQueries = (await import('../TeamQueries.ts')) as any;
const { eventBus, KAFKA_EVENTS } = (await import(
    '../../../../utils/EventBus.ts'
)) as any;

const mockedQueries = TeamQueries as jest.Mocked<typeof TeamQueries>;

describe('TeamServiceImpl', () => {
    let teamService: any;

    beforeEach(async () => {
        jest.clearAllMocks();
        teamService = new TeamServiceImpl();
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
            expect(eventBus.publish).toHaveBeenCalledWith(
                KAFKA_EVENTS.PROJECT_TEAM.ADDED,
                expect.any(Array),
            );
            expect(eventBus.publish.mock.calls[0][1]).toHaveLength(2);
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
            expect(eventBus.publish).toHaveBeenCalledWith(
                KAFKA_EVENTS.PROJECT_TEAM.DELETED,
                expect.any(Array),
            );
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
            expect(eventBus.publish).toHaveBeenCalledWith(
                KAFKA_EVENTS.PROJECT_TEAM_MEMBER.ADDED,
                expect.any(Array),
            );
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
            expect(eventBus.publish).toHaveBeenCalledWith(
                KAFKA_EVENTS.PROJECT_TEAM_MEMBER.DELETED,
                expect.any(Array),
            );
            expect(result).toEqual(['tm1']);
        });
    });
});
