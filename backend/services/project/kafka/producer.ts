import { kafka } from "./kafka";

class KafkaProducerClient {
    private producer = kafka.producer({ allowAutoTopicCreation: true, idempotent: true });
    private connected = false;

    async connect() {
        if (!this.connected) {
            await this.producer.connect();
            this.connected = true;
        }
    }

    async disconnect() {
        await this.producer.disconnect();
        this.connected = false;
    }

    async send(...args: Parameters<typeof this.producer.send>) {
        return this.producer.send(...args);
    }
}

export const kafkaProducer = new KafkaProducerClient();