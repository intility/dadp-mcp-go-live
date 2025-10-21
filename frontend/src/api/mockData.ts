/**
 * Mock data for development when API is not available
 */
import type { Report, ReportSummary } from "../types/api";

export const mockReports: ReportSummary[] = [
  {
    id: "1",
    server_name: "mcp-servicenow",
    repository_url: "https://github.com/intility/mcp-servicenow",
    developer_email: "dev@intility.no",
    status: "approved",
    submitted_at: "2025-01-15T10:00:00Z",
    reviewed_at: "2025-01-16T14:30:00Z",
    reviewed_by: "platform@intility.no",
    review_notes: "Great work! All requirements met.",
  },
  {
    id: "2",
    server_name: "mcp-github",
    repository_url: "https://github.com/example/mcp-github",
    developer_email: "john@company.com",
    status: "pending_review",
    submitted_at: "2025-01-20T09:15:00Z",
    reviewed_at: null,
    reviewed_by: null,
    review_notes: null,
  },
  {
    id: "3",
    server_name: "mcp-slack",
    repository_url: "https://github.com/example/mcp-slack",
    developer_email: "jane@company.com",
    status: "rejected",
    submitted_at: "2025-01-18T11:00:00Z",
    reviewed_at: "2025-01-19T16:00:00Z",
    reviewed_by: "platform@intility.no",
    review_notes:
      "Missing security documentation. Please add authentication details and rate limiting information.",
  },
];

export const getMockReport = (id: string): Report | undefined => {
  const summary = mockReports.find((r) => r.id === id);
  if (!summary) return undefined;

  return {
    ...summary,
    report_data: `# ${summary.server_name} Go-Live Report

## Overview
This is a sample report for ${summary.server_name}.

## Security Review
- Authentication: ✅ OAuth 2.0
- Rate Limiting: ✅ Implemented
- Error Handling: ✅ Proper error messages

## Testing
All tests passing.`,
    report_json: {
      report_version: "1.0",
      server_info: {
        server_name: summary.server_name,
        repository_url: summary.repository_url,
        developer_email: summary.developer_email,
      },
      executive_summary: {
        overall_status: summary.status === "approved" ? "APPROVED" : "NEEDS_REVIEW",
        critical_issues_count: summary.status === "rejected" ? 2 : 0,
      },
      phase1_security: {
        risk_level: summary.status === "rejected" ? "HIGH" : "LOW",
      },
    },
  };
};
