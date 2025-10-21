# Architecture: MCP Go-Live Service (POC)

**Version:** 1.0 (POC)
**Last Updated:** 2025-10-20
**Status:** Draft

---

## POC Goals

This is a proof of concept to validate:
1. Can the MCP go-live skill effectively guide developers through security checks?
2. Can we capture and store go-live reports from MCP servers?
3. Can platform team review and approve submissions efficiently?

**Out of Scope for POC:**
- Automated validations (GitHub API, kubectl, etc.)
- Code analysis tools
- Complex workflows and state machines
- Advanced authentication (start with basic/no auth)
- Auto-generated reports (skill creates the report)

---

## System Overview

### Simple Flow

```
Developer → Claude Code → MCP Go-Live Skill → Creates Report
                                                     ↓
                                              Report (Markdown)
                                                     ↓
                                              MCP Server → submit_report()
                                                     ↓
                                              Rust API → PostgreSQL
                                                     ↓
Platform Team → API/curl → list_servers() → Review → Approve/Reject
```

### Components (3 only)

1. **MCP Server (Python)** - 2 tools only
   - `submit_report(report_data)` - Submit completed go-live report
   - `list_servers(status_filter)` - List submitted servers (for platform team)

2. **Rust API (Axum)** - Simple CRUD
   - Store reports
   - Update approval status
   - List reports by status

3. **PostgreSQL** - 1 table
   - Store reports with approval status

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Developer Workflow                        │
│                                                              │
│  Claude Code + MCP Go-Live Skill                            │
│  ↓                                                           │
│  [Guide through 6 phases]                                   │
│  ↓                                                           │
│  [Generate go-live-report.md]                               │
│  ↓                                                           │
│  Developer calls: submit_report(report_markdown)            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│              MCP Server (Python + uv)                        │
│                                                              │
│  Tool: submit_report(report_data: str) -> dict              │
│    → POST /api/v1/reports                                   │
│    → Returns: {id, status: "pending_review"}                │
│                                                              │
│  Tool: list_servers(status: str) -> list                    │
│    → GET /api/v1/reports?status={status}                    │
│    → Returns: [{id, server_name, status, submitted_at}]     │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/JSON
                           ▼
┌──────────────────────────────────────────────────────────────┐
│              Rust API Backend (Axum)                         │
│                                                              │
│  POST   /api/v1/reports              Create report          │
│  GET    /api/v1/reports              List all reports       │
│  GET    /api/v1/reports/{id}         Get report details     │
│  PATCH  /api/v1/reports/{id}/status  Approve/reject         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                    PostgreSQL                                │
│                                                              │
│  Table: mcp_server_reports                                   │
│    - id                                                      │
│    - server_name                                             │
│    - repository_url                                          │
│    - developer_email                                         │
│    - report_data (TEXT - full markdown)                      │
│    - status (pending_review/approved/rejected)               │
│    - submitted_at                                            │
│    - reviewed_at                                             │
│    - reviewed_by                                             │
│    - review_notes                                            │
└──────────────────────────────────────────────────────────────┘
```

---

## Database Schema (Simple!)

```sql
-- Single table for POC
CREATE TABLE mcp_server_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_name VARCHAR(255) NOT NULL,
    repository_url VARCHAR(500) NOT NULL,
    developer_email VARCHAR(255) NOT NULL,
    report_data TEXT NOT NULL, -- Full markdown report
    status VARCHAR(50) NOT NULL DEFAULT 'pending_review'
        CHECK (status IN ('pending_review', 'approved', 'rejected')),
    submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMP,
    reviewed_by VARCHAR(255),
    review_notes TEXT,

    UNIQUE(repository_url) -- One submission per repo
);

CREATE INDEX idx_reports_status ON mcp_server_reports(status);
CREATE INDEX idx_reports_submitted_at ON mcp_server_reports(submitted_at DESC);
```

That's it! No complex workflow tables, no checklist items, no audit logs for POC.

---

## MCP Server (Python + uv)

### Tools Implementation

```python
# src/mcp_golive/server.py
import httpx
from mcp.server import Server
from mcp.types import Tool, TextContent

