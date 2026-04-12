import { GraphQLClient } from 'graphql-request';

const API_URL = 'http://127.0.0.1:3000/graphql';

export const gqlClient = new GraphQLClient(API_URL, {
    requestMiddleware: (request) => {
        const token = localStorage.getItem('token');
        const headers = new Headers(request.headers as HeadersInit);
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }
        return {
            ...request,
            headers
        };
    },
});
