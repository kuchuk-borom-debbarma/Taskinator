export interface ExternalNotificationService {
    init(): Promise<void>;
    destroy(): Promise<void>;
    sendSignUpEmail(email: string, link: string): Promise<void>;
}