# Configuration
API_BASE_URL = "http://localhost:8080/api/v1"

mcp = Server("mcp-golive-server")

@mcp.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="submit_report",
            description="Submit a completed MCP go-live report for platform team review",
            inputSchema={
                "type": "object",
                "properties": {
                    "server_name": {
                        "type": "string",
                        "description": "Name of the MCP server"
                    },
                    "repository_url": {
                        "type": "string",
                        "description": "GitHub/GitLab repository URL"
                    },
                    "developer_email": {
                        "type": "string",
                        "description": "Developer's email"
                    },
                    "report_markdown": {
                        "type": "string",
                        "description": "Complete go-live report in markdown format"
                    }
                },
                "required": ["server_name", "repository_url", "developer_email", "report_markdown"]
            }
        ),
        Tool(
            name="list_servers",
            description="List submitted MCP servers (for platform team to review)",
            inputSchema={
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["pending_review", "approved", "rejected", "all"],
                        "description": "Filter by status"
                    }
                }
            }
        )
    ]

@mcp.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    if name == "submit_report":
        return await submit_report(
            arguments["server_name"],
            arguments["repository_url"],
            arguments["developer_email"],
            arguments["report_markdown"]
        )
    elif name == "list_servers":
        return await list_servers(arguments.get("status", "all"))
    else:
        raise ValueError(f"Unknown tool: {name}")

async def submit_report(
    server_name: str,
    repository_url: str,
    developer_email: str,
    report_markdown: str
) -> list[TextContent]:
    """Submit report to Rust API"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{API_BASE_URL}/reports",
            json={
                "server_name": server_name,
                "repository_url": repository_url,
                "developer_email": developer_email,
                "report_data": report_markdown
            },
            timeout=10.0
        )
        response.raise_for_status()
        result = response.json()

    return [TextContent(
        type="text",
        text=f"""✅ Report submitted successfully!

**Report ID:** {result['id']}
**Status:** {result['status']}
**Submitted at:** {result['submitted_at']}

