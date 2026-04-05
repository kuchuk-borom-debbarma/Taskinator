import { ExternalNotificationServiceImpl } from './internal/ExternalNotificationServiceImpl.ts';
import type { ExternalNotificationService } from './ExternalNotificationService.ts';

export const externalNotificationService: ExternalNotificationService = new ExternalNotificationServiceImpl();
