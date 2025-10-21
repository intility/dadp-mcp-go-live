"""Pydantic models for MCP Go-Live server."""

from typing import Any

from pydantic import BaseModel, Field


class CreateReportRequest(BaseModel):
    """Request to create a go-live report."""

    server_name: str
    repository_url: str
    developer_email: str
    report_data: str
    report_json: dict[str, Any] | None = None


class Report(BaseModel):
    """Go-live report from the API."""

    id: str
    server_name: str
    repository_url: str
    developer_email: str
    report_data: str
    report_json: dict[str, Any] | None = None
    status: str
    submitted_at: str
    reviewed_at: str | None = None
    reviewed_by: str | None = None
    review_notes: str | None = None
