import type { BaseService } from '../project';

export type Team = {
    id: string;
    name: string;
    projectId: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
};

export interface TeamService extends BaseService {
    /**
     * Create teams. Can be created by any member and project owner
     */
    createTeams(data: {
        userId: string;
        projectId: string;
        teams: string[];
    }): Promise<Team[]>;

    /**
     * Delete teams by Ids. Can only be deleted by team creator OR project owner
     * @param data
     */
    deleteTeams(data: {
        userId: string;
        projectId: string;
        teamIds: string[];
    }): Promise<Team[]>;

    /**
     * Add members to a team. Members must be part of the project. Deleter should be project owner or team creator.
     * @param data
     */
    addTeamMembers(data: {
        userId: string;
        projectId: string;
        members: string[];
    }): Promise<Team[]>;

    /**
     * Delete team members. Members must be part of the project. And deleter should be project owner or team creator
     * @param data
     */
    deleteTeamMembers(data: {
        userId: string;
        projectId: string;
        members: string[];
    }): Promise<Team[]>;
}
