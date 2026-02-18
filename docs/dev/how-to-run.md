# How to Run Taskinator

This guide explains how to start the full Taskinator development environment, including the database, backend microservices, and the React frontend prototype.

## Prerequisites
- **Docker & Docker Compose** (for PostgreSQL)
- **Node.js & npm** (for Gateway and Frontend)
- **Bun** (required for Gateway and Identity services)
- **Java 21** (for Workspace service)

---

## 🚀 Step 1: Start Backend Services (Automated)

The easiest way to start the entire backend is using the provided `services.sh` script located in the `backend/` directory.

1. Open a terminal and navigate to the project root.
2. Run the starter script:
   ```bash
   cd backend
   bash services.sh
   ```

**What this script does:**
- Starts the **PostgreSQL** database via Docker Compose.
- Starts the **Workspace Service** (Spring Boot) on `http://localhost:8080`.
- Starts the **Identity Service** (Cloudflare Wrangler) on `http://localhost:8787`.
- Starts the **GraphQL Gateway** (Bun) on `http://localhost:4000`.

*Note: The script will wait for subgraphs to be healthy before starting the Gateway.*

---

## 🎨 Step 2: Start the Frontend Prototype

Once the backend is healthy, you can start the React development server.

1. Open a **new** terminal window.
2. Navigate to the web prototype directory:
   ```bash
   cd web/prototype
   npm run dev
   ```
3. Open your browser to the URL shown in the terminal (usually `http://localhost:5173`).

---

## 🛠 Manual Service Management

If you need to run or debug services individually:

### Database
```bash
cd backend/services/workspace
docker compose up -d
```

### Identity Service (Cloudflare Worker)
```bash
cd backend/services/identity
bun install
bun run dev
```

### Workspace Service (Spring Boot)
```bash
cd backend/services/workspace
./gradlew bootRun
```

### GraphQL Gateway (Bun)
```bash
cd backend/services/gateway
bun install
bun run dev
```

---

## 📝 Common Troubleshooting

### Ports are already in use
If you see errors about ports being bound, you can kill existing services with:
```bash
lsof -ti :8080,8787,4000,5432 | xargs kill -9
```

### JWT Authentication Errors
Ensure the `JWT_SECRET` matches across services.
- **Identity:** Checked in `backend/services/identity/.dev.vars`
- **Gateway:** Checked in `backend/services/gateway/index.ts` (defaults to `super-secret-key`)

### Database Connection
If Workspace fails to start, ensure the Docker container is running:
```bash
docker ps | grep workspace-db
```