Your go-live report is now pending platform team review. You will be notified once it's been reviewed.
"""
    )]

async def list_servers(status: str) -> list[TextContent]:
    """List servers by status"""
    async with httpx.AsyncClient() as client:
        params = {} if status == "all" else {"status": status}
        response = await client.get(
            f"{API_BASE_URL}/reports",
            params=params,
            timeout=10.0
        )
        response.raise_for_status()
        servers = response.json()

    if not servers:
        return [TextContent(
            type="text",
            text=f"No servers found with status: {status}"
        )]

    # Format as markdown table
    table = "| Server Name | Repository | Status | Submitted |\n"
    table += "|-------------|------------|--------|----------|\n"
    for s in servers:
        table += f"| {s['server_name']} | {s['repository_url']} | {s['status']} | {s['submitted_at']} |\n"

    return [TextContent(
        type="text",
        text=f"## MCP Servers ({status})\n\n{table}"
    )]
```

### Directory Structure

```
mcp-server/
├── pyproject.toml
├── uv.lock
├── src/
│   └── mcp_golive/
│       ├── __init__.py
│       └── server.py          # MCP tools (above)
├── tests/
│   └── test_server.py
└── README.md
```

### pyproject.toml

```toml
[project]
name = "mcp-golive-server"
version = "0.1.0"
description = "MCP server for submitting go-live reports"
requires-python = ">=3.11"
dependencies = [
    "mcp>=0.1.0",
    "httpx>=0.27.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.23.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

---

## Rust API (Axum)

### Minimal Implementation

```rust
// src/main.rs
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, patch, post},
    Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, postgres::PgPoolOptions};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[tokio::main]
async fn main() {
    // Connect to database
    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to connect to database");

    // Run migrations
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    // Build routes
    let app = Router::new()
        .route("/api/v1/reports", post(create_report))
        .route("/api/v1/reports", get(list_reports))
        .route("/api/v1/reports/:id", get(get_report))
        .route("/api/v1/reports/:id/status", patch(update_status))
        .route("/healthz", get(health_check))
        .with_state(pool);

    // Start server
    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080")
        .await
        .expect("Failed to bind");

    println!("Server running on http://0.0.0.0:8080");

    axum::serve(listener, app)
        .await
        .expect("Server failed");
}

// Models
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
struct Report {
    id: Uuid,
    server_name: String,
    repository_url: String,
    developer_email: String,
    report_data: String,
    status: String,
    submitted_at: DateTime<Utc>,
    reviewed_at: Option<DateTime<Utc>>,
    reviewed_by: Option<String>,
    review_notes: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CreateReportRequest {
    server_name: String,
    repository_url: String,
    developer_email: String,
    report_data: String,
}

#[derive(Debug, Deserialize)]
struct UpdateStatusRequest {
    status: String, // "approved" or "rejected"
    reviewed_by: String,
    review_notes: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ListQuery {
    status: Option<String>,
}

// Handlers
async fn create_report(
    State(pool): State<PgPool>,
    Json(req): Json<CreateReportRequest>,
) -> Result<Json<Report>, StatusCode> {
    let report = sqlx::query_as::<_, Report>(
        r#"
        INSERT INTO mcp_server_reports (server_name, repository_url, developer_email, report_data)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        "#
    )
    .bind(&req.server_name)
    .bind(&req.repository_url)
    .bind(&req.developer_email)
    .bind(&req.report_data)
    .fetch_one(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(report))
}

async fn list_reports(
    State(pool): State<PgPool>,
    Query(query): Query<ListQuery>,
) -> Result<Json<Vec<Report>>, StatusCode> {
    let reports = if let Some(status) = query.status {
        sqlx::query_as::<_, Report>(
            "SELECT * FROM mcp_server_reports WHERE status = $1 ORDER BY submitted_at DESC"
        )
        .bind(status)
        .fetch_all(&pool)
        .await
    } else {
        sqlx::query_as::<_, Report>(
            "SELECT * FROM mcp_server_reports ORDER BY submitted_at DESC"
        )
        .fetch_all(&pool)
        .await
    }
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(reports))
}

async fn get_report(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<Report>, StatusCode> {
    let report = sqlx::query_as::<_, Report>(
        "SELECT * FROM mcp_server_reports WHERE id = $1"
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(Json(report))
}

async fn update_status(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateStatusRequest>,
) -> Result<Json<Report>, StatusCode> {
    let report = sqlx::query_as::<_, Report>(
        r#"
        UPDATE mcp_server_reports
        SET status = $1, reviewed_by = $2, review_notes = $3, reviewed_at = NOW()
        WHERE id = $4
        RETURNING *
        "#
    )
    .bind(&req.status)
    .bind(&req.reviewed_by)
    .bind(&req.review_notes)
    .bind(id)
    .fetch_one(&pool)
    .await
    .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(Json(report))
}

async fn health_check() -> &'static str {
    "OK"
}
```

### Cargo.toml

```toml
[package]
name = "golive-api"
version = "0.1.0"
edition = "2021"

[dependencies]
axum = "0.8"
tokio = { version = "1", features = ["full"] }
sqlx = { version = "0.8", features = ["runtime-tokio-rustls", "postgres", "uuid", "chrono", "migrate"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
uuid = { version = "1", features = ["serde", "v4"] }
chrono = { version = "0.4", features = ["serde"] }
```

### Directory Structure

```
rust-api/
├── Cargo.toml
├── src/
│   └── main.rs         # All code in one file for POC!
├── migrations/
│   └── 001_create_reports.sql
└── README.md
```

---

## Developer Workflow (POC)

### Step 1: Developer uses MCP Go-Live Skill

```
Developer: "I need to deploy my MCP server to production"

Claude Code (with mcp-go-live skill):
→ Guides through 6 phases
→ At end of Phase 6, generates report markdown

Developer: "Submit this report"

Claude Code:
→ Calls: submit_report(
    server_name="mcp-servicenow",
    repository_url="https://github.com/intility/mcp-servicenow",
    developer_email="alex@intility.no",
    report_markdown="[full markdown from go-live-report.md template]"
  )

→ Returns: "✅ Report submitted! Status: pending_review"
```

### Step 2: Platform Team Reviews

```
Platform Team Member: "Show me pending reviews"

Claude Code:
→ Calls: list_servers(status="pending_review")

→ Returns:
| Server Name     | Repository                          | Status         | Submitted  |
|----------------|-------------------------------------|----------------|------------|
| mcp-servicenow | github.com/intility/mcp-servicenow | pending_review | 2025-10-20 |

Platform Team Member reviews report (from API or direct DB query):
→ curl http://localhost:8080/api/v1/reports/{id}
→ Reads full markdown report

Platform Team Member approves:
→ curl -X PATCH http://localhost:8080/api/v1/reports/{id}/status \
    -d '{"status": "approved", "reviewed_by": "platform-team@intility.no"}'
```

---

## Deployment (POC - Keep it Simple!)

### Local Development

```bash
# Terminal 1: Start PostgreSQL
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=golive \
  -p 5432:5432 \
  postgres:16-alpine

# Terminal 2: Start Rust API
cd rust-api
export DATABASE_URL="postgres://postgres:password@localhost/golive"
cargo run

# Terminal 3: Start MCP Server
cd mcp-server
export API_BASE_URL="http://localhost:8080/api/v1"
uv run python -m mcp_golive.server

# Terminal 4: Test
curl http://localhost:8080/healthz
```

### Docker Compose (For POC Testing)

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: password
      POSTGRES_DB: golive
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  api:
    build: ./rust-api
    environment:
      DATABASE_URL: "postgres://postgres:password@postgres/golive"
    ports:
      - "8080:8080"
    depends_on:
      - postgres

  mcp-server:
    build: ./mcp-server
    environment:
      API_BASE_URL: "http://api:8080/api/v1"
    ports:
      - "3000:3000"
    depends_on:
      - api

volumes:
  postgres_data:
```

---

## Testing the POC

### Manual Test Flow

1. **Start services**
```bash
docker-compose up
```

2. **Submit a report via MCP server**
```bash
# Using the MCP tool through Claude Code, or directly:
curl -X POST http://localhost:8080/api/v1/reports \
  -H "Content-Type: application/json" \
  -d '{
    "server_name": "test-mcp-server",
    "repository_url": "https://github.com/test/test-mcp",
    "developer_email": "test@intility.no",
    "report_data": "# Test Report\n\nThis is a test."
  }'
```

3. **List pending reports**
```bash
curl http://localhost:8080/api/v1/reports?status=pending_review
```

4. **Approve a report**
```bash
curl -X PATCH http://localhost:8080/api/v1/reports/{id}/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "reviewed_by": "platform@intility.no",
    "review_notes": "Looks good!"
  }'
```

---

## What This POC Validates

✅ **Validates:**
1. MCP skill can guide developer through checklist
2. Report can be submitted from MCP server to API
3. Platform team can review and approve via API
4. Basic data persistence works
5. Simple workflow is intuitive

❌ **Does NOT Validate (Future Work):**
- Automated validation (GitHub API, kubectl checks)
- Code analysis tools
- Complex authentication (OBO)
- Advanced UI for platform team
- Workflow state management
- Audit logging

---

## Future Enhancements (Post-POC)

If POC is successful, consider:
1. Web UI for platform team (instead of API calls)
2. Email notifications when status changes
3. Automated validation integrations
4. OBO authentication
5. Workflow state management (track phases in DB)
6. Code analysis tools in MCP server
7. Advanced reporting (PDF generation)

---

## Technology Stack (Minimal)

| Component | Technology | Why |
|-----------|-----------|-----|
| API | Rust + Axum | Fast, type-safe, async |
| Database | PostgreSQL | Reliable, standard |
| MCP Server | Python + uv | Fast setup, MCP SDK support |
| Deployment | Docker Compose | Simple for POC |

---

## Summary

This POC architecture is intentionally simple:
- **1 table** (not 5)
- **2 MCP tools** (not 10)
- **4 API endpoints** (not 20)
- **No complex workflows** (just submit → review → approve)
- **No automation** (skill does guidance, manual submission)

Focus: Validate the core idea works before adding complexity.

---

**End of Architecture Document (POC)**
