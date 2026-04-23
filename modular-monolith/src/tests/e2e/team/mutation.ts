export const CREATE_TEAM = `
    mutation CreateTeam($projectId: ID!, $name: String!) {
        createTeam(projectId: $projectId, name: $name) {
            success
            team {
                id
                name
                project {
                    id
                }
                version
                membersCount
                tasksCount
                createdBy {
                    id
                    username
                }
                createdAt
                updatedAt
            }
        }
    }
`;

export const ADD_TEAM_MEMBERS = `
    mutation AddTeamMembers($projectId: ID!, $teamId: ID!, $userIds: [ID!]!) {
        addTeamMembers(projectId: $projectId, teamId: $teamId, userIds: $userIds) {
            success
            addedCount
        }
    }
`;

export const REMOVE_TEAM_MEMBERS = `
    mutation RemoveTeamMembers($projectId: ID!, $teamId: ID!, $userIds: [ID!]!) {
        removeTeamMembers(projectId: $projectId, teamId: $teamId, userIds: $userIds) {
            success
            removedCount
        }
    }
`;

export const UPDATE_TEAM = `
    mutation UpdateTeam($projectId: ID!, $teamId: ID!, $name: String!, $version: Int!) {
        updateTeam(projectId: $projectId, teamId: $teamId, name: $name, version: $version) {
            success
            team {
                id
                name
                version
                updatedAt
            }
        }
    }
`;

export const DELETE_TEAMS = `
    mutation DeleteTeams($projectId: ID!, $teamIds: [ID!]!) {
        deleteTeams(projectId: $projectId, teamIds: $teamIds) {
            success
            deletedCount
        }
    }
`;
