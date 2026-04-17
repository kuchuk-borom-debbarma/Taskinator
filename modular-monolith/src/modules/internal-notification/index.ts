import { InternalNotificationServiceImpl } from './internal/InternalNotificationServiceImpl.ts';
import type { InternalNotificationService } from './InternalNotificationService.ts';

export const internalNotificationService: InternalNotificationService =
    new InternalNotificationServiceImpl();

export * from './InternalNotificationService.ts';
