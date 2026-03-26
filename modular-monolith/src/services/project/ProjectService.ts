export type Project = {
    id: string;
    userId: string;
    name: string;
    description?: string;
    createdAt: Date;
    updatedAt?: Date;
}

export interface CreateProjectParam {
    name: string;
    description?: string;
    userId: string;
}

export interface ProjectService {

    /**
     * Create single project
     */
    createProject(data: CreateProjectParam): Promise<Project>;

    /**
     * Create Multiple project
     */
    createProjects(data: CreateProjectParam[]): Promise<Project[]>
}