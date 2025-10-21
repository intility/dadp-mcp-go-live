# Justfile for MCP Go-Live Service (Monorepo)
# Run `just --list` to see all available commands

# Default recipe
default:
    @just --list

# ============================================================================
# Setup & Installation
# ============================================================================

# Install all dependencies (Rust API + MCP Server)
setup:
    @echo "==> Setting up Rust API..."
    cd rust-api && just setup
    @echo ""
    @echo "==> Setting up MCP Server..."
    cd mcp-server && just setup
    @echo ""
    @echo "✅ Setup complete for both services!"

# Install dependencies for both services
install:
    @echo "==> Installing Rust API dependencies..."
    cd rust-api && just install
    @echo ""
    @echo "==> Installing MCP Server dependencies..."
    cd mcp-server && just install
    @echo ""
    @echo "✅ Dependencies installed!"

# ============================================================================
# Database Management
# ============================================================================

# Start PostgreSQL
db-start:
    cd rust-api && just db-start

# Stop PostgreSQL
db-stop:
    cd rust-api && just db-stop

# Reset database
db-reset:
    cd rust-api && just db-reset

# Run database migrations
migrate:
    cd rust-api && just migrate

# Connect to database with psql
db-connect:
    cd rust-api && just db-connect

# View all reports in database
db-view:
    cd rust-api && just db-view

# Clear all reports from database
db-clear:
    cd rust-api && just db-clear

# ============================================================================
# Development - Individual Services
# ============================================================================

# Run only the Rust API (port 8080)
run-api:
    cd rust-api && just run

# Run only the MCP Server in stdio mode (default)
run-mcp:
    cd mcp-server && just run

# Run only the MCP Server in HTTP mode (port 3000)
run-mcp-http:
    cd mcp-server && just run-http

# ============================================================================
# Development - Full Stack
# ============================================================================

# Start both services (API in background, MCP in foreground)
run: db-start
    #!/usr/bin/env bash
    set -euo pipefail

    echo "==> Starting Rust API in background..."
    cd rust-api
    export DATABASE_URL="${DATABASE_URL:-postgres://postgres:password@localhost:5433/golive}"
    export PORT="8080"
    export RUST_LOG="${RUST_LOG:-golive_api=debug,tower_http=debug}"
    cargo run &
    API_PID=$!
    cd ..

    echo "Waiting for API to start..."
    sleep 3

    # Check if API is running
    if curl -s http://localhost:8080/healthz >/dev/null 2>&1; then
        echo "✅ API is running on http://localhost:8080"
    else
        echo "❌ API failed to start"
        kill $API_PID 2>/dev/null || true
        exit 1
    fi

    echo ""
    echo "==> Starting MCP Server..."
    echo "Press Ctrl+C to stop both services"
    echo ""

    # Trap to cleanup on exit
    trap "echo ''; echo 'Stopping services...'; kill $API_PID 2>/dev/null || true; exit" INT TERM

    cd mcp-server
    export API_BASE_URL="http://localhost:8080/api/v1"
    uv run python -m mcp_golive.server

    # Cleanup
    kill $API_PID 2>/dev/null || true

# Start all services in background (for testing - returns immediately)
start-all: db-start
    #!/usr/bin/env bash
    set -euo pipefail

    echo "==> Starting Rust API in background..."
    cd rust-api
    export DATABASE_URL="${DATABASE_URL:-postgres://postgres:password@localhost:5433/golive}"
    export PORT="8080"
    export RUST_LOG="${RUST_LOG:-golive_api=info}"
    cargo run > /tmp/golive-api.log 2>&1 &
    echo $! > /tmp/golive-api.pid
    cd ..

    echo "Waiting for API to start..."
    sleep 3

    if curl -s http://localhost:8080/healthz >/dev/null 2>&1; then
        echo "✅ API is running on http://localhost:8080"
        echo "   Logs: /tmp/golive-api.log"
        echo "   PID: $(cat /tmp/golive-api.pid)"
    else
        echo "❌ API failed to start. Check /tmp/golive-api.log"
        exit 1
    fi

    echo ""
    echo "Services started!"
    echo "To stop: just stop-all"

