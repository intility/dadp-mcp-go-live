# MCP Go-Live Service (POC)

A proof of concept service for capturing, storing, and reviewing MCP server go-live reports at Intility.

## What is this?

This POC validates a simple workflow:

1. **Developer** completes MCP go-live checklist using the `mcp-go-live` skill in Claude Code
2. **Developer** submits the generated report via `submit_report()` MCP tool
3. **Platform team** reviews and approves/rejects via `list_servers()` tool or API

## Architecture

```
┌─────────────┐
│ Developer   │
│ Claude Code │
└──────┬──────┘
       │ MCP Go-Live Skill
       │ (generates report)
       ▼
┌─────────────────┐
│ MCP Server      │  submit_report()
│ (Python)        │ ────────────────► ┌──────────────┐
└─────────────────┘                   │ Rust API     │
                                      │ (Axum)       │
                                      └──────┬───────┘
                                             │
                                             ▼
                                      ┌──────────────┐
                                      │ PostgreSQL   │
                                      └──────────────┘
```

## Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **rust-api/** | Rust + Axum | HTTP API for CRUD operations |
| **mcp-server/** | Python + uv | MCP tools (submit, list) |
| **PostgreSQL** | Database | Store reports |

## Quick Start

### Prerequisites

- Rust (via `rustup`)
- Python 3.11+
- uv (`pip install uv` or `brew install uv`)
- Docker
- just (`cargo install just` or `brew install just`)

### Option 1: Using Justfile (Recommended)

```bash
# One-time setup
just setup

# Start all services
just start-all

# Check status
just status

# Test the workflow
just test-workflow

# Stop services
just stop-all
```

### Option 2: Manual Setup

```bash
# 1. Start PostgreSQL
docker run -d --name golive-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=golive \
  -p 5433:5432 \
  postgres:16-alpine

# 2. Start Rust API
cd rust-api
export DATABASE_URL="postgres://postgres:password@localhost/golive"
cargo run
# Running on http://localhost:8080

# 3. Start MCP Server
cd mcp-server
uv sync
export API_BASE_URL="http://localhost:8080/api/v1"
uv run python -m mcp_golive.server

# 4. Test
curl http://localhost:8080/healthz
```

## MCP Tools

### `submit_report()`
Submit a completed go-live report.

```typescript
{
  server_name: string,
  repository_url: string,
  developer_email: string,
  report_markdown: string
}
```

### `list_servers(status)`
List submitted servers for review.

```typescript
{
  status?: "pending_review" | "approved" | "rejected" | "all"
}
```

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/reports` | Submit report |
| GET | `/api/v1/reports` | List reports |
| GET | `/api/v1/reports/{id}` | Get report details |
| PATCH | `/api/v1/reports/{id}/status` | Approve/reject |

## Justfile Commands

### Top-Level Commands (from repository root)

```bash
# Setup & Installation
just setup              # Install all dependencies (Rust + Python)
just install            # Install dependencies

# Service Management
just start-all          # Start all services in background
just stop-all           # Stop all services
just status             # Show service status
just run                # Run both services (API in bg, MCP in fg)
just run-api            # Run only Rust API
just run-mcp            # Run only MCP server

# Database
just db-start           # Start PostgreSQL
just db-stop            # Stop PostgreSQL
just db-reset           # Reset database
just db-view            # View reports in DB

# Testing
just test               # Run all tests
just test-api           # Test Rust API only
just test-mcp           # Test MCP server only
just test-workflow      # Test full workflow
just test-integration   # Full integration test

# Code Quality
just fmt                # Format all code
just lint               # Lint all code
just check              # Run all checks

# Utilities
just clean              # Clean build artifacts
just reset              # Full reset (stop + db-reset + clean)
just info               # Show project info
```

### Service-Specific Commands

**Rust API** (`cd rust-api && just <command>`):
- `build`, `run`, `test`, `lint`, `fmt`
- `test-health`, `test-submit`, `test-list`
- See `rust-api/justfile` for all commands

**MCP Server** (`cd mcp-server && just <command>`):
- `run`, `test`, `test-manual`
- `test-submit`, `test-list`, `test-list-pending`
- See `mcp-server/justfile` for all commands

## Example Workflow

```bash
# 1. Developer submits report (via MCP tool in Claude Code)
# Result: Report stored with status "pending_review"

# 2. Platform team lists pending reports
curl http://localhost:8080/api/v1/reports?status=pending_review

# Or using MCP server tool
cd mcp-server && just test-list-pending

# 3. Platform team reviews full report
curl http://localhost:8080/api/v1/reports/{id}

# 4. Platform team approves
curl -X PATCH http://localhost:8080/api/v1/reports/{id}/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "reviewed_by": "platform@intility.no",
    "review_notes": "All checks passed"
  }'
```

## Database Schema

```sql
CREATE TABLE mcp_server_reports (
    id UUID PRIMARY KEY,
    server_name VARCHAR(255),
    repository_url VARCHAR(500) UNIQUE,
    developer_email VARCHAR(255),
    report_data TEXT,                    -- Full markdown report
    status VARCHAR(50),                  -- pending_review | approved | rejected
    submitted_at TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by VARCHAR(255),
    review_notes TEXT
);
```

## POC Scope

**Included:**
- ✅ Submit and store reports
- ✅ List/view/approve reports
- ✅ Basic data persistence
- ✅ Simple workflow validation

**Not Included (Post-POC):**
- ❌ Automated validation (GitHub API, kubectl)
- ❌ Code analysis tools
- ❌ OBO authentication
- ❌ Web UI
- ❌ Email notifications
- ❌ Audit logging
- ❌ OpenTelemetry

## Documentation

- **[PRD](docs/PRD.md)** - Product requirements (POC scope)
- **[Architecture](docs/ARCHITECTURE.md)** - Technical architecture
- **[CLAUDE.md](CLAUDE.md)** - Developer guide for Claude Code

## Development

See [CLAUDE.md](CLAUDE.md) for detailed development instructions including:
- Adding API endpoints
- Modifying database schema
- Adding MCP tools
- Testing
- Troubleshooting

## Testing

```bash
# Run Rust tests
cd rust-api && cargo test

# Run Python tests
cd mcp-server && uv run pytest

# Integration test
docker-compose up -d
curl -X POST http://localhost:8080/api/v1/reports \
  -H "Content-Type: application/json" \
  -d '{"server_name":"test","repository_url":"https://github.com/test","developer_email":"test@test.com","report_data":"# Test"}'
```

## Tech Stack

- **Rust + Axum** - Fast, type-safe API
- **PostgreSQL + sqlx** - Reliable database with type-checked queries
- **Python + uv** - Fast package management
- **MCP Protocol** - Model Context Protocol for Claude Code integration

## License

Internal Intility project.

## Questions?

- **Slack:** #programming or #devinfra
- **Email:** platform-team@intility.no
