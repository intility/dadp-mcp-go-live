/**
 * Report detail page - View full report and review
 */

import {
  BackButton,
  Card,
  FormatDate,
  Grid,
  Icon,
  Message,
} from "@intility/bifrost-react";
import Markdown from "react-markdown";
import { useParams } from "react-router";
import { useApproveReport, useRejectReport, useReport } from "../api/queries";
import { ReviewForm } from "../components/ReviewForm";
import { StatusBadge } from "../components/StatusBadge";

export default function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: report, isLoading, error } = useReport(id ?? "");
  const approveReport = useApproveReport();
  const rejectReport = useRejectReport();

  const handleApprove = async (reviewedBy: string, notes: string) => {
    if (!id) return;
    try {
      await approveReport.mutateAsync({ id, reviewedBy, notes });
      alert("Report approved successfully!");
    } catch (err) {
      alert(`Failed to approve report: ${(err as Error).message}`);
    }
  };

  const handleReject = async (reviewedBy: string, notes: string) => {
    if (!id) return;
    try {
      await rejectReport.mutateAsync({ id, reviewedBy, notes });
      alert("Report rejected");
    } catch (err) {
      alert(`Failed to reject report: ${(err as Error).message}`);
    }
  };

  if (!id) {
    return (
      <>
        <BackButton />
        <Message state="alert">Invalid report ID</Message>
      </>
    );
  }

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <Icon.Spinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <>
        <BackButton />
        <Message state="alert">
          <strong>Error loading report:</strong> {(error as Error).message}
        </Message>
      </>
    );
  }

  if (!report) {
    return (
      <>
        <BackButton />
        <Message state="warning">Report not found</Message>
      </>
    );
  }

  return (
    <>
      <BackButton />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h1 style={{ marginTop: 0 }}>{report.server_name}</h1>
        <StatusBadge status={report.status} />
      </div>

      <Grid cols={1} gap="1.5rem">
        {/* Report Metadata */}
        <Card>
          <Card.Title>Report Information</Card.Title>
          <Card.Content>
            <dl
              style={{
                display: "grid",
                gridTemplateColumns: "200px 1fr",
                gap: "0.75rem",
              }}
            >
              <dt>
                <strong>Server Name:</strong>
              </dt>
              <dd>{report.server_name}</dd>

              <dt>
                <strong>Repository URL:</strong>
              </dt>
              <dd>
                <a
                  href={report.repository_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {report.repository_url}
                </a>
              </dd>

              <dt>
                <strong>Developer:</strong>
              </dt>
              <dd>{report.developer_email}</dd>

              <dt>
                <strong>Submitted:</strong>
              </dt>
              <dd>
                <FormatDate date={new Date(report.submitted_at)} />
              </dd>

              {report.reviewed_at && (
                <>
                  <dt>
                    <strong>Reviewed:</strong>
                  </dt>
                  <dd>
                    <FormatDate date={new Date(report.reviewed_at)} />
                  </dd>

                  <dt>
                    <strong>Reviewed By:</strong>
                  </dt>
                  <dd>{report.reviewed_by}</dd>

                  {report.review_notes && (
                    <>
                      <dt>
                        <strong>Review Notes:</strong>
                      </dt>
                      <dd>{report.review_notes}</dd>
                    </>
                  )}
                </>
              )}
            </dl>
          </Card.Content>
        </Card>

        {/* Structured Analysis */}
        {report.report_json && (
          <Card>
            <Card.Title>Structured Analysis</Card.Title>
            <Card.Content>
              <dl
                style={{
                  display: "grid",
                  gridTemplateColumns: "200px 1fr",
                  gap: "0.75rem",
                }}
              >
                {report.report_json.executive_summary && (
                  <>
                    <dt>
                      <strong>Overall Status:</strong>
                    </dt>
                    <dd>
                      <StatusBadge
                        status={
                          report.report_json.executive_summary
                            .overall_status === "APPROVED"
                            ? "approved"
                            : "pending_review"
                        }
                      />
                    </dd>

                    <dt>
                      <strong>Critical Issues:</strong>
                    </dt>
                    <dd>
                      {report.report_json.executive_summary
                        .critical_issues_count || 0}
                    </dd>
                  </>
                )}

                {report.report_json.phase1_security && (
                  <>
                    <dt>
                      <strong>Risk Level:</strong>
                    </dt>
                    <dd>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "0.25rem 0.5rem",
                          borderRadius: "4px",
                          fontSize: "0.875rem",
                          fontWeight: "bold",
                          backgroundColor:
                            report.report_json.phase1_security.risk_level ===
                            "LOW"
                              ? "#d4edda"
                              : report.report_json.phase1_security
                                    .risk_level === "MEDIUM"
                                ? "#fff3cd"
                                : "#f8d7da",
                          color:
                            report.report_json.phase1_security.risk_level ===
                            "LOW"
                              ? "#155724"
                              : report.report_json.phase1_security
                                    .risk_level === "MEDIUM"
                                ? "#856404"
                                : "#721c24",
                        }}
                      >
                        {report.report_json.phase1_security.risk_level}
                      </span>
                    </dd>
                  </>
                )}

                {report.report_json.server_info && (
                  <>
                    <dt>
                      <strong>Report Version:</strong>
                    </dt>
                    <dd>{report.report_json.report_version || "N/A"}</dd>
                  </>
                )}
              </dl>
            </Card.Content>
          </Card>
        )}

        {/* Report Content */}
        <Card>
          <Card.Title>Report Details</Card.Title>
          <Card.Content>
            <div className="markdown-content">
              <Markdown>{report.report_data}</Markdown>
            </div>
          </Card.Content>
        </Card>

        {/* Review Form */}
        <Card>
          <Card.Title>Review</Card.Title>
          <Card.Content>
            <ReviewForm
              report={report}
              onApprove={handleApprove}
              onReject={handleReject}
              isLoading={approveReport.isPending || rejectReport.isPending}
            />
          </Card.Content>
        </Card>
      </Grid>
    </>
  );
}
