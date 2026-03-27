import {Kafka} from 'kafkajs';

export const kafka = new Kafka({
    clientId: 'taskinator-expressjs',
    brokers: [
        "localhost:9092"
    ],
});