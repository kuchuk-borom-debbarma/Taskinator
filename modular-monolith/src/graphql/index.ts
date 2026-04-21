import { createYoga } from 'graphql-yoga';
import jwt from 'jsonwebtoken';
import { createContext, type GraphQLContext } from './context';
import { schema } from './schema';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

export const yoga = createYoga<GraphQLContext>({
    schema,
    context: async (initialContext) => {
        const headers = initialContext.request.headers;
        const authHeader =
            headers.get('authorization') ||
            (initialContext as any).req?.headers?.authorization;
        let token: string | undefined;

        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else {
            const url = new URL(initialContext.request.url);
            token = url.searchParams.get('token') || undefined;
        }

        let userId: string | undefined;
        if (token) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET) as any;
                userId = decoded.id;
                console.log(
                    `[GraphQL] Context initialized for user: ${userId}`,
                );
            } catch (err) {
                console.warn(
                    '[GraphQL] JWT verification failed:',
                    (err as Error).message,
                );
            }
        } else {
            console.log('[GraphQL] Context initialized for anonymous user');
        }

        return createContext(userId);
    },
    plugins: [
        {
            onExecute({ args }: any) {
                const operationName = args.operationName ?? 'Anonymous';
                console.log(`[GQL] Executing: ${operationName}`);
                return {
                    onNext({ result }: any) {
                        if (result.errors) {
                            console.error(
                                `[GQL] Execution Errors in ${operationName}:`,
                                JSON.stringify(result.errors, null, 2),
                            );
                        }
                    },
                };
            },
        },
    ],
    maskedErrors: false,
    graphiql: true,
});
