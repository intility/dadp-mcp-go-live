# MCP Go-Live Server

Python MCP server for submitting and reviewing MCP server go-live reports.

## Features

- **2 MCP Tools:**
  - `submit_report` - Submit go-live reports to the API
  - `list_servers` - List servers and their review status

- **HTTP Transport Support** - Works with Claude Code using `--transport http`
- **Fast & Simple** - Built with FastMCP for optimal performance
- **Error Handling** - Comprehensive error messages and validation

## Quick Start

### Stdio Mode (Default - for Claude Code stdio)

```bash
# Install dependencies
uv sync

# Run server in stdio mode
just run
```

### HTTP Mode (for Claude Code --transport http)

```bash
# Install dependencies
uv sync

# Run server in HTTP mode on port 3000
just run-http

# Or with custom port
MCP_PORT=3001 just run-http
```

## Configuration for Claude Code

### Stdio Mode (Default)

Add to your Claude Code MCP settings:

```json
{
  "mcpServers": {
    "mcp-golive": {
      "command": "uv",
      "args": [
        "--directory",
        "/path/to/mcp-go-live-service/mcp-server",
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

### HTTP Mode (--transport http)

Add to your Claude Code MCP settings:

```json
{
  "mcpServers": {
    "mcp-golive": {
      "command": "uv",
      "args": [
        "--directory",
        "/path/to/mcp-go-live-service/mcp-server",
        "run",
        "python",
        "-m",
        "mcp_golive.server",
        "--http"
      ],
      "env": {
        "API_BASE_URL": "http://localhost:8080/api/v1",
        "MCP_PORT": "3000"
      },
      "transport": "http",
      "url": "http://localhost:3000/sse"
    }
  }
}
```

**Ports:**
- **MCP Server HTTP**: Port 3000 (default, configurable via `MCP_PORT`)
- **Rust API**: Port 8080
- **PostgreSQL**: Port 5433

## Tools

### submit_report

Submit an MCP server go-live report for platform team review.

**Parameters:**
- `server_name` (string, required) - Name of the MCP server
- `repository_url` (string, required) - GitHub repository URL
- `developer_email` (string, required) - Developer's email
- `report_markdown` (string, required) - Complete report in markdown

**Example:**
```python
{
    "server_name": "mcp-servicenow",
    "repository_url": "https://github.com/intility/mcp-servicenow",
    "developer_email": "dev@intility.no",
    "report_markdown": "# Go-Live Report\\n\\n..."
}
```

**Response:**
- Success: Report ID and confirmation
- Error: Detailed error message (duplicate, network, etc.)

### list_servers

List submitted servers and their review status.

**Parameters:**
- `status` (string, optional) - Filter by status:
  - `"all"` (default) - All reports
  - `"pending_review"` - Awaiting review
  - `"approved"` - Approved reports
  - `"rejected"` - Rejected reports

**Example:**
```python
{
    "status": "pending_review"
}
```

**Response:**
- Markdown table with server info
- Status emoji (⏳ pending, ✅ approved, ❌ rejected)
- Helpful notes for platform team actions

## Development

```bash
# Install dev dependencies
uv sync

# Run tests
uv run pytest

# Run tests with coverage
uv run pytest --cov=mcp_golive --cov-report=html

# Run tests verbosely
uv run pytest -v
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_BASE_URL` | Base URL for the Go-Live API | `http://localhost:8080/api/v1` |

## Testing with curl

You can test the API directly (bypass MCP):

```bash
# Make sure the Rust API is running
cd ../rust-api && just run

# In another terminal, test the MCP server
cd mcp-server

# Test submit (using httpx directly)
python -c "
import asyncio
import httpx

async def test():
    async with httpx.AsyncClient() as client:
        r = await client.post('http://localhost:8080/api/v1/reports', json={
            'server_name': 'test-mcp',
            'repository_url': 'https://github.com/test/test',
            'developer_email': 'test@test.com',
            'report_data': '# Test'
        })
        print(r.json())

asyncio.run(test())
"

# Test list
python -c "
import asyncio
import httpx

async def test():
    async with httpx.AsyncClient() as client:
        r = await client.get('http://localhost:8080/api/v1/reports')
        print(r.json())

asyncio.run(test())
"
```

## Project Structure

```
mcp-server/
├── src/
│   └── mcp_golive/
│       ├── __init__.py
│       └── server.py       # MCP server implementation
├── tests/
│   └── test_server.py      # Unit tests
├── pyproject.toml          # Dependencies
└── README.md               # This file
```

## Success Criteria

- ✅ Both tools (submit_report, list_servers) implemented
- ✅ HTTP transport support for Claude Code
- ✅ Comprehensive error handling
- ✅ Unit tests with good coverage
- ✅ Clear documentation
- ✅ Works with the Rust API

## Troubleshooting

### MCP server won't start

```bash
# Check uv is installed
uv --version

# Reinstall dependencies
uv sync
```

### Connection refused errors

```bash
# Make sure the API is running
cd ../rust-api && just test-health

# Check API_BASE_URL
echo $API_BASE_URL
```

### Tests fail

```bash
# Install test dependencies
uv sync

# Run with verbose output
uv run pytest -v -s
```

## Next Steps

1. Start the Rust API: `cd ../rust-api && just run`
2. Configure Claude Code with the MCP server settings above
3. Use the tools in Claude Code to submit and review reports
4. Platform team uses API or `list_servers` to review submissions
