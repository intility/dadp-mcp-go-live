/**
 * Report list page - View all MCP server submissions with status
 */

import {
  Container,
  Grid,
  Icon,
  Input,
  Message,
  Section,
} from "@intility/bifrost-react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { useReports } from "../api/queries";
import { ReportCard } from "../components/ReportCard";
import type { ReportStatus } from "../types/api";

export default function ReportList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFromUrl = searchParams.get("status") as ReportStatus | null;
  const emailFromUrl = searchParams.get("email") || "";

  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">(
    statusFromUrl || "all",
  );
  const [emailFilter, setEmailFilter] = useState<string>(emailFromUrl);

  const {
    data: allReports,
    isLoading,
    error,
  } = useReports(statusFilter === "all" ? undefined : statusFilter);

  // Filter reports by email if provided
  const reports = emailFilter
    ? allReports?.filter((report) =>
        report.developer_email
          .toLowerCase()
          .includes(emailFilter.toLowerCase()),
      )
    : allReports;

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as ReportStatus | "all";
    setStatusFilter(newStatus);

    const params: Record<string, string> = {};
    if (newStatus !== "all") {
      params.status = newStatus;
    }
    if (emailFilter) {
      params.email = emailFilter;
    }
    setSearchParams(params);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmailFilter(newEmail);

    const params: Record<string, string> = {};
    if (statusFilter !== "all") {
      params.status = statusFilter;
    }
    if (newEmail) {
      params.email = newEmail;
    }
    setSearchParams(params);
  };

  return (
    <Section>
      <Container>
        <h1>MCP Server Submissions</h1>
        <p>
          View all server submissions with their approval status and feedback
        </p>

        <div
          style={{
            display: "flex",
            gap: "1rem",
            alignItems: "flex-end",
            marginTop: "2rem",
            marginBottom: "2rem",
          }}
        >
          <div style={{ flex: 1 }}>
            <Input
              label="Search by email"
              placeholder="Enter email to find your submissions"
              value={emailFilter}
              onChange={handleEmailChange}
            />
          </div>
          <div style={{ width: "220px" }}>
            <label>
              <div style={{ marginBottom: "0.5rem" }}>Filter by status</div>
              <select
                className="bf-input"
                value={statusFilter}
                onChange={handleStatusChange}
                style={{ width: "100%" }}
              >
                <option value="all">All Submissions</option>
                <option value="approved">✅ Approved</option>
                <option value="pending_review">⏳ Pending Review</option>
                <option value="rejected">❌ Needs Work</option>
              </select>
            </label>
          </div>
        </div>

        {isLoading ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <Icon.Spinner size="large" />
          </div>
        ) : error ? (
          <Message state="alert">
            <strong>Error loading reports:</strong> {(error as Error).message}
          </Message>
        ) : !reports || reports.length === 0 ? (
          <Message state="neutral">
            {emailFilter
              ? `No ${statusFilter === "all" ? "" : statusFilter.replace("_", " ")} reports found for "${emailFilter}".`
              : statusFilter === "all"
                ? "No submissions yet."
                : `No ${statusFilter.replace("_", " ")} reports found.`}
          </Message>
        ) : (
          <>
            <p>
              Showing {reports.length}{" "}
              {statusFilter === "all"
                ? "submission"
                : statusFilter.replace("_", " ")}
              {reports.length !== 1 ? "s" : ""}
              {emailFilter && ` for "${emailFilter}"`}
            </p>
            <Grid cols={1} gap="1rem">
              {reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  showRejectionReason
                />
              ))}
            </Grid>
          </>
        )}
      </Container>
    </Section>
  );
}