# Start all services with MCP in HTTP mode (API + MCP HTTP)
start-all-http: db-start
    #!/usr/bin/env bash
    set -euo pipefail

    # Cleanup function
    cleanup() {
        echo ""
        echo "==> Stopping services..."
        if [ -f /tmp/golive-api.pid ]; then
            kill $(cat /tmp/golive-api.pid) 2>/dev/null || true
            rm /tmp/golive-api.pid
            echo "✅ Stopped Rust API"
        fi
        if [ -f /tmp/golive-mcp.pid ]; then
            kill $(cat /tmp/golive-mcp.pid) 2>/dev/null || true
            rm /tmp/golive-mcp.pid
            echo "✅ Stopped MCP Server"
        fi
        # Cleanup any remaining processes
        pkill -f "cargo run" 2>/dev/null || true
        pkill -f "mcp_golive.server" 2>/dev/null || true
        exit 0
    }

    # Set trap for cleanup on exit
    trap cleanup INT TERM EXIT

    echo "==> Starting Rust API in background..."
    cd rust-api
    export DATABASE_URL="${DATABASE_URL:-postgres://postgres:password@localhost:5433/golive}"
    export PORT="8080"
    export RUST_LOG="${RUST_LOG:-golive_api=info}"
    cargo run > /tmp/golive-api.log 2>&1 &
    echo $! > /tmp/golive-api.pid
    cd ..

    echo "Waiting for API to start..."
    sleep 3

    if curl -s http://localhost:8080/healthz >/dev/null 2>&1; then
        echo "✅ API is running on http://localhost:8080"
        echo "   Logs: /tmp/golive-api.log"
    else
        echo "❌ API failed to start. Check /tmp/golive-api.log"
        exit 1
    fi

    echo ""
    echo "==> Starting MCP Server in HTTP mode..."
    cd mcp-server
    export API_BASE_URL="http://localhost:8080/api/v1"
    export MCP_PORT="3000"
    uv run python -m mcp_golive.server --http > /tmp/golive-mcp.log 2>&1 &
    echo $! > /tmp/golive-mcp.pid
    cd ..

    echo "Waiting for MCP server to start..."
    sleep 2

    if curl -s http://localhost:3000/mcp >/dev/null 2>&1; then
        echo "✅ MCP is running on http://localhost:3000/mcp"
        echo "   Logs: /tmp/golive-mcp.log"
        echo "   PID: $(cat /tmp/golive-mcp.pid)"
    else
        echo "⚠️  MCP server starting (check /tmp/golive-mcp.log)"
    fi

    echo ""
    echo "All services started!"
    echo "  - API: http://localhost:8080"
    echo "  - MCP: http://localhost:3000/mcp"
    echo "  - PostgreSQL: localhost:5433"
    echo ""
    echo "Press Ctrl+C to stop all services"
    echo ""

    # Keep the script running until interrupted
    echo "Services are running. Monitoring logs..."
    tail -f /tmp/golive-api.log /tmp/golive-mcp.log

# Stop all background services
stop-all:
    #!/usr/bin/env bash
    echo "Stopping services..."

    # Stop API
    if [ -f /tmp/golive-api.pid ]; then
        kill $(cat /tmp/golive-api.pid) 2>/dev/null || true
        rm /tmp/golive-api.pid
        echo "✅ Stopped Rust API"
    fi

    # Stop MCP server
    if [ -f /tmp/golive-mcp.pid ]; then
        kill $(cat /tmp/golive-mcp.pid) 2>/dev/null || true
        rm /tmp/golive-mcp.pid
        echo "✅ Stopped MCP Server"
    fi

    # Stop any remaining cargo processes
    pkill -f "cargo run" 2>/dev/null || true
    pkill -f "golive-api" 2>/dev/null || true

    # Stop any remaining Python MCP processes
    pkill -f "mcp_golive.server" 2>/dev/null || true

    echo "✅ All services stopped"

# ============================================================================
# Testing - Individual Services
# ============================================================================

# Run Rust API tests
test-api:
    cd rust-api && just test

# Run MCP Server tests
test-mcp:
    cd mcp-server && just test

# Run all tests (both services)
test:
    @echo "==> Testing Rust API..."
    cd rust-api && just test
    @echo ""
    @echo "==> Testing MCP Server..."
    cd mcp-server && just test
    @echo ""
    @echo "✅ All tests passed!"

# ============================================================================
# Testing - Integration
# ============================================================================

# Run full integration test (starts services, runs tests, stops services)
test-integration: db-reset
    #!/usr/bin/env bash
    set -euo pipefail

    echo "==> Starting services for integration test..."
    just start-all

    echo ""
    echo "==> Running API integration test..."
    cd rust-api && just test-health

    echo ""
    echo "==> Running MCP integration test..."
    cd mcp-server && just test-manual

    echo ""
    echo "==> Stopping services..."
    just stop-all

    echo ""
    echo "✅ Integration test complete!"

