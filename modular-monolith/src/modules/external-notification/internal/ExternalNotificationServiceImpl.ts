import type { ExternalNotificationService } from '../ExternalNotificationService.ts';
import { logger } from '../../../logger/index.ts';

export class ExternalNotificationServiceImpl implements ExternalNotificationService {
    async init(): Promise<void> {
        logger.info('ExternalNotificationService initialized');
    }

    async destroy(): Promise<void> {
        logger.info('ExternalNotificationService destroyed');
    }

    async sendSignUpEmail(email: string, link: string): Promise<void> {
        logger.info(`Sending sign up email to ${email} with link: ${link}`);
    }
}
