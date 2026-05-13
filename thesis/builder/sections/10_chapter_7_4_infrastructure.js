const { Paragraph, TextRun } = require('docx');
const { h2, h3, body, codeBlock, emptyLine, insertImage, figCaption, F } = require('../utils');

module.exports = function getChapter7_4() {
  return [
    h2("7.4 Cloud-Native Infrastructure and Deployment Orchestration"),
    body("The robustness of the Taskinator engine is fundamentally supported by its cloud-native infrastructure design. The platform is architected to run on a container-orchestrated backbone, utilizing Kubernetes for horizontal scaling and high availability."),

    h3("7.4.1 Containerization with Docker and Multi-Stage Builds"),
    body("Every microservice within the Taskinator ecosystem is containerized using Docker. To minimize the attack surface and optimize cold-start times, the system utilizes multi-stage builds. This approach ensures that build-time dependencies (like compilers and source code) are excluded from the final production image, resulting in lightweight, secure, and high-performance artifacts."),
    
    codeBlock(`# Multi-Stage Dockerfile Strategy
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER node
CMD ["node", "dist/main.js"]`),

    h3("7.4.2 Kubernetes Orchestration and Auto-Scaling"),
    body("Deployment is managed via Kubernetes Helm charts, providing a templated and reproducible environment. The system utilizes Horizontal Pod Autoscalers (HPA) to dynamically adjust the number of service replicas based on CPU and memory utilization metrics gathered by Prometheus."),
    body("A critical component of this orchestration is the SSE pod management. Because SSE connections are stateful and persistent, the Kubernetes ingress controller is configured with 'Session Affinity' (Sticky Sessions) to ensure that real-time clients remain connected to the correct instance during their session duration."),

    h3("7.4.3 Infrastructure as Code (IaC) with Terraform"),
    body("The entire underlying cloud environment—including the Managed PostgreSQL (Neon), Kafka (Confluent), and Redis (Upstash) instances—is provisioned using Terraform. This Infrastructure as Code (IaC) approach guarantees that the production environment is a perfect mirror of the development and staging environments, eliminating 'Environmental Drift' and ensuring deterministic deployments."),
  ];
};
