import {Kafka} from "kafkajs"

export const kafka = new Kafka({
    clientId: "Taskinator",
    brokers: ['kafka:9092']
})