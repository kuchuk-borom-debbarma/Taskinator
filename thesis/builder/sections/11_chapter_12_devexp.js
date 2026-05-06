const { Paragraph, TextRun } = require('docx');
const { h1, h2, h3, body, codeBlock, emptyLine, pageBreak } = require('../utils');

module.exports = function getChapter12_DevExp() {
  return [
    h1("12. DEVELOPER EXPERIENCE AND SYSTEM TOOLING"),
    body("For a complex distributed system like Taskinator, developer productivity is a key success metric. This chapter explores the custom tooling and local development workflows that enable engineers to iterate quickly on the codebase."),

    h2("12.1 The Taskinator CLI"),
    body("To streamline common tasks—such as bootstrapping a new microservice, running local migrations, or generating mock event data—we developed a custom CLI tool built with Node.js and the 'commander' library. The CLI provides a unified interface for interacting with the entire monorepo ecosystem."),

    h3("12.1.1 Sample CLI Commands"),
    codeBlock(`# Generate 100,000 mock tasks for stress testing
taskinator seed-tasks --project <id> --count 100000

# Start the full local environment (Postgres, Kafka, Redis)
taskinator dev-env up

# Execute the outbox relay in dry-run mode
taskinator outbox relay --dry-run`),

    h2("12.2 Local Development with Docker Compose"),
    body("The entire infrastructure backbone is containerized using Docker. A comprehensive docker-compose.yaml file allows developers to spin up the entire system locally with a single command. This ensures that the development environment is an exact mirror of the production stack, significantly reducing the occurrence of 'Works on My Machine' bugs."),

    h2("12.3 Monorepo Management (TurboRepo)"),
    body("Taskinator utilizes TurboRepo to manage the monorepo structure. Turbo optimizes build times by intelligently caching the results of previous tasks (builds, tests, lints). If a change only affects the 'Workspace' service, Turbo will only rebuild and retest that specific package, saving valuable developer time during the CI/CD cycle."),

    pageBreak(),
  ];
};
