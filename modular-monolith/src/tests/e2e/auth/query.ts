export const GET_ME = `
    query GetMe {
        me {
            id
            username
            email
            projectsCount
        }
    }
`;

export const GET_USER_BY_ID = `
    query GetUserById($id: ID!) {
        user(id: $id) {
            id
            username
            email
            projectsCount
        }
    }
`;

export const GET_USERS_BY_IDS = `
    query GetUsersByIds($ids: [ID!]!) {
        users(ids: $ids) {
            id
            username
            email
            projectsCount
        }
    }
`;
