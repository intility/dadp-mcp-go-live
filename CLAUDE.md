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
├── frontend/                # React web UI
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── routes/          # Page components
│   │   ├── components/      # Reusable components
│   │   ├── api/            # API client & React Query hooks
│   │   └── types/          # TypeScript definitions
│   └── README.md
│
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
| Frontend | React + TypeScript | 19+ |
| Build Tool | Vite | 7+ |
| Design System | Bifrost | 6.4+ |
| Data Fetching | TanStack Query | 5+ |
| API Backend | Rust + Axum | 0.8+ |
| Database | PostgreSQL | 16 |
| Database Driver | sqlx | 0.8+ |
| MCP Server | Python | 3.11+ |
| Package Manager (Python) | uv | Latest |
| Package Manager (Node) | npm | Latest |
| MCP Framework | mcp | 0.1+ |
| HTTP Client | httpx | 0.27+ |

---

## Getting Started

### Prerequisites

- Rust (via `rustup`)
- Python 3.11+
- Node.js 18+ (preferably 20+)
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

## Frontend (React Web UI)

### Quick Start (Frontend)

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (requires API running)
npm run dev
# Running on http://localhost:5173

# Run tests
npm test

# Build for production
npm run build
```

### Frontend Features

**Pages:**
- **Dashboard** (`/`) - Overview with tabbed filtering (All/Approved/Rejected)
- **Report List** (`/reports`) - Searchable list with status filtering
- **Report Detail** (`/reports/:id`) - Full report view with review actions
- **Home** (`/home`) - Setup and documentation guide
- **Profile** (`/profile`) - User authentication info

**Components:**
- `ReportCard` - Summary card for report list views
- `StatusBadge` - Visual status indicators
- `ReviewForm` - Approve/reject workflow with notes
- `PageHeader` - Responsive page headers
- `ErrorPage` - Error boundary with Sentry integration

**Features:**
- Markdown rendering for reports
- **Structured data display** - Shows risk levels, status, and critical issues from `report_json`
- Real-time data updates with TanStack Query
- Bifrost design system components
- Responsive layout
- Search and filter functionality
- MSAL authentication (configured, not enforced)

### Success Criteria

The Frontend POC is complete when:

- ✅ All routes render correctly
- ✅ Can view dashboard and filter reports
- ✅ Can view individual report details
- ✅ Can approve/reject reports with notes
- ✅ Search and filtering work
- ✅ Markdown renders properly
- ✅ Tests pass (`npm test`)
- ✅ Build succeeds (`npm run build`)
- ✅ No TypeScript errors
- ✅ Follows Bifrost design guidelines

**Current Status:** All criteria met!

### Environment Variables

```bash
# .env file in frontend/
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_ENTRA_CLIENT_ID=__ENTRA_CLIENT_ID__
VITE_ENTRA_AUTHORITY=https://login.microsoftonline.com/...
```

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
FROM mcp_server_reports;
```

---

## API Endpoints

**Base:** `http://localhost:8080/api/v1`

### POST /reports
Submit report with structured JSON data (**REQUIRED**).

**Example:**
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

**Note:** The `report_json` field is **REQUIRED** and must contain structured data conforming to the MCPGoLiveReport Pydantic model from the mcp-go-live skill.

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

### GET /reports/analytics/risk-distribution (Phase 3)
Get count of reports by risk level.

```bash
curl http://localhost:8080/api/v1/reports/analytics/risk-distribution
```

**Response:**
```json
{
  "LOW": 10,
  "MEDIUM": 3,
  "HIGH": 1,
  "CRITICAL": 0
}
```

### GET /reports/{id}/issues (Phase 3)
Extract critical issues, warnings, and recommendations from a specific report.

```bash
curl http://localhost:8080/api/v1/reports/{id}/issues
```

**Response:**
```json
{
  "report_id": "uuid",
  "server_name": "mcp-servicenow",
  "critical_issues": [
    {
      "severity": "CRITICAL",
      "description": "Issue description",
      "impact": "High",
      "recommendation": "Fix recommendation",
      "phase_id": "P1"
    }
  ],
  "warnings": [...],
  "recommendations": [...]
}
```

### GET /reports/analytics/summary (Phase 3)
Get overview statistics across all reports.

```bash
curl http://localhost:8080/api/v1/reports/analytics/summary
```

