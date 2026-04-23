export const GET_SINGLE_PROJECT = `
    query GetSingleProject($id: ID!) {
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

export const GET_BATCH_PROJECTS = `
    query GetBatchProjects($ids: [ID!]) {
        projects(ids: $ids) {
            id
            name
        }
    }
`;

export const GET_USER_PROJECTS = `
    query GetUserProjects($first: Int, $after: String, $last: Int, $before: String) {
        me {
            projects(first: $first, after: $after, last: $last, before: $before) {
                edges {
                    node {
                        id
                        name
                    }
                    cursor
                }
                pageInfo {
                    hasNextPage
                    hasPreviousPage
                    startCursor
                    endCursor
                }
                totalCount
            }
        }
    }
`;

export const GET_PROJECT_MEMBERS = `
    query GetProjectMembers($id: ID!, $first: Int, $after: String) {
        project(id: $id) {
            projectMembers(first: $first, after: $after) {
                edges {
                    node {
                        id
                        user {
                            id
                            username
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
