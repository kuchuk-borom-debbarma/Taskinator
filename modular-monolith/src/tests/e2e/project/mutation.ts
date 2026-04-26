export const CREATE_PROJECT = `
    mutation CreateProject($name: String!, $description: String) {
        createProject(name: $name, description: $description) {
            id
            name
            description
            version
            createdAt
        }
    }
`;

export const UPDATE_PROJECT = `
    mutation UpdateProject($id: ID!, $version: Int!, $name: String, $description: String) {
        updateProject(id: $id, version: $version, name: $name, description: $description) {
            id
            name
            description
            version
        }
    }
`;

export const DELETE_PROJECTS = `
    mutation DeleteProjects($projectIds: [ID!]!) {
        deleteProjects(projectIds: $projectIds) {
            success
            deletedCount
        }
    }
`;

export const ADD_PROJECT_MEMBERS = `
    mutation AddProjectMembers($projectId: ID!, $userIds: [ID!]!) {
        addProjectMembers(projectId: $projectId, userIds: $userIds) {
            success
        }
    }
`;

export const REMOVE_PROJECT_MEMBERS = `
    mutation RemoveProjectMembers($projectId: ID!, $memberIds: [ID!]!) {
        removeProjectMembers(projectId: $projectId, memberIds: $memberIds) {
            success
        }
    }
`;
