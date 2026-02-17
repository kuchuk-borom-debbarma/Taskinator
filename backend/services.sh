#!/bin/bash

# Taskinator Backend Services Starter
# This script starts the DB, Workspace, Identity, and Gateway services.

# Colors for output
GREEN='\033[0u32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Stopping any existing services...${NC}"
# Kill processes on ports 8080, 8787, 4000
lsof -ti :8080,8787,4000 | xargs kill -9 2>/dev/null || true

cleanup() {
    echo -e "
${BLUE}Shutting down all services...${NC}"
    # Kill all background jobs started by this script
    kill $(jobs -p) 2>/dev/null
    exit
}

# Catch Ctrl+C
trap cleanup SIGINT SIGTERM

echo -e "${BLUE}1. Starting Database (Docker)...${NC}"
cd services/workspace && docker compose up -d
cd ../..

echo -e "${BLUE}2. Starting Workspace Service (Gradle)...${NC}"
cd services/workspace && ./gradlew bootRun > ../../workspace.log 2>&1 &
cd ../..

echo -e "${BLUE}3. Starting Identity Service (Bun/Wrangler)...${NC}"
cd services/identity && bun run dev > ../../identity.log 2>&1 &
cd ../..

echo -e "${BLUE}Waiting for subgraphs to initialize...${NC}"
# Wait for Workspace (8080)
until curl -s http://localhost:8080/graphql > /dev/null; do
  echo -n "."
  sleep 2
done
echo -e "
${GREEN}Workspace Service is ready!${NC}"

# Wait for Identity (8787)
until curl -s http://localhost:8787/graphql > /dev/null; do
  echo -n "."
  sleep 2
done
echo -e "
${GREEN}Identity Service is ready!${NC}"

echo -e "${BLUE}4. Starting Gateway (Bun)...${NC}"
cd services/gateway && bun run dev > ../../gateway.log 2>&1 &
cd ../..

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All services are UP!${NC}"
echo -e "Gateway: http://localhost:4000/"
echo -e "Logs: workspace.log, identity.log, gateway.log"
echo -e "${GREEN}========================================${NC}"
echo "Press Ctrl+C to stop everything."

# Keep script alive and wait for background processes
wait
