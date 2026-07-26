#!/bin/bash
# Script to run visual E2E tests with real toko-api
# 
# Usage: ./run-visual-real-api-tests.sh
#
# This script:
# 1. Starts the toko-api (if not already running)
# 2. Starts the Next.js frontend with real API
# 3. Runs the visual E2E tests against real API

set -e

TOKO_APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOKO_API_DIR="$TOKO_APP_DIR/../toko-api"

echo "========================================"
echo "Visual E2E Tests with Real Toko API"
echo "========================================"

# Check if toko-api is running
if curl -s http://localhost:8080/health/live > /dev/null 2>&1; then
    echo "✓ toko-api is already running at http://localhost:8080"
else
    echo "Starting toko-api..."
    cd "$TOKO_API_DIR"
    docker-compose up -d
    sleep 5
    make migrate-up
    air &
    API_PID=$!
    echo "toko-api started with PID $API_PID"
    sleep 10
fi

# Start frontend with real API
echo "Starting frontend with real API..."
cd "$TOKO_APP_DIR"
NEXT_PUBLIC_API_MOCKING=false NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1 pnpm dev &
FRONTEND_PID=$!
echo "Frontend started with PID $FRONTEND_PID"
sleep 15

# Run visual tests
echo "Running visual E2E tests..."
pnpm e2e:visual:real-api

# Cleanup
echo "Cleaning up..."
kill $FRONTEND_PID 2>/dev/null || true
if [ ! -z "$API_PID" ]; then
    kill $API_PID 2>/dev/null || true
fi

echo "========================================"
echo "Visual E2E tests completed!"
echo "Screenshots saved to: test-results/screenshots/real-api/"
echo "========================================"