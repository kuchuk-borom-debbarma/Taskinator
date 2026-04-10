export interface ExternalNotificationService {
    init(): Promise<void>;
    destroy(): Promise<void>;
    sendSignUpEmail(email: string, link: string): Promise<void>;
    sendNotification(data: { userId: string; title: string; message: string }): Promise<void>;
}
