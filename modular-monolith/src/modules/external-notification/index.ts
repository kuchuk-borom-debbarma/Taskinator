import type { ExternalNotificationService } from './ExternalNotificationService.ts';
import { ExternalNotificationServiceImpl } from './internal/ExternalNotificationServiceImpl.ts';

export const externalNotificationService: ExternalNotificationService =
    new ExternalNotificationServiceImpl();
