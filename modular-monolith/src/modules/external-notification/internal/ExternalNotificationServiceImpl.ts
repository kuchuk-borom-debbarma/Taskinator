import type { ExternalNotificationService } from '../ExternalNotificationService.ts';
import { logger } from '../../../logger';
import { notificationRequestedListener } from './listeners/NotificationRequestedListener.ts';

export class ExternalNotificationServiceImpl
    implements ExternalNotificationService
{
    async init(): Promise<void> {
        logger.info('ExternalNotificationService initialized');
        await notificationRequestedListener.init();
    }

    async destroy(): Promise<void> {
        logger.info('ExternalNotificationService destroyed');
        await notificationRequestedListener.stop();
    }

    async sendSignUpEmail(email: string, link: string): Promise<void> {
        logger.info(`Sending sign up email to ${email} with link: ${link}`);
    }

    async sendNotification(data: { userId: string; title: string; message: string }): Promise<void> {
        logger.info(`[External Notification] Sending to user ${data.userId}: ${data.title} - ${data.message}`);
        // Real implementation would look up user Slack/Discord/Email prefs
    }
}