# Test full workflow (API endpoints + MCP tools)
test-workflow: start-all
    #!/usr/bin/env bash
    set -euo pipefail

    echo "==> Testing API health..."
    curl -s http://localhost:8080/healthz
    echo ""

    echo ""
    echo "==> Testing MCP submit_report..."
    cd mcp-server && just test-submit

    echo ""
    echo "==> Testing MCP list_servers..."
    cd mcp-server && just test-list

    echo ""
    echo "✅ Workflow test complete!"
    echo ""
    echo "Run 'just stop-all' to stop services"

# ============================================================================
# Code Quality
# ============================================================================

# Run code formatting for both services
fmt:
    @echo "==> Formatting Rust code..."
    cd rust-api && just fmt
    @echo ""
    @echo "==> Formatting Python code..."
    cd mcp-server && just fmt || echo "(Python formatter optional)"
    @echo ""
    @echo "✅ Formatting complete!"

# Check code formatting for both services
fmt-check:
    @echo "==> Checking Rust formatting..."
    cd rust-api && just fmt-check
    @echo ""
    @echo "==> Checking Python formatting..."
    cd mcp-server && just fmt-check || echo "(Python formatter optional)"

# Run linters for both services
lint:
    @echo "==> Linting Rust code..."
    cd rust-api && just lint
    @echo ""
    @echo "==> Linting Python code..."
    cd mcp-server && just lint || echo "(Python linter optional)"
    @echo ""
    @echo "✅ Linting complete!"

# Run all quality checks
check:
    @echo "==> Running Rust checks..."
    cd rust-api && just check
    @echo ""
    @echo "==> Running Python checks..."
    cd mcp-server && just check || echo "(Some Python checks optional)"
    @echo ""
    @echo "✅ All checks passed!"

# ============================================================================
# Build
# ============================================================================

# Build Rust API
build:
    cd rust-api && just build

# Build Rust API for release
build-release:
    cd rust-api && just build-release

# ============================================================================
# Cleanup
# ============================================================================

# Clean build artifacts from both services
clean:
    @echo "==> Cleaning Rust API..."
    cd rust-api && just clean
    @echo ""
    @echo "==> Cleaning MCP Server..."
    cd mcp-server && just clean
    @echo ""
    @echo "✅ Cleaned!"

# Reset everything (database + clean)
reset: stop-all db-reset clean
    @echo "✅ Full reset complete!"

# ============================================================================
# Information
# ============================================================================

# Show project information
info:
    @echo "MCP Go-Live Service (Monorepo)"
    @echo "================================"
    @echo ""
    @echo "Services:"
    @echo "  - Rust API:    http://localhost:8080"
    @echo "  - MCP Server:  stdio (for Claude Code)"
    @echo "  - PostgreSQL:  localhost:5433"
    @echo ""
    @echo "==> Rust API Info:"
    cd rust-api && just info
    @echo ""
    @echo "==> MCP Server Info:"
    cd mcp-server && just info

# Show service status
status:
    #!/usr/bin/env bash
    echo "Service Status"
    echo "=============="
    echo ""

    # Check API
    if curl -s http://localhost:8080/healthz >/dev/null 2>&1; then
        echo "✅ Rust API:    running on http://localhost:8080"
    else
        echo "❌ Rust API:    not running"
    fi

    # Check MCP HTTP
    if curl -s http://localhost:3000/mcp >/dev/null 2>&1; then
        echo "✅ MCP Server:  running on http://localhost:3000/mcp (HTTP mode)"
    else
        echo "❌ MCP Server:  not running (HTTP mode)"
    fi

    # Check PostgreSQL
    if docker ps | grep -q golive-postgres; then
        echo "✅ PostgreSQL:  running on port 5433"
    else
        echo "❌ PostgreSQL:  not running"
    fi

    echo ""
    echo "Commands:"
    echo "  just start-all       - Start API only"
    echo "  just start-all-http  - Start API + MCP (HTTP mode)"

# ============================================================================
# Quick Commands
# ============================================================================

# Quick start: setup + start all services
quick-start: setup start-all
    @echo ""
    @echo "✅ Services started!"
    @echo "   API: http://localhost:8080/healthz"
    @echo ""
    @echo "Run 'just test-workflow' to test the full workflow"
    @echo "Run 'just stop-all' to stop services"

# Dev mode: start services and watch for changes
dev: db-start
    @echo "Starting development mode..."
    @echo "API will auto-reload on changes"
    cd rust-api && just watch

# Show this help
help:
    @just --list
