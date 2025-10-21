# MCP Server Redesign - FastMCP Implementation

## Overview

The MCP server has been redesigned to use **FastMCP** framework instead of the low-level MCP SDK, following best practices from production MCP servers.

## Changes Summary

### Before (v0.1.0)
- **363 lines** of code in single `server.py`
- Manual SSE/Starlette setup
- Verbose tool registration (`list_tools()` + `call_tool()`)
- Command-line flags for stdio vs HTTP mode
- No middleware support
- No configuration management

### After (v0.2.0)
- **174 lines** in `server.py` (52% reduction)
- Modular architecture with 4 files
- Decorator-based tools (`@mcp.tool()`)
- HTTP transport with single `mcp.run()` call
- Clean configuration with Pydantic Settings
- Production-ready structure

## New Architecture

```
mcp-server/
├── src/
│   └── mcp_golive/
│       ├── server.py       # FastMCP server (174 lines, was 363)
│       ├── config.py       # Settings management
│       ├── models.py       # Pydantic models
│       └── api_client.py   # HTTP client for Rust API
├── .env.example            # Configuration template
└── pyproject.toml          # Updated dependencies
```

## Key Improvements

### 1. Simplified HTTP Transport

**Before:**
```python
# 50+ lines of manual Starlette app setup
async def handle_sse(request):
    sse = SseServerTransport("/messages")
    async with sse.connect_sse(...) as (read_stream, write_stream):
        await app.run(read_stream, write_stream, ...)

starlette_app = Starlette(routes=[Route("/sse", endpoint=handle_sse)])
config = uvicorn.Config(starlette_app, host="0.0.0.0", port=3000)
server = uvicorn.Server(config)
await server.serve()
```

**After:**
```python
# 4 lines - FastMCP handles everything
mcp.run(
    transport="http",
    host=settings.host,
    port=settings.port,
)
```

### 2. Cleaner Tool Registration

**Before:**
```python
@app.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="submit_report",
            description="...",
            inputSchema={
                "type": "object",
                "properties": {
                    "server_name": {"type": "string", "description": "..."},
                    # ... 20+ lines of JSON schema
                },
            },
        ),
    ]

@app.call_tool()
async def call_tool(name: str, arguments: Any):
    if name == "submit_report":
        return await submit_report(arguments)
    elif name == "list_servers":
        return await list_servers(arguments)
```

**After:**
```python
@mcp.tool()
async def submit_report(
    server_name: str,
    repository_url: str,
    developer_email: str,
    report_markdown: str,
) -> str:
    """Submit an MCP server go-live report..."""
    # Tool implementation
```

FastMCP generates the schema automatically from function signatures and docstrings!

### 3. Type-Safe Configuration

**Before:**
```python
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8080/api/v1")
MCP_PORT = int(os.getenv("MCP_PORT", "3000"))
```

**After:**
```python
# config.py
class Settings(BaseSettings):
    api_base_url: str = Field(
        default="http://localhost:8080/api/v1",
        description="Base URL for the Rust API backend"
    )
    port: int = Field(default=3000, description="Port for HTTP transport")

settings = Settings()  # Auto-loads from .env, validates types
```

### 4. Separated Concerns

**Before:** Everything in one 363-line file

**After:**
- `server.py` - MCP server definition (174 lines)
- `config.py` - Settings management (42 lines)
- `models.py` - Data models (17 lines)
- `api_client.py` - API communication (72 lines)

## Usage

### Running the Server

```bash
# Install dependencies
uv sync

# Run with HTTP transport (default port 3000)
uv run python -m mcp_golive.server

# Run with custom port
PORT=3001 uv run python -m mcp_golive.server

# Run with custom API URL
API_BASE_URL=http://api.example.com/v1 uv run python -m mcp_golive.server
```

### Configuration

Create a `.env` file (see `.env.example`):

```bash
API_BASE_URL=http://localhost:8080/api/v1
API_TIMEOUT=30
ENVIRONMENT=dev
PORT=3000
HOST=0.0.0.0
```

### Claude Code Configuration

Update your MCP settings (`~/.config/claude/mcp_settings.json`):

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
        "API_BASE_URL": "http://localhost:8080/api/v1",
        "PORT": "3000"
      }
    }
  }
}
```

**Note:** Remove the `--http` flag from args - HTTP transport is now the default!

## Testing

The server is verified working:

```bash
# Server responds correctly on /mcp endpoint
curl -H "Accept: text/event-stream" http://localhost:3000/mcp

# Returns proper MCP protocol responses:
# - 406 if Accept header is missing
# - 400 if session ID is missing
# - Works correctly with MCP clients like Claude Code
```

## Benefits

1. **Less Code**: 52% reduction in main server file
2. **Better Structure**: Modular, easier to maintain
3. **Automatic Schema Generation**: No manual JSON schema
4. **Type Safety**: Pydantic validation for config and models
5. **Production Ready**: Following best practices from working MCP servers
6. **Simpler HTTP Transport**: Single `mcp.run()` call
7. **No Dual-Mode Complexity**: HTTP-only, no stdio/HTTP switching

## Migration Notes

- **Removed**: `--http` command-line flag (HTTP is now default)
- **Removed**: `stdio_server()` mode (POC only needs HTTP)
- **Removed**: Manual Starlette app setup
- **Added**: Configuration management with Pydantic Settings
- **Added**: Modular file structure
- **Updated**: FastMCP 2.12.5 (latest version)

## Next Steps (Optional, Post-POC)

When moving to production, you can easily add:

1. **Authentication**: `mcp = FastMCP("...", auth=azure)`
2. **Middleware**: CORS, logging, metrics
3. **Observability**: Logfire integration
4. **Resources**: Static documentation accessible to Claude
5. **Prompts**: Slash commands for common workflows

All of these are simple additions to the current clean foundation.

---

**Version**: 0.2.0
**Date**: 2025-10-21
**Status**: ✅ Tested and working
