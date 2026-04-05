import { AuthServiceImpl } from './internal/AuthServiceImpl.ts';
import type { AuthService } from './AuthService.ts';

export const authService: AuthService = new AuthServiceImpl();
