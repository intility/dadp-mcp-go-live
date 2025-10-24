/**
 * API types for MCP Go-Live service
 */

export type ReportStatus = "pending_review" | "approved" | "rejected";

export interface SecurityReviewItem {
  type: string;
  status: "Pass" | "Fail";
  description: string;
}

export interface SecurityReview {
  items: SecurityReviewItem[];
}

export interface ExecutiveSummary {
  overall_status: "APPROVED" | "REJECTED" | "PENDING";
  risk_level?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  critical_issues_count?: number;
}

export interface ReportJSON {
  report_version?: string;
  executive_summary?: ExecutiveSummary;
  security_review?: SecurityReview;
  phase1_security?: {
    risk_level?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  };
}

export interface Report {
  id: string;
  server_name: string;
  repository_url: string;
  developer_email: string;
  report_data: string;
  report_json?: ReportJSON;
  raw_json?: Record<string, unknown> | null;
  status: ReportStatus;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
}

export interface ReportSummary {
  id: string;
  server_name: string;
  repository_url: string;
  developer_email: string;
  status: ReportStatus;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
}

export interface SubmitReportRequest {
  server_name: string;
  repository_url: string;
  developer_email: string;
  report_data: string;
  report_json: Record<string, unknown>;
  raw_json?: Record<string, unknown>;
}

export interface SubmitReportResponse {
  id: string;
  status: ReportStatus;
  submitted_at: string;
}

export interface UpdateStatusRequest {
  status: ReportStatus;
  reviewed_by: string;
  review_notes: string;
}

export interface UpdateStatusResponse {
  id: string;
  status: ReportStatus;
  reviewed_at: string;
  reviewed_by: string;
}

export interface ApiError {
  error: string;
  details?: string;
}
