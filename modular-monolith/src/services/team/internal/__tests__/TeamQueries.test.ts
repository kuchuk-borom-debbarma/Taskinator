import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock database
jest.unstable_mockModule('../../../../database/index.ts', () => ({
    db: {
        // We can just use an empty object here as sql().execute(db) uses it
    },
}));

// Mock kysely to provide sql
jest.unstable_mockModule('kysely', () => {
    const mockSql: any = jest.fn(() => ({
        execute: jest.fn(),
    }));
    return {
        sql: mockSql,
    };
});

// Dynamic imports
const { sql } = (await import('kysely')) as any;
const TeamQueries = (await import('../TeamQueries.ts')) as any;

describe('TeamQueries', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('insertTeam', () => {
        it('should insert teams and return them', async () => {
            const data = {
                userId: 'user-1',
                projectId: 'project-1',
                teams: ['Team A'],
            };

            const mockRows = [
                {
                    id: 't1',
                    name: 'Team A',
                    projectId: 'project-1',
                    createdBy: 'user-1',
                    createdAt: new Date(),
                    updatedAt: null,
                },
            ];

            const mockExecute = (jest.fn() as any).mockResolvedValue({ rows: mockRows });
            (sql as any).mockReturnValue({ execute: mockExecute });

            const result = await TeamQueries.insertTeam(data);

            expect(sql).toHaveBeenCalled();
            expect(mockExecute).toHaveBeenCalled();
            expect(result).toEqual(mockRows);
        });
    });

    describe('deleteTeams', () => {
        it('should delete teams and return their IDs', async () => {
            const data = {
                userId: 'user-1',
                projectId: 'project-1',
                teamIds: ['t1', 't2'],
            };

            const mockRows = [{ id: 't1' }, { id: 't2' }];

            const mockExecute = (jest.fn() as any).mockResolvedValue({ rows: mockRows });
            (sql as any).mockReturnValue({ execute: mockExecute });

            const result = await TeamQueries.deleteTeams(data);

            expect(result).toEqual(['t1', 't2']);
        });

        it('should throw error if unauthorized or not all teams found', async () => {
            const data = {
                userId: 'user-1',
                projectId: 'project-1',
                teamIds: ['t1', 't2'],
            };

            const mockRows = [{ id: 't1' }]; // Only one found

            const mockExecute = (jest.fn() as any).mockResolvedValue({ rows: mockRows });
            (sql as any).mockReturnValue({ execute: mockExecute });

            await expect(TeamQueries.deleteTeams(data)).rejects.toThrow(
                'Unauthorized or some teams not found',
            );
        });
    });

    describe('insertTeamMembers', () => {
        it('should insert team members', async () => {
            const data = {
                userId: 'user-1',
                projectId: 'project-1',
                teamId: 't1',
                members: ['u1'],
            };

            const mockRows = [
                {
                    id: 'tm1',
                    teamId: 't1',
                    userId: 'u1',
                    projectId: 'project-1',
                    createdAt: new Date(),
                },
            ];

            const mockExecute = (jest.fn() as any).mockResolvedValue({ rows: mockRows });
            (sql as any).mockReturnValue({ execute: mockExecute });

            const result = await TeamQueries.insertTeamMembers(data);

            expect(result).toEqual(mockRows);
        });
    });

    describe('deleteTeamMembers', () => {
        it('should delete team members', async () => {
            const data = {
                userId: 'user-1',
                projectId: 'project-1',
                teamId: 't1',
                members: ['u1', 'u2'],
            };

            const mockRows = [{ id: 'u1' }, { id: 'u2' }];

            const mockExecute = (jest.fn() as any).mockResolvedValue({ rows: mockRows });
            (sql as any).mockReturnValue({ execute: mockExecute });

            const result = await TeamQueries.deleteTeamMembers(data);

            expect(result).toEqual(['u1', 'u2']);
        });
    });
});
