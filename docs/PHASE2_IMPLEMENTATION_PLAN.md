# Phase 2 Implementation Plan: MCP Server JSON Support

**Project:** MCP Go-Live API - MCP Server Updates
**Phase:** 2 - MCP Server JSON Integration
**Date:** 2025-10-21
**Dependencies:** Phase 1 (Structured JSON API support)

---

## Objectives

Update the Python MCP server to send structured JSON data when submitting reports.

### Primary Goals
1. Update Python models to include `report_json` field
2. Update API client to send JSON data
3. Update `submit_report` tool to accept JSON string parameter
4. Maintain backward compatibility
5. Test end-to-end workflow

---

## Success Criteria

- [x] `CreateReportRequest` model includes `report_json` field
- [x] `Report` model includes `report_json` field
- [x] API client `submit_report()` sends JSON data
- [x] MCP tool `submit_report` accepts optional `report_json` parameter
- [x] Backward compatibility: works without JSON
- [x] Integration test passes
- [x] Documentation updated

---

## Implementation Steps

### Step 1: Update Python Models

**File:** `mcp-server/src/mcp_golive/models.py`

Add `report_json` field to both models:

```python
from typing import Any

class CreateReportRequest(BaseModel):
    """Request to create a go-live report."""
    server_name: str
    repository_url: str
    developer_email: str
    report_data: str  # Markdown report
    report_json: dict[str, Any] | None = None  # NEW: Structured JSON

class Report(BaseModel):
    """Go-live report from the API."""
    id: str
    server_name: str
    repository_url: str
    developer_email: str
    report_data: str
    report_json: dict[str, Any] | None = None  # NEW: Structured data
    status: str
    submitted_at: str
    reviewed_at: str | None = None
    reviewed_by: str | None = None
    review_notes: str | None = None
```

### Step 2: Update API Client

**File:** `mcp-server/src/mcp_golive/api_client.py`

Update `submit_report()` method:

```python
async def submit_report(
    self,
    server_name: str,
    repository_url: str,
    developer_email: str,
    report_data: str,
    report_json: dict[str, Any] | None = None,  # NEW
) -> Report:
    """Submit a go-live report to the API."""
    payload = {
        "server_name": server_name,
        "repository_url": repository_url,
        "developer_email": developer_email,
        "report_data": report_data,
    }

    if report_json is not None:
        payload["report_json"] = report_json

    response = await self.client.post(
        f"{self.base_url}/reports",
        json=payload,
    )
    response.raise_for_status()
    return Report(**response.json())
```

### Step 3: Update submit_report Tool

**File:** `mcp-server/src/mcp_golive/server.py`

Update tool signature and implementation:

```python
@mcp.tool()
async def submit_report(
    server_name: str,
    repository_url: str,
    developer_email: str,
    report_markdown: str,
    report_json: str | None = None,  # NEW: Optional JSON string
) -> str:
    """Submit an MCP server go-live report.

    Args:
        server_name: Name of the MCP server
        repository_url: Full GitHub repository URL
        developer_email: Developer's email address
        report_markdown: Complete go-live report in markdown format
        report_json: Optional structured JSON data as a JSON string

    Returns:
        Formatted success message with report details
    """
    try:
        # Parse JSON if provided
        json_data = None
        if report_json:
            import json
            try:
                json_data = json.loads(report_json)
            except json.JSONDecodeError as e:
                return f"# Error: Invalid JSON\n\n{str(e)}"

        report = await api_client.submit_report(
            server_name=server_name,
            repository_url=repository_url,
            developer_email=developer_email,
            report_data=report_markdown,
            report_json=json_data,  # NEW
        )

        # Success message
        structured_note = "\n✨ **Structured data included!**" if json_data else ""

        return f"""# Report Submitted Successfully! ✅

**Report ID:** {report.id}
**Server Name:** {report.server_name}
**Repository:** {report.repository_url}
**Status:** {report.status}
**Submitted:** {report.submitted_at}{structured_note}

Your go-live report has been submitted to the platform team for review.

## Next Steps

1. The platform team will review your report
2. They will verify all security and infrastructure requirements
3. You'll receive approval or feedback via email at: {report.developer_email}

You can check the status anytime using the `list_servers` tool.
"""

    except Exception as e:
        error_msg = str(e)
        if "already exists" in error_msg.lower():
            return f"""# Error: Report Already Exists

{error_msg}

A report for this repository has already been submitted. Use `list_servers` to check its status.
"""

        return f"""# Error Submitting Report

{type(e).__name__}: {error_msg}

Please check your connection and try again.
"""
```

---

## Testing Strategy

### Unit Tests

Add tests to `mcp-server/tests/test_basic.py`:

```python
def test_create_report_request_with_json():
    """Test CreateReportRequest with JSON data."""
    req = CreateReportRequest(
        server_name="test",
        repository_url="https://github.com/test/test",
        developer_email="test@example.com",
        report_data="# Test",
        report_json={"test": "data"}
    )
    assert req.report_json == {"test": "data"}

def test_create_report_request_without_json():
    """Test CreateReportRequest without JSON (backward compat)."""
    req = CreateReportRequest(
        server_name="test",
        repository_url="https://github.com/test/test",
        developer_email="test@example.com",
        report_data="# Test"
    )
    assert req.report_json is None
```

### Integration Test

Update `mcp-server/test_manual.py`:

```python
# Test with JSON
json_data = {
    "report_version": "1.0",
    "server_info": {"server_name": "test-server"},
    "executive_summary": {"overall_status": "APPROVED"},
    "phase1_security": {"risk_level": "LOW"}
}

result = await submit_report(
    server_name="test-with-json",
    repository_url="https://github.com/test/json-test",
    developer_email="test@example.com",
    report_markdown="# Test Report",
    report_json=json.dumps(json_data)
)
```

---

## Timeline

- **Day 1:** Update models and API client
- **Day 2:** Update MCP tool, add tests
- **Day 3:** Integration testing, documentation

---

## Rollback Plan

If issues arise:
1. Revert MCP server changes (JSON is optional)
2. API continues to work (Phase 1 backward compatible)
3. No database changes needed

---

**Status:** Ready for Implementation
