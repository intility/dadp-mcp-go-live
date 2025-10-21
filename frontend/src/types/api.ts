/**
 * API types for MCP Go-Live service
 */

export type ReportStatus = "pending_review" | "approved" | "rejected";

export interface Report {
  id: string;
  server_name: string;
  repository_url: string;
  developer_email: string;
  report_data: string;
  report_json: Record<string, any>;
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
  report_json: Record<string, any>;
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
