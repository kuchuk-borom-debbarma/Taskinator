import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Use unstable_mockModule for ESM
jest.unstable_mockModule('../../../../database/index.ts', () => ({
    db: {
        insertInto: jest.fn(),
        with: jest.fn(),
        deleteFrom: jest.fn(),
        selectFrom: jest.fn(),
    },
}));

// We must use dynamic imports AFTER unstable_mockModule
const { db } = (await import('../../../../database')) as any;
const ProjectQueries = (await import('../ProjectQueries.ts')) as any;

describe('ProjectQueries', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('insertProject', () => {
        it('should insert a project and return it', async () => {
            const data = {
                name: 'Project 1',
                description: 'Desc 1',
                userId: 'user-1',
            };

            const mockProject = {
                id: 'p1',
                name: 'Project 1',
                description: 'Desc 1',
                fk_user_id: 'user-1',
                created_at: new Date(),
                updated_at: null,
            };

            const mockExecuteTakeFirst = (jest.fn() as any).mockResolvedValue(
                mockProject,
            );
            const mockReturningAll = jest
                .fn()
                .mockReturnValue({ executeTakeFirst: mockExecuteTakeFirst });
            const mockValues = jest
                .fn()
                .mockReturnValue({ returningAll: mockReturningAll });
            (db.insertInto as any).mockReturnValue({ values: mockValues });

            const result = await ProjectQueries.insertProject(data);

            expect(db.insertInto).toHaveBeenCalledWith('project');
            expect(mockValues).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Project 1',
                    fk_user_id: 'user-1',
                }),
            );
            expect(result).toEqual({
                id: 'p1',
                name: 'Project 1',
                description: 'Desc 1',
                userId: 'user-1',
                createdAt: mockProject.created_at,
                updatedAt: null,
            });
        });
    });

    describe('deleteProjects', () => {
        it('should delete projects for a specific user', async () => {
            const data = {
                userId: 'user-1',
                projectIds: ['p1', 'p2'],
            };

            const mockDeleted = [
                {
                    id: 'p1',
                    fk_user_id: 'user-1',
                    name: 'P1',
                    description: null,
                    created_at: new Date(),
                },
                {
                    id: 'p2',
                    fk_user_id: 'user-1',
                    name: 'P2',
                    description: null,
                    created_at: new Date(),
                },
            ];

            const mockExecute = (jest.fn() as any).mockResolvedValue(
                mockDeleted,
            );
            const mockReturningAll = jest
                .fn()
                .mockReturnValue({ execute: mockExecute });
            const mockWhere2 = jest
                .fn()
                .mockReturnValue({ returningAll: mockReturningAll });
            const mockWhere1 = jest.fn().mockReturnValue({ where: mockWhere2 });
            (db.deleteFrom as any).mockReturnValue({ where: mockWhere1 });

            const result = await ProjectQueries.deleteProjects(data);

            expect(db.deleteFrom).toHaveBeenCalledWith('project');
            expect(mockWhere1).toHaveBeenCalledWith(
                'id',
                'in',
                data.projectIds,
            );
            expect(mockWhere2).toHaveBeenCalledWith(
                'fk_user_id',
                '=',
                data.userId,
            );
            expect(result).toHaveLength(2);
        });
    });
});