**Response:**
```json
{
  "total_reports": 15,
  "with_structured_data": 12,
  "by_status": {
    "pending_review": 5,
    "approved": 8,
    "rejected": 2
  },
  "by_risk_level": {
    "LOW": 10,
    "MEDIUM": 2
  },
  "recent_submissions_24h": 3
}
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

**IMPORTANT:** This MCP server uses **HTTP transport** (not stdio), which means it runs as a remote web service. Claude Code connects to it using the `mcp-remote` NPX package.

#### Step 1: Start the MCP Server

First, start the MCP server (it will run on port 3000 by default):

```bash
cd mcp-server
export API_BASE_URL="http://localhost:8080/api/v1"
uv run python -m mcp_golive.server
```

The server will display:
```
📦 Transport:       Streamable-HTTP
🔗 Server URL:      http://127.0.0.1:3000/mcp
```

#### Step 2: Configure Claude Code

Add to your MCP settings (`~/.config/claude/mcp_settings.json`):

```json
{
  "mcpServers": {
    "mcp-golive": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://localhost:3000/mcp"
      ]
    }
  }
}
```

**For remote deployment (e.g., production):**

```json
{
  "mcpServers": {
    "mcp-golive": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://your-domain.com/mcp",
        "--header",
        "Authorization: Bearer ${AUTH_TOKEN}"
      ],
      "env": {
        "AUTH_TOKEN": "your-auth-token-here"
      }
    }
  }
}
```

**Note:** The `mcp-remote` package handles the HTTP session management (session IDs, etc.) automatically.

### MCP Tools

#### submit_report
Submit go-live report from Claude Code to the platform team.

**Parameters:**
- `server_name` (string, required) - Name of the MCP server
- `repository_url` (string, required) - GitHub repository URL
- `developer_email` (string, required) - Developer's email
- `report_markdown` (string, required) - Complete report in markdown format
- `report_json` (string, **REQUIRED**) - Structured JSON data as a JSON string (must be valid JSON)

**Returns:** Confirmation with report ID and status

**Example usage in Claude Code:**
```
Please submit my go-live report for mcp-servicenow at https://github.com/intility/mcp-servicenow
```

**Note:** The `mcp-go-live` skill automatically generates both markdown and JSON data. The JSON parameter will be populated automatically when using the skill.

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
just setup              # Install required tools (Rust + Python + Node)
just install            # Install dependencies

# Service Management
just start-all          # Start all services (API + Frontend)
just stop-all           # Stop all services
just run-api            # Run Rust API only
just run-frontend       # Run React frontend only
just run-mcp            # Run MCP server only

# Database Management
just db-start           # Start PostgreSQL
just db-stop            # Stop PostgreSQL
just db-reset           # Reset database (drop + recreate + migrate)
just migrate            # Run migrations
just db-connect         # Connect with psql
just db-view            # View all reports
just db-clear           # Clear all reports

# Development (Rust API)
just build              # Build project
just build-release      # Build release version
just run                # Run API and MCP server
just watch              # Run with auto-reload (requires cargo-watch)

# Testing
just test               # Run all tests (Rust + Python + Frontend)
just test-api           # Test Rust API only
just test-frontend      # Test React frontend only
just test-mcp           # Test MCP server only
just test-verbose       # Run tests with output
just check              # Run all checks (fmt, lint, test)

# Code Quality
just lint               # Lint all code (Rust + TypeScript)
just fmt                # Format all code
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

**Start fresh (all services):**
```bash
just db-reset      # Clean slate
just start-all     # Start API and Frontend
# API: http://localhost:8080
# Frontend: http://localhost:5173
```

**Development loop (frontend):**
```bash
just run-frontend  # Auto-reload on file changes
# Make changes in frontend/src/
# Browser updates automatically
```

**Development loop (API):**
```bash
just watch         # Auto-reload on changes (requires cargo-watch)
# Make changes to rust-api/src/main.rs
# Server restarts automatically
```

**Before committing:**
```bash
just check         # Runs fmt-check, lint, and test for all components
```

**Test full workflow:**
```bash
just test-integration   # Runs complete test suite
# Or manually test in browser at http://localhost:5173
```

---

## Development

### Add API endpoint

1. Edit `rust-api/src/main.rs`
2. Add handler function
3. Register in `Router::new()`
4. Update frontend API client if needed (`frontend/src/api/client.ts`)
5. Add React Query hook if needed (`frontend/src/api/queries.ts`)
6. Test with curl and in UI

### Modify database

1. Create migration: `rust-api/migrations/00X_name.sql`
2. Restart API (migrations run automatically)
3. Update TypeScript types if schema changed (`frontend/src/types/api.ts`)

### Add MCP tool

1. Edit `mcp-server/src/mcp_golive/server.py`
2. Add to `list_tools()`
3. Implement in `call_tool()`
4. Test with Claude Code

### Add frontend page

1. Create route component: `frontend/src/routes/NewPage.tsx`
2. Add route to `frontend/src/router.tsx`
3. Add navigation link in `frontend/src/components/RootLayout.tsx`
4. Use Bifrost components for consistent styling

### Add frontend component

1. Create component: `frontend/src/components/NewComponent.tsx`
2. Import and use Bifrost components
3. Add TypeScript types
4. Write tests: `frontend/src/components/NewComponent.test.tsx`

---

## Testing

```bash
# Rust tests
cd rust-api && cargo test

