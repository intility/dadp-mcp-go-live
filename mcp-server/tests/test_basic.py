"""Basic tests for MCP Go-Live server."""

import pytest
from mcp_golive.server import app


def test_app_name():
    """Test that the MCP app is initialized with the correct name."""
    assert app.name == "mcp-golive"


def test_report_model():
    """Test that the Report model validates correctly."""
    from mcp_golive.server import Report

    # Valid report
    report_data = {
        "id": "123",
        "server_name": "test",
        "repository_url": "https://github.com/test/test",
        "developer_email": "test@test.com",
        "report_data": "# Test",
        "status": "pending_review",
        "submitted_at": "2025-10-20T10:00:00Z",
        "reviewed_at": None,
        "reviewed_by": None,
        "review_notes": None,
    }

    report = Report(**report_data)
    assert report.id == "123"
    assert report.server_name == "test"
    assert report.status == "pending_review"


def test_submit_report_request_model():
    """Test that the SubmitReportRequest model validates correctly."""
    from mcp_golive.server import SubmitReportRequest

    # Valid request
    request_data = {
        "server_name": "test-server",
        "repository_url": "https://github.com/test/test",
        "developer_email": "test@test.com",
        "report_markdown": "# Test Report",
    }

    request = SubmitReportRequest(**request_data)
    assert request.server_name == "test-server"
    assert request.repository_url == "https://github.com/test/test"
    assert request.developer_email == "test@test.com"
    assert request.report_markdown == "# Test Report"


def test_api_base_url_from_env():
    """Test that API_BASE_URL can be read from environment."""
    from mcp_golive.server import API_BASE_URL

    # Default value (from module load time)
    assert "http" in API_BASE_URL
    assert "api/v1" in API_BASE_URL
