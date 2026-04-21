import type { InternalNotificationService } from './InternalNotificationService.ts';
import { InternalNotificationServiceImpl } from './internal/InternalNotificationServiceImpl.ts';

export const internalNotificationService: InternalNotificationService =
    new InternalNotificationServiceImpl();

export * from './InternalNotificationService.ts';
