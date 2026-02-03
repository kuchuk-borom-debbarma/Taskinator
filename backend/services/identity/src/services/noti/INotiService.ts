export interface INotiService {
  sendNotification(
    to: string,
    subject: string,
    message: string,
    metadata?: any,
  ): Promise<void>;
}