# Python tests
cd mcp-server && uv run pytest

# Frontend tests
cd frontend && npm test

# Integration
just test-integration

# Or manually:
docker-compose up -d
# Start all services, then:
curl -X POST http://localhost:8080/api/v1/reports -H "Content-Type: application/json" -d '...'
# Open http://localhost:5173 to verify in UI
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

### MCP Server: "No valid session ID provided"

This error means Claude Code is not configured correctly for HTTP transport.

**Symptoms:**
- Error when calling `submit_report` or `list_servers` tools
- Message: "Error POSTing to endpoint (HTTP 400): Bad Request: No valid session ID provided"

**Cause:**
You're using the wrong configuration in `mcp_settings.json`. HTTP MCP servers require the `mcp-remote` package.

**Solution:**
1. Make sure the MCP server is running:
   ```bash
   cd mcp-server
   export API_BASE_URL="http://localhost:8080/api/v1"
   uv run python -m mcp_golive.server
   ```

2. Update your `~/.config/claude/mcp_settings.json` to use `mcp-remote`:
   ```json
   {
     "mcpServers": {
       "mcp-golive": {
         "command": "npx",
         "args": [
           "mcp-remote",
           "http://localhost:3000/mcp"
         ]
       }
     }
   }
   ```

3. Restart Claude Code

**Note:** Do NOT use the `uv run python -m mcp_golive.server` configuration directly in `mcp_settings.json` - that's for stdio transport only. This server uses HTTP transport.

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

### Frontend: API calls failing

```bash
# Check API is running
curl http://localhost:8080/healthz

# Check CORS is enabled (should be by default)
# Verify VITE_API_BASE_URL in frontend/.env
cat frontend/.env
```

### Frontend won't start

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### TypeScript errors

```bash
cd frontend
npm run lint        # Check for errors
npx tsc --noEmit   # Type check without building
```

---

## POC Constraints

### Intentionally Simple
- ✅ Single file API (`main.rs`)
- ✅ No authentication enforcement (MSAL configured but not required)
- ✅ No validation automation
- ✅ No complex workflows
- ✅ Basic UI (functional, not production-ready)

### Add Post-POC
- Enforce OBO authentication (already configured in frontend)
- Automated validation (GitHub API, kubectl checks)
- Email notifications
- Audit logging
- OpenTelemetry
- Production deployment setup
- Advanced error handling
- Rate limiting

---

## Environment Variables

### Rust API
```bash
DATABASE_URL="postgres://user:pass@host/db"  # Required
PORT=8080                                     # Optional
```

### Frontend
```bash
VITE_API_BASE_URL=http://localhost:8080/api/v1           # Required
VITE_ENTRA_CLIENT_ID=__ENTRA_CLIENT_ID__                 # Optional (for auth)
VITE_ENTRA_AUTHORITY=https://login.microsoftonline.com/...  # Optional (for auth)
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

### Frontend (with npm)

```bash
cd frontend

# Start dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Lint code
npm run lint

# Type check
npx tsc --noEmit
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
- **Frontend README:** `frontend/README.md` - Frontend-specific documentation
- **Bifrost Docs:** https://bifrost.intility.com - Design system documentation
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
