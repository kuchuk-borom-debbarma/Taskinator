const { Paragraph, TextRun } = require('docx');
const { h1, h2, h3, body, codeBlock, emptyLine, pageBreak } = require('../utils');

module.exports = function getChapter11_Deployment() {
  return [
    h1("11. DEPLOYMENT ARCHITECTURE AND ORCHESTRATION"),
    body("The transition from a local development environment to a production-grade, highly available infrastructure requires a robust deployment strategy. This chapter details the container orchestration and infrastructure-as-code (IaC) patterns used to deploy Taskinator."),

    h2("11.1 Kubernetes Workload Distribution"),
    body("Taskinator is deployed as a set of microservices within a Kubernetes cluster. Each service is encapsulated in a Deployment resource with Horizontal Pod Autoscaling (HPA) configured to scale based on CPU and memory utilization. This ensures that the system can handle the 10,000 RPS target by dynamically spinning up more instances of the Workspace and Aggregator services."),

    h3("11.1.1 Deployment Configuration (Workspace Service)"),
    body("The following YAML snippet represents a simplified version of the Kubernetes Deployment for the primary Workspace service, illustrating the resource limits and health checks."),
    codeBlock(`apiVersion: apps/v1
kind: Deployment
metadata:
  name: workspace-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: workspace
  template:
    spec:
      containers:
      - name: workspace
        image: taskinator/workspace:latest
        resources:
          limits:
            cpu: "1000m"
            memory: "2Gi"
          requests:
            cpu: "500m"
            memory: "1Gi"
        livenessProbe:
          httpGet:
            path: /health
            port: 4000
        readinessProbe:
          httpGet:
            path: /ready
            port: 4000`),

    h2("11.2 Infrastructure as Code (Terraform)"),
    body("To ensure environmental consistency and prevent 'Configuration Drift', the entire cloud infrastructure—including the managed PostgreSQL instances, Kafka clusters, and Load Balancers—is provisioned using Terraform. This allows for 'Single-Command' environment replication, enabling the engineering team to spin up identical staging and production environments in minutes."),

    h2("11.3 CI/CD Pipeline (GitHub Actions)"),
    body("The deployment pipeline is fully automated using GitHub Actions. Every merge to the main branch triggers a multi-stage workflow:"),
    body("1. Static Analysis & Linting (ESLint/TypeScript)."),
    body("2. Unit & Integration Testing (Vitest/Testcontainers)."),
    body("3. Docker Image Build & Push (Multi-stage builds for minimal image size)."),
    body("4. Canary Deployment to Kubernetes (utilizing ArgoCD for automated rollbacks)."),

    pageBreak(),
  ];
};
