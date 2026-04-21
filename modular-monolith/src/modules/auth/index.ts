import type { AuthService, User } from './AuthService.ts';
import { AuthServiceImpl } from './internal/AuthServiceImpl.ts';

export const authService: AuthService = new AuthServiceImpl();
export type { User };
