# Go-Live API (Rust)

HTTP API for managing MCP server go-live reports.

## Quick Start

```bash
# Setup (one-time)
just setup

# Start database & run server
just run

# In another terminal, test the API
just test-health
just test-submit
just test-list
```

## Available Commands

Run `just` or `just --list` to see all commands:

```bash
# Setup & Dependencies
just setup              # Install tools
just install            # Install dependencies

# Database
just db-start           # Start PostgreSQL
just db-stop            # Stop PostgreSQL
just db-reset           # Reset database
just migrate            # Run migrations
just db-connect         # Connect with psql
just db-view            # View all reports
just db-clear           # Clear all reports

# Development
just build              # Build project
just run                # Run server
just watch              # Run with auto-reload

# Testing
just test               # Run unit tests
just test-verbose       # Run tests with output
just check              # Run all checks (fmt, lint, test)

# API Testing
just test-health        # Test /healthz
just test-submit        # Submit test report
just test-list          # List all reports
just test-list-pending  # List pending reports
just test-integration   # Full integration test

# Code Quality
just lint               # Run clippy
just fmt                # Format code
just fmt-check          # Check formatting
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/healthz` | Health check |
| POST | `/api/v1/reports` | Create report |
| GET | `/api/v1/reports` | List reports |
| GET | `/api/v1/reports/:id` | Get report |
| PATCH | `/api/v1/reports/:id/status` | Update status |

## Environment Variables

```bash
DATABASE_URL="postgres://postgres:password@localhost/golive"  # Required
PORT="8080"                                                    # Optional
RUST_LOG="golive_api=debug"                                   # Optional
```

## Success Criteria

- ✅ All endpoints respond correctly
- ✅ Database migrations run successfully
- ✅ Unit tests pass
- ✅ Integration test completes
- ✅ No clippy warnings
- ✅ Code is formatted

## Testing

```bash
# Unit tests
just test

# Integration test (full workflow)
just test-integration

# Manual testing
just run                # Start server
just test-submit        # Submit report
just test-list-pending  # View pending
REPORT_ID=<id> just test-approve  # Approve
```

## Development

```bash
# Watch mode (auto-reload on changes)
just watch

# Run all quality checks
just check

# View database
just db-view
just db-connect
```

## Troubleshooting

### Database connection fails

```bash
just db-reset  # Reset database
```

### Port already in use

```bash
PORT=8081 just run
```

### Migrations fail

```bash
just db-reset  # Fresh start
```

## Project Structure

```
rust-api/
├── src/
│   └── main.rs         # All code (POC - single file)
├── migrations/
│   └── 001_create_reports.sql
├── justfile            # Task automation
├── Cargo.toml          # Dependencies
└── README.md           # This file
```
1