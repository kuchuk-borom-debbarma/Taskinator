import { createYoga } from 'graphql-yoga';
import { schema } from './schema';
import { createContext, type GraphQLContext } from './context';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

export const yoga = createYoga<GraphQLContext>({
    schema,
    context: async (initialContext) => {
        const authHeader = initialContext.request.headers.get('authorization');
        let token: string | undefined;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else {
            // Check query param for subscriptions if needed
            const url = new URL(initialContext.request.url);
            token = url.searchParams.get('token') || undefined;
        }

        let userId: string | undefined;
        if (token) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET) as any;
                userId = decoded.id;
            } catch (err) {
                // Token verification failed
            }
        }

        return createContext(userId);
    },
    graphiql: true,
});
