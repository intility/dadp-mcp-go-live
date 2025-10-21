# CLAUDE.md - Claude Code Developer Guide

**Repository:** mcp-go-live-service
**Last Updated:** 2025-10-21

---

## Project Overview

This is a **proof of concept (POC)** for capturing and reviewing MCP server go-live reports.

**What it does:**
1. Developer uses `mcp-go-live` skill in Claude Code → completes checklist → generates report
2. Developer calls `submit_report()` tool → stores report in database
3. Platform team calls `list_servers()` or API → reviews → approves/rejects

---

## Repository Structure

```
mcp-go-live-service/
├── rust-api/                # Rust API backend
│   ├── Cargo.toml
│   ├── src/
│   │   └── main.rs          # All API code (single file for POC)
│   ├── migrations/
│   │   └── 001_create_reports.sql
│   └── README.md
│
├── mcp-server/              # Python MCP server
│   ├── pyproject.toml       # uv project config
│   ├── uv.lock
│   ├── src/
│   │   └── mcp_golive/
│   │       ├── __init__.py
│   │       └── server.py    # MCP tools (submit_report, list_servers)
│   ├── tests/
│   │   └── test_server.py
│   └── README.md
│
├── docs/                    # Documentation
│   ├── PRD.md              # Product requirements (POC scope)
│   └── ARCHITECTURE.md     # Technical architecture
│
├── docker-compose.yml       # Local development
├── CLAUDE.md               # This file
└── README.md               # Project overview
```

---

## Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| API Backend | Rust + Axum | 0.8+ |
| Database | PostgreSQL | 16 |
| Database Driver | sqlx | 0.8+ |
| MCP Server | Python | 3.11+ |
| Package Manager | uv | Latest |
| MCP Framework | mcp | 0.1+ |
| HTTP Client | httpx | 0.27+ |

---

## Getting Started

### Prerequisites

- Rust (via `rustup`)
- Python 3.11+
- uv (`pip install uv` or `brew install uv`)
- Docker (for PostgreSQL)
- just (`cargo install just` or `brew install just`)

### Quick Start (Rust API)

```bash
cd rust-api

# One-time setup
just setup

# Start database & run server
just run

# In another terminal, test the API
just test-health
just test-submit
just test-list
```

### Success Criteria

The Rust API POC is complete when all of these pass:

- ✅ All endpoints respond correctly
- ✅ Database migrations run successfully
- ✅ Unit tests pass (`just test`)
- ✅ Integration test completes (`just test-integration`)
- ✅ No clippy warnings (`just lint`)
- ✅ Code is formatted (`just fmt-check`)

**Current Status:** All criteria met!

---

## Database

### Schema

```sql
CREATE TABLE mcp_server_reports (
    id UUID PRIMARY KEY,
    server_name VARCHAR(255),
    repository_url VARCHAR(500) UNIQUE,
    developer_email VARCHAR(255),
    report_data TEXT,                -- Markdown report (human-readable)
    report_json JSONB,               -- Structured data (NEW - machine-queryable)
    status VARCHAR(50),              -- 'pending_review', 'approved', 'rejected'
    submitted_at TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by VARCHAR(255),
    review_notes TEXT
);

-- Indexes for JSON queries (NEW)
CREATE INDEX idx_reports_json_risk_level
  ON mcp_server_reports ((report_json->'phase1_security'->>'risk_level'));

CREATE INDEX idx_reports_json_approval_status
  ON mcp_server_reports ((report_json->'executive_summary'->>'overall_status'));

CREATE INDEX idx_reports_json_gin
  ON mcp_server_reports USING GIN (report_json);
```

### Access Database

```bash
docker exec -it golive-postgres psql -U postgres -d golive

# Useful queries
SELECT * FROM mcp_server_reports;
SELECT * FROM mcp_server_reports WHERE status = 'pending_review';

# Query by risk level (NEW)
SELECT server_name, report_json->'phase1_security'->>'risk_level' as risk
FROM mcp_server_reports
WHERE report_json->'phase1_security'->>'risk_level' = 'HIGH';

# Query by approval status (NEW)
SELECT server_name, report_json->'executive_summary'->>'overall_status' as status
FROM mcp_server_reports
WHERE report_json IS NOT NULL;
```

---

## API Endpoints

**Base:** `http://localhost:8080/api/v1`

### POST /reports
Submit report (with optional structured JSON data).

**Markdown only (backward compatible):**
```bash
curl -X POST http://localhost:8080/api/v1/reports \
  -H "Content-Type: application/json" \
  -d '{
    "server_name": "mcp-servicenow",
    "repository_url": "https://github.com/intility/mcp-servicenow",
    "developer_email": "dev@intility.no",
    "report_data": "# Report..."
  }'
```

