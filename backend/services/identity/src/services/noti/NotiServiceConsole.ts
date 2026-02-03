import { INotiService } from "./INotiService";

export class NotiServiceConsole implements INotiService {
  sendNotification(
    to: string,
    subject: string,
    message: string,
    metadata?: any,
  ): Promise<void> {
    console.log("Notification sent:");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log("Message:", message);
    console.log("Metadata:", metadata);
    return Promise.resolve();
  }
}
