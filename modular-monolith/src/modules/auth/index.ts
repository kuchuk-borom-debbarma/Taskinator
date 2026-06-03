import { traceService } from '../../infra/tracing/index.ts';
import type { AuthService, User } from './AuthService.ts';
import { AuthServiceImpl } from './internal/AuthServiceImpl.ts';

export const authService: AuthService = traceService(
    'AuthService',
    new AuthServiceImpl(),
);
export type { User };
