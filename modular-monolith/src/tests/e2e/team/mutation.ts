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
            }
        }
    }
`;
