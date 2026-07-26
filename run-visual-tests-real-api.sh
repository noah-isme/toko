#!/bin/bash

# Script to run visual E2E tests against the real toko-api
# 
# Prerequisites:
# 1. toko-api must be running on localhost:8080
# 2. Database must be migrated (run `make migrate-up` in toko-api)
# 3. Frontend must be running on localhost:3000 with real API config

set -e

echo "=== Toko Visual E2E Tests with Real API ==="
echo ""

# Check if API is running
if ! curl -s http://localhost:8080/health/live > /dev/null 2>&1; then
  echo "❌ toko-api is not running on localhost:8080"
  echo ""
  echo "To start the API:"
  echo "  cd ../toko-api"
  echo "  docker-compose up -d"
  echo "  make migrate-up"
  echo "  air"
  echo ""
  exit 1
fi

echo "✅ toko-api is running"

# Check if frontend is running
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo "❌ Frontend is not running on localhost:3000"
  echo ""
  echo "To start the frontend with real API:"
  echo "  NEXT_PUBLIC_API_MOCKING=false NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1 pnpm dev"
  echo ""
  exit 1
fi

echo "✅ Frontend is running"
echo ""

# Run the visual tests
echo "Running visual E2E tests..."
pnpm e2e:visual:real-api

echo ""
echo "=== Tests Complete ==="
echo "Screenshots saved to: test-results/screenshots/real-api/"