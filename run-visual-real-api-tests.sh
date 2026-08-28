#!/bin/bash
# Script to run visual E2E tests with real toko-api
#
# Usage: ./run-visual-real-api-tests.sh
#
# This script:
# 1. Starts the toko-api (if not already running)
# 2. Starts the Next.js frontend with real API
# 3. Runs the visual E2E tests against real API

set -euo pipefail

TOKO_APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOKO_API_DIR="$TOKO_APP_DIR/../toko-api"
API_PID=""
FRONTEND_PID=""

# Keep the runner aligned with the API's local configuration. The backend
# .env is intentionally not sourced wholesale because it contains secrets and
# its PORT must not leak into the Next.js process.
API_PORT="${TOKO_API_PORT:-}"
if [ -z "$API_PORT" ] && [ -f "$TOKO_API_DIR/.env" ]; then
    api_port_line="$(grep -m1 '^PORT=' "$TOKO_API_DIR/.env" || true)"
    if [ -n "$api_port_line" ]; then
        API_PORT="${api_port_line#PORT=}"
        API_PORT="${API_PORT%\"}"
        API_PORT="${API_PORT#\"}"
        API_PORT="${API_PORT%\'}"
        API_PORT="${API_PORT#\'}"
    fi
fi
API_PORT="${API_PORT:-8080}"
API_PORT="${API_PORT#:}"
API_HOST="${TOKO_API_HOST:-localhost}"
API_BASE_URL="${TOKO_API_URL:-http://${API_HOST}:${API_PORT}/api/v1}"
API_HEALTH_URL="${TOKO_API_HEALTH_URL:-http://${API_HOST}:${API_PORT}/health/live}"

cleanup() {
    echo "Cleaning up..."
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    if [ -n "$API_PID" ]; then
        # air launches the compiled API as a child process; stop it before
        # stopping air so the test runner does not leave the API on its port.
        pkill -TERM -P "$API_PID" 2>/dev/null || true
        kill "$API_PID" 2>/dev/null || true
        wait "$API_PID" 2>/dev/null || true
    fi
}
trap cleanup EXIT

# Import only DATABASE_URL from the backend environment. In particular, do not
# leak its PORT into the Next.js process, which must listen on :3000.
if [ -z "${DATABASE_URL:-}" ] && [ -f "$TOKO_API_DIR/.env" ]; then
    database_url_line="$(grep -m1 '^DATABASE_URL=' "$TOKO_API_DIR/.env" || true)"
    if [ -n "$database_url_line" ]; then
        database_url="${database_url_line#DATABASE_URL=}"
        database_url="${database_url%\"}"
        database_url="${database_url#\"}"
        database_url="${database_url%\'}"
        database_url="${database_url#\'}"
        export DATABASE_URL="$database_url"
    fi
fi
unset PORT

# The suite drives ~24 browser scenarios from a single host. With the production
# defaults (RATE_LIMIT_USER_MAX=120/min) it exhausts the limiter partway through,
# and the resulting 429s surface as unrelated-looking UI failures: server-side
# product fetches fall back to empty data, carts fail to create. Raise the
# limits for the test API only.
export RATE_LIMIT_GLOBAL_MAX="${RATE_LIMIT_GLOBAL_MAX:-100000}"
export RATE_LIMIT_USER_MAX="${RATE_LIMIT_USER_MAX:-100000}"
export RATE_LIMIT_IP_MAX="${RATE_LIMIT_IP_MAX:-100000}"

# The repository ships a deterministic provider for local development and E2E.
# Override this with SHIPPING_PROVIDER=rajaongkir when real provider credentials
# are available and the external integration itself is under test.
export SHIPPING_PROVIDER="${SHIPPING_PROVIDER:-rajaongkir-mock}"

export NEXT_PUBLIC_API_MOCKING=false
export NEXT_PUBLIC_API_URL="$API_BASE_URL"
export PLAYWRIGHT_REAL_API_URL="$API_BASE_URL"
export NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-http://localhost:3000}"

# Air invokes the Go compiler while rebuilding the API. Use the caller's
# GOTMPDIR when it is available and writable; otherwise fall back to /tmp so
# the runner also works in restricted CI/sandbox environments.
if [ -z "${GOTMPDIR:-}" ] || [ ! -d "$GOTMPDIR" ] || [ ! -w "$GOTMPDIR" ]; then
    API_GO_TMP_DIR="${TMPDIR:-/tmp}/toko-api-go-tmp"
    mkdir -p "$API_GO_TMP_DIR"
    export GOTMPDIR="$API_GO_TMP_DIR"
fi

echo "========================================"
echo "Visual E2E Tests with Real Toko API"
echo "========================================"

# Check if toko-api is running
if curl --fail --silent "$API_HEALTH_URL" >/dev/null 2>&1; then
    echo "✓ toko-api is already running at $API_BASE_URL"
    echo "  NOTE: ensure it was started with raised RATE_LIMIT_* values,"
    echo "        otherwise later tests will fail on 429s."
else
    echo "Starting toko-api..."
    cd "$TOKO_API_DIR"
    docker-compose up -d
    sleep 5
    make migrate-up
    PORT="$API_PORT" air &
    API_PID=$!
    echo "toko-api started with PID $API_PID"
    for attempt in $(seq 1 30); do
        if curl --fail --silent "$API_HEALTH_URL" >/dev/null; then
            break
        fi
        if [ "$attempt" -eq 30 ]; then
            echo "✗ toko-api did not become ready at $API_HEALTH_URL" >&2
            exit 1
        fi
        sleep 1
    done
fi

# Start frontend with real API
echo "Starting frontend with real API..."
cd "$TOKO_APP_DIR"
pnpm dev &
FRONTEND_PID=$!
echo "Frontend started with PID $FRONTEND_PID"

for attempt in $(seq 1 60); do
    health_page="$(curl --fail --silent http://localhost:3000/health 2>/dev/null || true)"
    if [[ "$health_page" == *"Health check"* && "$health_page" == *"toko"* ]]; then
        echo "✓ toko frontend is ready at http://localhost:3000"
        break
    fi
    if [ "$attempt" -eq 60 ]; then
        echo "✗ :3000 is not serving the toko app with a healthy real API connection" >&2
        exit 1
    fi
    sleep 1
done

# Run visual tests
echo "Running visual E2E tests..."
pnpm e2e:visual:real-api

echo "========================================"
echo "Visual E2E tests completed!"
echo "Screenshots saved to: test-results/screenshots/real-api/"
echo "========================================"
