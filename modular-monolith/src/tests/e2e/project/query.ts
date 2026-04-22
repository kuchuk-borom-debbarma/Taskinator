export const GET_PROJECT = `
    query GetProject($id: ID!) {
        project(id: $id) {
            id
            name
            description
            version
            projectMembersCount
            tasksCount
            teamsCount
            creator {
                id
                username
            }
        }
    }
`;

export const GET_MY_PROJECTS = `
    query GetMyProjects {
        me {
            id
            projects {
                edges {
                    node {
                        id
                        name
                    }
                    cursor
                }
                pageInfo {
                    hasNextPage
                    endCursor
                }
            }
        }
    }
`;

export const GET_PROJECT_MEMBERS = `
    query GetProjectMembers($projectId: ID!, $first: Int, $after: String) {
        project(id: $projectId) {
            id
            projectMembers(first: $first, after: $after) {
                edges {
                    node {
                        id
                        user {
                            id
                            username
                            email
                        }
                    }
                    cursor
                }
                pageInfo {
                    hasNextPage
                    endCursor
                }
            }
        }
    }
`;