**With structured JSON data (NEW):**
```bash
curl -X POST http://localhost:8080/api/v1/reports \
  -H "Content-Type: application/json" \
  -d '{
    "server_name": "mcp-servicenow",
    "repository_url": "https://github.com/intility/mcp-servicenow",
    "developer_email": "dev@intility.no",
    "report_data": "# Report...",
    "report_json": {
      "report_version": "1.0",
      "server_info": {
        "server_name": "mcp-servicenow",
        "repository_url": "https://github.com/intility/mcp-servicenow"
      },
      "executive_summary": {
        "overall_status": "APPROVED",
        "critical_issues_count": 0
      },
      "phase1_security": {
        "risk_level": "LOW"
      }
    }
  }'
```

**Note:** The `report_json` field is optional and stores structured data conforming to the MCPGoLiveReport Pydantic model from the mcp-go-live skill.

### GET /reports?status={status}
List reports.

```bash
curl http://localhost:8080/api/v1/reports?status=pending_review
```

### GET /reports/{id}
Get full report.

```bash
curl http://localhost:8080/api/v1/reports/{id}
```

### PATCH /reports/{id}/status
Approve/reject.

```bash
curl -X PATCH http://localhost:8080/api/v1/reports/{id}/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "reviewed_by": "platform@intility.no",
    "review_notes": "LGTM"
  }'
```

---

## MCP Server

### Quick Start (MCP Server)

```bash
cd mcp-server

# Install dependencies
uv sync

# Run server (requires API running)
export API_BASE_URL="http://localhost:8080/api/v1"
uv run python -m mcp_golive.server

# Run tests
uv run pytest

# Run manual test (requires API running)
uv run python test_manual.py
```

### Claude Code Configuration

Add to your MCP settings (`~/.config/claude/mcp_settings.json`):

```json
{
  "mcpServers": {
    "mcp-golive": {
      "command": "uv",
      "args": [
        "--directory",
        "/absolute/path/to/mcp-go-live-service/mcp-server",
        "run",
        "python",
        "-m",
        "mcp_golive.server"
      ],
      "env": {
        "API_BASE_URL": "http://localhost:8080/api/v1"
      }
    }
  }
}
```

**Important:** Replace `/absolute/path/to/` with the actual path to your repository.

### MCP Tools

#### submit_report
Submit go-live report from Claude Code to the platform team.

**Parameters:**
- `server_name` (string, required) - Name of the MCP server
- `repository_url` (string, required) - GitHub repository URL
- `developer_email` (string, required) - Developer's email
- `report_markdown` (string, required) - Complete report in markdown format

**Returns:** Confirmation with report ID and status

**Example usage in Claude Code:**
```
Please submit my go-live report for mcp-servicenow at https://github.com/intility/mcp-servicenow
```

#### list_servers
List submitted servers and their review status.

**Parameters:**
- `status` (string, optional) - Filter by status:
  - `"pending_review"` - Awaiting review (default for platform team)
  - `"approved"` - Approved reports
  - `"rejected"` - Rejected reports
  - `"all"` - All reports

**Returns:** Markdown table with server info, status emoji, and helpful notes

**Example usage in Claude Code:**
```
Show me all pending go-live reports
```
or
```
List approved MCP servers
```

### Success Criteria

The MCP Server POC is complete when:

- ✅ Both tools (submit_report, list_servers) work
- ✅ HTTP transport support for Claude Code
- ✅ Communicates with Rust API successfully
- ✅ Unit tests pass (`uv run pytest`)
- ✅ Manual integration test works
- ✅ Clear error messages
- ✅ Documentation complete

**Current Status:** All criteria met!

---

## Common Tasks (Justfile)

All commands are available via `just`. Run `just` or `just --list` to see all available commands.

### Development Commands

```bash
# Setup & Dependencies
just setup              # Install required tools (one-time)
just install            # Install dependencies

# Database Management
just db-start           # Start PostgreSQL
just db-stop            # Stop PostgreSQL
just db-reset           # Reset database (drop + recreate + migrate)
just migrate            # Run migrations
just db-connect         # Connect with psql
just db-view            # View all reports
just db-clear           # Clear all reports

# Development
just build              # Build project
just build-release      # Build release version
just run                # Run server (auto-starts DB)
just watch              # Run with auto-reload (requires cargo-watch)

# Testing
just test               # Run unit tests
just test-verbose       # Run tests with output
just check              # Run all checks (fmt, lint, test)

# Code Quality
just lint               # Run clippy
just fmt                # Format code
just fmt-check          # Check formatting

# API Testing
just test-health        # Test /healthz
just test-submit        # Submit test report
just test-list          # List all reports
just test-list-pending  # List pending reports
just test-integration   # Full integration test

# Get/Update specific report (requires REPORT_ID env var)
REPORT_ID=<uuid> just test-get       # Get report by ID
REPORT_ID=<uuid> just test-approve   # Approve report
REPORT_ID=<uuid> just test-reject    # Reject report

# Utilities
just clean              # Clean build artifacts
just info               # Show project info
just sqlx-prepare       # Generate sqlx metadata for CI
```

