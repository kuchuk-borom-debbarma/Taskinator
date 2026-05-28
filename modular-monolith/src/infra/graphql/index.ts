import { createYoga } from 'graphql-yoga';
import jwt from 'jsonwebtoken';
import { NodeType, Tracer } from 'nodejs';
import { logger } from '../logger';
import { tracingContext } from '../tracing';
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
                logger.debug(`Context initialized for user: ${userId}`);
            } catch (err) {
                logger.warn('JWT verification failed:', (err as Error).message);
            }
        } else {
            logger.debug('Context initialized for anonymous user');
        }

        // Start a root trace in the 'gateway' container for this incoming GraphQL request
        const rootNode = Tracer.startTrace(
            'GraphQL Request',
            NodeType.HTTP_SERVER,
        );
        rootNode.markProcessed();

        // Resolve context inside the tracing AsyncLocalStorage context so resolvers inherit it
        return new Promise<GraphQLContext>((resolve) => {
            tracingContext.run(rootNode, () => {
                const contextObj = createContext(userId);
                (contextObj as any).traceNode = rootNode;
                resolve({ ...initialContext, ...contextObj });
            });
        });
    },
    plugins: [
        {
            onExecute({ args }: any) {
                const start = Date.now();
                const operationName = args.operationName ?? 'Anonymous';
                logger.info(`GraphQL Execution Started: ${operationName}`);

                // Retrieve the active trace node from AsyncLocalStorage to update its name dynamically
                const rootNode = tracingContext.getStore();
                if (rootNode) {
                    rootNode.name = `GraphQL: ${operationName}`;
                }

                return {
                    onEnd() {
                        const duration = Date.now() - start;
                        logger.info(
                            `GraphQL Execution Completed: ${operationName} (${duration}ms)`,
                        );
                        // Complete the root trace node when the GraphQL operation completes
                        if (rootNode) {
                            rootNode.markCompleted();
                        }
                    },
                };
            },
        },
    ],
    maskedErrors: false,
    graphiql: true,
});
