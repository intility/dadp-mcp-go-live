"""MCP Go-Live Server - FastMCP implementation with HTTP transport."""

from fastmcp import FastMCP

from .config import settings
from .api_client import GoLiveAPIClient


# Initialize FastMCP server
mcp = FastMCP("MCP Go-Live Server")

# Initialize API client
api_client = GoLiveAPIClient()


# ============================================================================
# MCP Tools
# ============================================================================

@mcp.tool()
async def submit_report(
    server_name: str,
    repository_url: str,
    developer_email: str,
    report_markdown: str,
) -> str:
    """Submit an MCP server go-live report to the platform team for review.

    This should be called after completing the go-live checklist with all
    security and infrastructure validation. The report will be stored and
    marked as 'pending_review' until the platform team approves or rejects it.

    Args:
        server_name: Name of the MCP server (e.g., 'mcp-servicenow')
        repository_url: Full GitHub repository URL
        developer_email: Email address of the developer
        report_markdown: Complete go-live report in markdown format

    Returns:
        Formatted success message with report details
    """
    try:
        report = await api_client.submit_report(
            server_name=server_name,
            repository_url=repository_url,
            developer_email=developer_email,
            report_data=report_markdown,
        )

        return f"""# Report Submitted Successfully! ✅

**Report ID:** {report.id}
**Server Name:** {report.server_name}
**Repository:** {report.repository_url}
**Status:** {report.status}
**Submitted:** {report.submitted_at}

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

Please check:
- API is running at {settings.api_base_url}
- Network connectivity
- Input parameters are correct
"""


@mcp.tool()
async def list_servers(status: str = "all") -> str:
    """List submitted MCP servers and their review status.

    This is primarily used by the platform team to see pending reports
    that need review, or by developers to check the status of their submissions.

    Args:
        status: Filter by status: 'pending_review', 'approved', 'rejected', or 'all'

    Returns:
        Markdown-formatted table of reports
    """
    try:
        reports = await api_client.list_reports(status=status if status != "all" else None)

        if not reports:
            return f"""# No Reports Found

No MCP servers found with status: **{status}**

Use `submit_report` to submit a go-live report.
"""

        # Format as markdown table
        result = f"# MCP Servers - Status: {status}\n\n"
        result += f"Found **{len(reports)}** report(s)\n\n"
        result += "| Server Name | Repository | Status | Submitted | Reviewed By |\n"
        result += "|-------------|------------|--------|-----------|-------------|\n"

        for report in reports:
            repo_short = (
                report.repository_url.split("github.com/")[-1]
                if "github.com" in report.repository_url
                else report.repository_url
            )
            submitted = report.submitted_at.split("T")[0]  # Just date
            reviewed_by = report.reviewed_by or "—"

            # Status emoji
            status_emoji = {
                "pending_review": "⏳",
                "approved": "✅",
                "rejected": "❌",
            }.get(report.status, "❓")

            result += (
                f"| {report.server_name} | {repo_short} | "
                f"{status_emoji} {report.status} | {submitted} | {reviewed_by} |\n"
            )

        # Add helpful notes
        if status == "pending_review":
            result += "\n## Platform Team Action Required\n\n"
            result += "These reports are awaiting review. Use the API to approve/reject:\n\n"
            result += "```bash\n"
            result += 'curl -X PATCH http://localhost:8080/api/v1/reports/{id}/status \\\n'
            result += '  -H "Content-Type: application/json" \\\n'
            result += '  -d \'{"status":"approved","reviewed_by":"platform@intility.no","review_notes":"LGTM"}\'\n'
            result += "```\n"

        return result

    except Exception as e:
        return f"""# Error Listing Reports

{type(e).__name__}: {str(e)}

Please check:
- API is running at {settings.api_base_url}
- Network connectivity
"""


# ============================================================================
# Server Entry Point
# ============================================================================

if __name__ == "__main__":
    # Run server with HTTP transport
    mcp.run(
        transport="http",
        host=settings.host,
        port=settings.port,
    )
