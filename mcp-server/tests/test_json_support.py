"""Tests for JSON support in MCP Go-Live server."""

import pytest
from mcp_golive.models import CreateReportRequest, Report


def test_create_report_request_with_json():
    """Test CreateReportRequest with JSON data (required)."""
    req = CreateReportRequest(
        server_name="test",
        repository_url="https://github.com/test/test",
        developer_email="test@example.com",
        report_data="# Test",
        report_json={"test": "data", "nested": {"value": 123}},
    )
    assert req.report_json == {"test": "data", "nested": {"value": 123}}
    assert req.server_name == "test"
    assert req.report_json["nested"]["value"] == 123


def test_report_model_with_json():
    """Test Report model with JSON data (required)."""
    report = Report(
        id="123e4567-e89b-12d3-a456-426614174000",
        server_name="test-server",
        repository_url="https://github.com/test/test",
        developer_email="test@example.com",
        report_data="# Test Report",
        report_json={
            "report_version": "1.0",
            "server_info": {"server_name": "test-server"},
            "phase1_security": {"risk_level": "LOW"},
        },
        status="pending_review",
        submitted_at="2025-10-21T10:00:00Z",
    )
    assert report.report_json["report_version"] == "1.0"
    assert report.report_json["phase1_security"]["risk_level"] == "LOW"
    assert report.server_name == "test-server"


def test_json_serialization():
    """Test that models serialize to JSON correctly."""
    req = CreateReportRequest(
        server_name="test",
        repository_url="https://github.com/test/test",
        developer_email="test@example.com",
        report_data="# Test",
        report_json={"test_key": "test_value"},
    )

    # Pydantic v2 uses model_dump_json()
    json_str = req.model_dump_json()
    assert "test_key" in json_str
    assert "test_value" in json_str


def test_json_deserialization():
    """Test that models deserialize from JSON correctly."""
    json_data = {
        "server_name": "test",
        "repository_url": "https://github.com/test/test",
        "developer_email": "test@example.com",
        "report_data": "# Test",
        "report_json": {"key": "value"},
    }

    req = CreateReportRequest(**json_data)
    assert req.report_json == {"key": "value"}
