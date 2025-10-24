-- Remove unique constraint on repository_url to allow multiple submissions per repository
ALTER TABLE mcp_server_reports
DROP CONSTRAINT unique_repository;
