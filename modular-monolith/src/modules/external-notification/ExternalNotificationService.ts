export interface ExternalNotificationService {
    init(): Promise<void>;
    destroy(): Promise<void>;
    sendSignUpEmail(email: string, link: string): Promise<void>;
    sendNotification(data: {
        userId: string;
        title: string;
        message: string;
    }): Promise<void>;
    /**
     * Batch provider-level send. All recipients are dispatched in a single outbound request
     * (e.g. SendGrid personalizations[], Slack multi-post, etc.) rather than N individual calls.
     */
    sendNotificationBatch(data: {
        userIds: string[];
        title: string;
        message: string;
    }): Promise<void>;
}
