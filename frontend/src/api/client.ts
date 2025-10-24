/**
 * API client for MCP Go-Live service
 * Uses ky for HTTP requests with automatic error handling
 * Falls back to mock data when API is unavailable
 */

import ky from "ky";
import type {
  ApiError,
  Report,
  ReportStatus,
  ReportSummary,
  SubmitReportRequest,
  SubmitReportResponse,
  UpdateStatusRequest,
  UpdateStatusResponse,
} from "../types/api";
import { getMockReport, mockReports } from "./mockData";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";

// Enable mock mode if API is not available
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === "true";

// Create a ky instance with default configuration
const api = ky.create({
  prefixUrl: API_BASE_URL,
  timeout: 5000,
  retry: {
    limit: 0, // No retries to fail fast and use mock data
    methods: ["get"],
    statusCodes: [408, 413, 429, 500, 502, 503, 504],
  },
  hooks: {
    beforeError: [
      async (error) => {
        const { response } = error;
        if (response?.body) {
          const errorData = (await response.json()) as ApiError;
          error.message = errorData.error || error.message;
        }
        return error;
      },
    ],
  },
});

/**
 * API client for MCP Go-Live reports
 */
export const reportsApi = {
  /**
   * List reports, optionally filtered by status
   */
  async list(status?: ReportStatus): Promise<ReportSummary[]> {
    if (USE_MOCK_DATA) {
      const filtered = status
        ? mockReports.filter((r) => r.status === status)
        : mockReports;
      return Promise.resolve(filtered);
    }

    try {
      const searchParams = status ? { status } : {};
      return await api.get("reports", { searchParams }).json<ReportSummary[]>();
    } catch (error) {
      console.warn("API unavailable, using mock data:", error);
      const filtered = status
        ? mockReports.filter((r) => r.status === status)
        : mockReports;
      return filtered;
    }
  },

  /**
   * Get a single report by ID
   */
  async get(id: string): Promise<Report> {
    if (USE_MOCK_DATA) {
      const report = getMockReport(id);
      if (!report) throw new Error("Report not found");
      return Promise.resolve(report);
    }

    try {
      return await api.get(`reports/${id}`).json<Report>();
    } catch (error) {
      console.warn("API unavailable, using mock data:", error);
      const report = getMockReport(id);
      if (!report) throw new Error("Report not found");
      return report;
    }
  },

  /**
   * Submit a new report
   */
  async submit(data: SubmitReportRequest): Promise<SubmitReportResponse> {
    if (USE_MOCK_DATA) {
      return Promise.resolve({
        id: `mock-${Date.now()}`,
        status: "pending_review",
        submitted_at: new Date().toISOString(),
      });
    }

    return api.post("reports", { json: data }).json<SubmitReportResponse>();
  },

  /**
   * Update report status (approve/reject)
   */
  async updateStatus(
    id: string,
    data: UpdateStatusRequest,
  ): Promise<UpdateStatusResponse> {
    if (USE_MOCK_DATA) {
      return Promise.resolve({
        id,
        status: data.status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: data.reviewed_by,
      });
    }

    return api
      .patch(`reports/${id}/status`, { json: data })
      .json<UpdateStatusResponse>();
  },

  /**
   * Approve a report
   */
  async approve(
    id: string,
    reviewedBy: string,
    notes = "",
  ): Promise<UpdateStatusResponse> {
    return this.updateStatus(id, {
      status: "approved",
      reviewed_by: reviewedBy,
      review_notes: notes,
    });
  },

  /**
   * Reject a report
   */
  async reject(
    id: string,
    reviewedBy: string,
    notes: string,
  ): Promise<UpdateStatusResponse> {
    return this.updateStatus(id, {
      status: "rejected",
      reviewed_by: reviewedBy,
      review_notes: notes,
    });
  },

  /**
   * Delete a report
   */
  async delete(id: string): Promise<void> {
    if (USE_MOCK_DATA) {
      return Promise.resolve();
    }

    await api.delete(`reports/${id}`);
  },
};

/**
 * Health check endpoint
 */
export async function checkHealth(): Promise<{ status: string }> {
  // Health endpoint is at root, not under /api/v1
  return ky
    .get(`${API_BASE_URL.replace("/api/v1", "")}/healthz`)
    .json<{ status: string }>();
}
