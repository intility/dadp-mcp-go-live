# MCP HTTP Server Setup Guide

## Problem Summary

You encountered this error when trying to use the `submit_report` tool:

```
Error POSTing to endpoint (HTTP 400): Bad Request: No valid session ID provided
```

## Root Cause

This MCP server uses **HTTP transport** (specifically Streamable-HTTP), which requires proper session management. The error occurred because:

1. Your `mcp_settings.json` was likely configured incorrectly for HTTP transport
2. HTTP MCP servers require the `mcp-remote` NPX package to handle session management
3. You cannot directly invoke an HTTP MCP server with `command: "python -m module"` - that's only for stdio transport

## Solution

### Step 1: Start the MCP Server

The MCP server must be running as a web service on port 5000:

```bash
cd mcp-server
export API_BASE_URL="http://localhost:8080/api/v1"
uv run python -m mcp_golive.server
```

You should see output like:
```
📦 Transport:       Streamable-HTTP
🔗 Server URL:      http://127.0.0.1:5000/mcp
```

### Step 2: Configure Claude Code with mcp-remote

Update your `~/.config/claude/mcp_settings.json`:

**CORRECT Configuration (for HTTP transport):**

```json
{
  "mcpServers": {
    "mcp-golive": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://localhost:5000/mcp"
      ]
    }
  }
}
```

**INCORRECT Configuration (this causes the session ID error):**

```json
{
  "mcpServers": {
    "mcp-golive": {
      "command": "uv",
      "args": [
        "--directory",
        "/path/to/mcp-server",
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

The incorrect configuration tries to use stdio transport, but the server is configured for HTTP transport.

### Step 3: Restart Claude Code

After updating `mcp_settings.json`, restart Claude Code for the changes to take effect.

## Why mcp-remote?

The `mcp-remote` package is a proxy that:
- Handles HTTP session initialization
- Manages session IDs automatically
- Converts between Claude Code's stdio interface and the MCP server's HTTP interface
- Handles errors and reconnection

## For Remote/Production Deployment

When deploying to a remote server (not localhost), use:

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

## Verification

After completing the setup:

1. Check that the MCP server is running:
   ```bash
   curl http://localhost:5000/mcp
   # Should return MCP server info
   ```

2. In Claude Code, try listing servers:
   ```
   Use the list_servers tool to show all pending reports
   ```

3. If it works, you should see a markdown table of reports (or "No reports found")

## Additional Resources

- See `CLAUDE.md` for full documentation
- See `mcp-server/README.md` for MCP server details
- MCP Specification: https://modelcontextprotocol.io/
- FastMCP Documentation: https://github.com/jlowin/fastmcp

## Common Issues

### "Connection refused" error
- Make sure the MCP server is running on port 5000
- Check that no firewall is blocking the connection

### "command not found: npx" error
- Install Node.js and npm: `brew install node` (macOS) or equivalent
- npx comes with npm

### "Module not found: mcp-remote" error
- The first time you use `npx mcp-remote`, it will download the package automatically
- Make sure you have internet connection

## Transport Types Comparison

| Transport | Use Case | Configuration | Session Management |
|-----------|----------|---------------|-------------------|
| **stdio** | Local, single-process | Direct command invocation | Not needed |
| **HTTP/SSE** | Remote, web service | via `mcp-remote` proxy | Required (handled by mcp-remote) |

This MCP server uses **HTTP transport** because it's designed to be deployed as a remote service for production use.
