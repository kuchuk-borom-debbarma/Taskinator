#!/bin/bash

# Taskinator Backend Services Starter
# This script starts the DB, Workspace, Identity, and Gateway services.

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the directory where the script is located
BACKEND_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( dirname "$BACKEND_DIR" )"

echo -e "${BLUE}Stopping any existing services...${NC}"
# Kill processes on ports 8080, 8787, 4000
lsof -ti :8080,8787,4000 | xargs kill -9 2>/dev/null || true

cleanup() {
    echo -e "\n${BLUE}Shutting down all services...${NC}"
    # Kill all background jobs started by this script
    kill $(jobs -p) 2>/dev/null
    exit
}

# Catch Ctrl+C
trap cleanup SIGINT SIGTERM

echo -e "${BLUE}1. Checking Docker Status...${NC}"
PROFILE=""
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}WARNING: Docker daemon is not reachable or has errors. Skipping database setup...${NC}"
    echo -e "${BLUE}Assuming databases are already running or accessible.${NC}"
    PROFILE="no-kafka"
else
    echo -e "${BLUE}Checking Databases...${NC}"
    if [ "$(docker ps -q -f name=taskinator-workspace-db)" ] && [ "$(docker ps -q -f name=taskinator-identity-db)" ]; then
        echo -e "${GREEN}Databases are already running. Skipping 'docker compose up'.${NC}"
    else
        echo -e "${BLUE}Starting Databases (Docker)...${NC}"
        cd "$ROOT_DIR" && docker compose up -d
    fi

    echo -e "${BLUE}Waiting for databases to be healthy...${NC}"
    until [ "$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}starting{{end}}' taskinator-workspace-db 2>/dev/null)" == "healthy" ] && \
          [ "$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}starting{{end}}' taskinator-identity-db 2>/dev/null)" == "healthy" ]; do
        echo -n "."
        sleep 2
    done
    echo -e "\n${GREEN}Databases are healthy!${NC}"
fi

echo -e "${BLUE}2. Starting Workspace Service (Gradle)...${NC}"
GRADLE_ARGS=""
if [ "$PROFILE" == "no-kafka" ]; then
    GRADLE_ARGS="--args='--spring.profiles.active=no-kafka'"
fi
cd "$BACKEND_DIR/services/workspace" && ./gradlew bootRun $GRADLE_ARGS > "$BACKEND_DIR/workspace.log" 2>&1 &

echo -e "${BLUE}3. Starting Identity Service (Bun/Wrangler)...${NC}"
cd "$BACKEND_DIR/services/identity" && bun run dev > "$BACKEND_DIR/identity.log" 2>&1 &

echo -e "${BLUE}Waiting for subgraphs to initialize...${NC}"
# Wait for Workspace (8080)
until curl -s http://localhost:8080/graphql > /dev/null; do
  echo -n "."
  sleep 2
done
echo -e "\n${GREEN}Workspace Service is ready!${NC}"

# Wait for Identity (8787)
until curl -s http://localhost:8787/graphql > /dev/null; do
  echo -n "."
  sleep 2
done
echo -e "\n${GREEN}Identity Service is ready!${NC}"

echo -e "${BLUE}4. Starting Gateway (Bun)...${NC}"
cd "$BACKEND_DIR/services/gateway" && bun run dev > "$BACKEND_DIR/gateway.log" 2>&1 &

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All services are UP!${NC}"
echo -e "Gateway: http://localhost:4000/"
echo -e "Logs: $BACKEND_DIR/workspace.log, $BACKEND_DIR/identity.log, $BACKEND_DIR/gateway.log"
echo -e "${GREEN}========================================${NC}"
echo "Press Ctrl+C to stop everything."

# Keep script alive and wait for background processes
wait
