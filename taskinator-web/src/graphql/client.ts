import { GraphQLClient } from 'graphql-request';

const API_URL = 'http://127.0.0.1:3000/graphql';

export const gqlClient = new GraphQLClient(API_URL, {
    headers: () => {
        const token = localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    },
});
