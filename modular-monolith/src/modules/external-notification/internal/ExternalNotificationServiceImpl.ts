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

    async sendNotification(data: {
        userId: string;
        title: string;
        message: string;
    }): Promise<void> {
        logger.info(
            `[External Notification] Sending to user ${data.userId}: ${data.title} - ${data.message}`,
        );
        // Real implementation would look up user Slack/Discord/Email prefs
    }

    async sendNotificationBatch(data: {
        userIds: string[];
        title: string;
        message: string;
    }): Promise<void> {
        if (data.userIds.length === 0) return;
        logger.info(
            `[External Notification] Batch-sending to ${data.userIds.length} users: "${data.title}"`,
        );
        // Real implementation: resolve all user channel prefs (email/Slack/Discord) in one DB query,
        // then dispatch a SINGLE provider request:
        //   SendGrid: POST /v3/mail/send with personalizations[]
        //   Slack:    POST /api/chat.postMessage with one payload per channel (still fewer calls than N)
        //   Twilio:   POST /Messages with batch recipient list
        // This ensures O(1) outbound HTTP calls regardless of recipient count.
    }
}
