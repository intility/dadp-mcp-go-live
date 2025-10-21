-- Create mcp_server_reports table
CREATE TABLE IF NOT EXISTS mcp_server_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_name VARCHAR(255) NOT NULL,
    repository_url VARCHAR(500) NOT NULL,
    developer_email VARCHAR(255) NOT NULL,
    report_data TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_review'
        CHECK (status IN ('pending_review', 'approved', 'rejected')),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by VARCHAR(255),
    review_notes TEXT,
    CONSTRAINT unique_repository UNIQUE (repository_url)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_reports_status ON mcp_server_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_submitted_at ON mcp_server_reports(submitted_at DESC);
