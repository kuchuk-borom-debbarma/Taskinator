import type { BaseService } from '../project';

export type Team = {
    id: string;
    name: string;
    projectId: string;
    createdBy: string;
    version: number;
    lastEventId: string | null;
    createdAt: Date;
    updatedAt: Date;
};

export type TeamMember = {
    id: string;
    projectId: string;
    teamId: string;
    userId: string;
    version: number;
    lastEventId: string | null;
    createdAt: Date;
    updatedAt: Date;
};

export interface CreateTeamsParam {
    userId: string;
    projectId: string;
    teams: string[];
}

export interface DeleteTeamsParam {
    userId: string;
    projectId: string;
    teamIds: string[];
}

export interface AddTeamMembersParam {
    userId: string;
    projectId: string;
    teamId: string;
    members: string[];
}

export interface DeleteTeamMembersParam {
    userId: string;
    projectId: string;
    teamId: string;
    members: string[];
}

export interface TeamService extends BaseService {
    /**
     * Create teams. Can be created by any member and project owner
     */
    createTeams(data: CreateTeamsParam): Promise<Team[]>;

    /**
     * Delete teams by Ids. Can only be deleted by team creator OR project owner
     * @param data
     */
    deleteTeams(data: DeleteTeamsParam): Promise<string[]>;

    /**
     * Add members to a team. Members must be part of the project. Deleter should be project owner or team creator.
     * @param data
     */
    addTeamMembers(data: AddTeamMembersParam): Promise<TeamMember[]>;

    /**
     * Delete team members. Members must be part of the project. And deleter should be project owner or team creator
     * @param data
     */
    deleteTeamMembers(data: DeleteTeamMembersParam): Promise<string[]>;
}
