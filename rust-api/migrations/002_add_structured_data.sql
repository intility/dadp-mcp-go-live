-- Migration: Add structured JSON data support
-- Date: 2025-10-21
-- Purpose: Store structured Pydantic model data alongside markdown reports

-- Add JSONB column for structured data
ALTER TABLE mcp_server_reports
ADD COLUMN report_json JSONB;

-- Create index for risk level queries (common filter)
CREATE INDEX idx_reports_json_risk_level
ON mcp_server_reports ((report_json->'phase1_security'->>'risk_level'))
WHERE report_json IS NOT NULL;

-- Create index for approval status queries (common filter)
CREATE INDEX idx_reports_json_approval_status
ON mcp_server_reports ((report_json->'executive_summary'->>'overall_status'))
WHERE report_json IS NOT NULL;

-- Create index for server name in JSON (for consistency checks)
CREATE INDEX idx_reports_json_server_name
ON mcp_server_reports ((report_json->'server_info'->>'server_name'))
WHERE report_json IS NOT NULL;

-- Create GIN index for full-text search and containment queries
-- This enables flexible queries like: WHERE report_json @> '{"phase1_security": {"risk_level": "HIGH"}}'
CREATE INDEX idx_reports_json_gin
ON mcp_server_reports USING GIN (report_json)
WHERE report_json IS NOT NULL;

-- Add helpful column comments
COMMENT ON COLUMN mcp_server_reports.report_json IS
'Structured JSON data conforming to MCPGoLiveReport Pydantic model schema. Contains detailed phase results, validation answers, and production readiness assessment.';

COMMENT ON COLUMN mcp_server_reports.report_data IS
'Human-readable markdown report for manual review and approval workflows.';
