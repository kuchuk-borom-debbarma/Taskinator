import { getOperationAST } from 'graphql';
import { createYoga } from 'graphql-yoga';
import jwt from 'jsonwebtoken';
import { logger } from '../logger';
import { traceMutation } from '../tracing/index.ts';
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

        return createContext(userId);
    },
    plugins: [
        {
            onExecute({ args, setExecuteFn, executeFn }: any) {
                const start = Date.now();
                const operationName = args.operationName ?? 'Anonymous';
                const operation = getOperationAST(
                    args.document,
                    args.operationName,
                );
                logger.info(`GraphQL Execution Started: ${operationName}`);

                if (operation?.operation === 'mutation') {
                    const originalExecuteFn = executeFn;
                    setExecuteFn((executeArgs: any) =>
                        traceMutation(
                            operation.name?.value ??
                                args.operationName ??
                                'Anonymous',
                            {
                                operationName:
                                    operation.name?.value ??
                                    args.operationName ??
                                    'Anonymous',
                                userId: args.contextValue?.userId,
                            },
                            () => originalExecuteFn(executeArgs),
                        ),
                    );
                }

                return {
                    onNext({ result }: any) {
                        const duration = Date.now() - start;
                        if (result.errors) {
                            logger.error(
                                `GraphQL Execution Errors in ${operationName} (${duration}ms):`,
                                result.errors,
                            );
                        } else {
                            logger.info(
                                `GraphQL Execution Completed: ${operationName} (${duration}ms)`,
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
