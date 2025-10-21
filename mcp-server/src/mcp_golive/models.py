"""Pydantic models for MCP Go-Live server."""

from pydantic import BaseModel, Field


class Report(BaseModel):
    """Go-live report from the API."""

    id: str
    server_name: str
    repository_url: str
    developer_email: str
    report_data: str
    status: str
    submitted_at: str
    reviewed_at: str | None = None
    reviewed_by: str | None = None
    review_notes: str | None = None
