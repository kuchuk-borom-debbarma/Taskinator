import express from "express";
import {kafkaProducer} from "./kafka/producer.ts";

await kafkaProducer.connect();

const app = express();
const port = 8080;

app.listen(port, () => {
    console.log(`Listening on port ${port}...`);
});