import { createServer } from 'node:http';
import request from 'supertest';
import { yoga } from '../../graphql';

// Create a standard Node HTTP server using Yoga for supertest
// This avoids needing to bind to a real port like Bun.serve does.
const server = createServer(yoga);

describe('E2E GraphQL API', () => {
    it('should respond to a basic GraphQL introspection query', async () => {
        const response = await request(server)
            .post('/graphql')
            .send({
                query: `
                    query {
                        __typename
                    }
                `,
            });

        expect(response.status).toBe(200);
        expect(response.body.data.__typename).toBe('Query');
    });
});
