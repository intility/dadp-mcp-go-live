"""HTTP client for communicating with the Rust API backend."""

from typing import Any

import httpx
from .config import settings
from .models import Report


class GoLiveAPIClient:
    """Client for interacting with the Go-Live Rust API."""

    def __init__(self):
        self.base_url = settings.api_base_url
        self.timeout = settings.api_timeout

    async def submit_report(
        self,
        server_name: str,
        repository_url: str,
        developer_email: str,
        report_data: str,
        report_json: dict[str, Any] | None = None,
    ) -> Report:
        """Submit a go-live report to the API.

        Args:
            server_name: Name of the MCP server
            repository_url: GitHub repository URL
            developer_email: Developer's email address
            report_data: Full markdown report
            report_json: Optional structured JSON data

        Returns:
            Report object with ID and status

        Raises:
            httpx.HTTPStatusError: If API returns error status
        """
        payload = {
            "server_name": server_name,
            "repository_url": repository_url,
            "developer_email": developer_email,
            "report_data": report_data,
        }

        if report_json is not None:
            payload["report_json"] = report_json

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/reports",
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            response.raise_for_status()
            return Report(**response.json())

    async def list_reports(self, status: str | None = None) -> list[Report]:
        """List all reports, optionally filtered by status.

        Args:
            status: Optional status filter (pending_review, approved, rejected)

        Returns:
            List of Report objects
        """
        params = {"status": status} if status and status != "all" else {}

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                f"{self.base_url}/reports",
                params=params,
                headers={"Accept": "application/json"},
            )
            response.raise_for_status()
            data = response.json()
            return [Report(**item) for item in data]
