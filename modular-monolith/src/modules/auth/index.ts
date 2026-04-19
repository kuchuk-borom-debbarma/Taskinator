import { AuthServiceImpl } from './internal/AuthServiceImpl.ts';
import type { AuthService, User } from './AuthService.ts';

export const authService: AuthService = new AuthServiceImpl();
export type { User };
