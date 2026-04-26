export const GET_SINGLE_TEAM = `
    query GetSingleTeam($id: ID!) {
        team(id: $id) {
            id
            name
            version
            membersCount
            tasksCount
            createdAt
            updatedAt
        }
    }
`;

export const GET_PROJECT_TEAMS = `
    query GetProjectTeams($projectId: ID!, $first: Int, $after: String) {
        project(id: $projectId) {
            id
            teams(first: $first, after: $after) {
                edges {
                    node {
                        id
                        name
                        membersCount
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
