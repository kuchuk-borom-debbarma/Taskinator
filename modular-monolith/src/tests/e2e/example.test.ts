import { gqlRequest } from './helpers/request.ts';

describe('E2E GraphQL API', () => {
    it('should respond to a basic GraphQL introspection query', async () => {
        const response = await gqlRequest({
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
