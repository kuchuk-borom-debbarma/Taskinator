# Getting Started

Welcome to the Taskinator-v2 developer guide! Follow these steps to get your local environment up and running.

## 📋 Prerequisites

- **Bun**: v1.0+ (Recommended for performance) or Node.js v20+
- **Docker**: For running infrastructure (Kafka, Redis, Postgres)
- **PostgreSQL Client**: To inspect the database (optional)

## 🛠 Setup Steps

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/Taskinator-v2.git
cd Taskinator-v2
```

### 2. Start Infrastructure
```bash
cd modular-monolith
docker-compose up -d
```

### 3. Install Dependencies
```bash
bun install
```

### 4. Configure Environment
Copy the example environment file and update the values if necessary.
```bash
cp .env.example .env
```

### 5. Run the Application
```bash
bun run dev
```

The server should now be running at `http://localhost:4000/graphql`. You can open the GraphQL playground to explore the API.

## 🧪 Verify the Installation
Run the health check test to ensure all connections (DB, Kafka, Redis) are working correctly.

```bash
bun test src/tests/health.test.ts
```

## 📚 Next Steps
- [Architecture Overview](./Architecture-Overview.md)
- [Development Guide](./Development.md)
- [Modular Monolith Design](./Modular-Monolith-Design.md)
