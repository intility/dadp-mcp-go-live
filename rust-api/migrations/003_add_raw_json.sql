-- Add raw_json column to store complete unprocessed JSON data
ALTER TABLE mcp_server_reports
ADD COLUMN raw_json JSONB;

-- Add GIN index for efficient querying
CREATE INDEX idx_reports_raw_json_gin ON mcp_server_reports USING GIN (raw_json);
