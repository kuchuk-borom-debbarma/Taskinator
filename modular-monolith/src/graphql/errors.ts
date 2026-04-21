import { GraphQLError } from 'graphql';

export class UnauthorizedError extends GraphQLError {
    constructor(message: string = 'Unauthorized') {
        super(message, {
            extensions: {
                code: 'UNAUTHENTICATED',
                http: { status: 401 },
            },
        });
    }
}

export class ForbiddenError extends GraphQLError {
    constructor(message: string = 'Forbidden') {
        super(message, {
            extensions: {
                code: 'FORBIDDEN',
                http: { status: 403 },
            },
        });
    }
}

export class NotFoundError extends GraphQLError {
    constructor(message: string = 'Not Found') {
        super(message, {
            extensions: {
                code: 'NOT_FOUND',
                http: { status: 404 },
            },
        });
    }
}

export class ValidationError extends GraphQLError {
    constructor(message: string) {
        super(message, {
            extensions: {
                code: 'BAD_USER_INPUT',
                http: { status: 400 },
            },
        });
    }
}

export class MutationFailedError extends GraphQLError {
    constructor(message: string) {
        super(message, {
            extensions: {
                code: 'INTERNAL_SERVER_ERROR',
                http: { status: 500 },
            },
        });
    }
}
export class ConflictError extends GraphQLError {
    constructor(message: string = 'Conflict: Stale data detected') {
        super(message, {
            extensions: {
                code: 'CONFLICT',
                http: { status: 409 },
            },
        });
    }
}