### Example Workflows

**Start fresh:**
```bash
just db-reset    # Clean slate
just run         # Start server
```

**Development loop:**
```bash
just watch       # Auto-reload on changes
# Make changes to src/main.rs
# Server restarts automatically
```

**Before committing:**
```bash
just check       # Runs fmt-check, lint, and test
```

**Test full workflow:**
```bash
just test-integration   # Runs complete test suite
```

---

## Development

### Add API endpoint

1. Edit `rust-api/src/main.rs`
2. Add handler function
3. Register in `Router::new()`
4. Test with curl

### Modify database

1. Create migration: `rust-api/migrations/00X_name.sql`
2. Restart API (migrations run automatically)

### Add MCP tool

1. Edit `mcp-server/src/mcp_golive/server.py`
2. Add to `list_tools()`
3. Implement in `call_tool()`
4. Test with Claude Code

---

## Testing

```bash
# Rust tests
cd rust-api && cargo test

# Python tests
cd mcp-server && uv run pytest

# Integration
docker-compose up -d
./test-integration.sh
```

---

## Troubleshooting

### API won't start: "Failed to connect to database"

```bash
just db-start    # Ensure PostgreSQL is running
just run         # Restart API
```

### Port 5433 already in use

```bash
# Check what's using the port
lsof -i :5433

# Stop existing container
docker stop golive-postgres

# Or use different port
PORT=8081 just run
```

### Migration error or schema mismatch

```bash
just db-reset    # Clean database reset
just run         # Restart with fresh schema
```

### MCP Server: "Connection refused"

```bash
# Check API is running
just test-health

# If not running
just run
```

### Build fails with dependency errors

```bash
just clean       # Clean build artifacts
cargo update     # Update dependencies
just build       # Rebuild
```

### Tests fail

```bash
just db-reset    # Reset database
just test        # Run tests again
```

---

## POC Constraints

### Intentionally Simple
- ✅ Single file API (`main.rs`)
- ✅ No authentication
- ✅ No validation automation
- ✅ No complex workflows
- ✅ No UI (use API/curl)

### Add Post-POC
- Web UI for platform team
- OBO authentication
- Automated validation (GitHub, kubectl)
- Email notifications
- Audit logging
- OpenTelemetry

---

## Environment Variables

### Rust API
```bash
DATABASE_URL="postgres://user:pass@host/db"  # Required
PORT=8080                                     # Optional
```

### MCP Server
```bash
API_BASE_URL="http://localhost:8080/api/v1"  # Required
```

---

## Quick Reference

### Rust API (with justfile)

```bash
cd rust-api

# Start everything
just run

# Run tests
just check

# Submit test report
just test-submit

# View reports
just test-list
just db-view

# Reset everything
just db-reset
```

### Manual curl commands

```bash
# Health check
curl http://localhost:8080/healthz

# Submit report
curl -X POST http://localhost:8080/api/v1/reports \
  -H "Content-Type: application/json" \
  -d '{"server_name":"test","repository_url":"https://github.com/test","developer_email":"test@test.com","report_data":"# Test"}'

# List reports
curl http://localhost:8080/api/v1/reports | jq

# List by status
curl "http://localhost:8080/api/v1/reports?status=pending_review" | jq

# Get specific report
curl http://localhost:8080/api/v1/reports/{id} | jq

# Approve report
curl -X PATCH http://localhost:8080/api/v1/reports/{id}/status \
  -H "Content-Type: application/json" \
  -d '{"status":"approved","reviewed_by":"platform@intility.no","review_notes":"LGTM"}' | jq

# Reject report
curl -X PATCH http://localhost:8080/api/v1/reports/{id}/status \
  -H "Content-Type: application/json" \
  -d '{"status":"rejected","reviewed_by":"platform@intility.no","review_notes":"Needs work"}' | jq
```

---

## Documentation

- **PRD:** `docs/PRD.md` - Product requirements (POC scope)
- **Architecture:** `docs/ARCHITECTURE.md` - Technical details
- **MCP Protocol:** https://modelcontextprotocol.io/

---

## Contributing

**POC Guidelines:**
- Keep it simple (one file for API is fine)
- No premature optimization
- Focus on validating core concept
- Document as you go

---

## Questions?

- **Slack:** #programming or #devinfra
- **Email:** platform-team@intility.no

---

**End of CLAUDE.md**
