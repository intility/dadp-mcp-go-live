/**
 * Report detail page - View full report and review
 */

import {
  Badge,
  Breadcrumbs,
  Button,
  FormatDate,
  Grid,
  Icon,
  Message,
  Section,
  Table,
} from "@intility/bifrost-react";
import Markdown from "react-markdown";
import { Link, useNavigate, useParams } from "react-router";
import remarkGfm from "remark-gfm";
import {
  useApproveReport,
  useDeleteReport,
  useRejectReport,
  useReport,
} from "../api/queries";
import { StatusBadge } from "../components/StatusBadge";
import type { SecurityReviewItem } from "../types/api";

function cleanMarkdown(markdown: string): string {
  // Remove trailing backslashes that break rendering
  return markdown
    .split("\n")
    .map((line) => line.replace(/\\+$/, ""))
    .join("\n");
}

function parseReportContent(markdown: string) {
  const sections: { [key: string]: string } = {};
  const lines = markdown.split("\n");
  let currentSection = "";
  let currentContent: string[] = [];

  for (const line of lines) {
    // Check if it's a heading (h1 or h2)
    if (line.startsWith("# ") || line.startsWith("## ")) {
      // Save previous section
      if (currentSection) {
        sections[currentSection] = currentContent.join("\n").trim();
      }
      // Start new section
      currentSection = line.replace(/^#+ /, "");
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentSection) {
    sections[currentSection] = currentContent.join("\n").trim();
  }

  return sections;
}

function parseSecurityReview(content: string): SecurityReviewItem[] {
  const items: SecurityReviewItem[] = [];
  const lines = content
    .split("\n")
    .filter((line) => line.trim().startsWith("-"));

  for (const line of lines) {
    // Parse line like: "- Authentication: ✅ OAuth 2.0"
    const match = line.match(/^-\s*(.+?):\s*(.+)$/);
    if (match) {
      const type = match[1].trim();
      const rest = match[2].trim();

      // Check for checkmark emoji or other status indicators
      const hasCheckmark =
        rest.includes("✅") || rest.includes("☑") || rest.includes("✓");
      const status = hasCheckmark ? "success" : "alert";

      // Remove status emoji from description
      const description = rest.replace(/[✅☑✓❌]/g, "").trim();

      items.push({ type, status, description });
    }
  }

  return items;
}

export default function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: report, isLoading, error } = useReport(id ?? "");
  const deleteReport = useDeleteReport();
  const approveReport = useApproveReport();
  const rejectReport = useRejectReport();
  const reviewerEmail = "platform@intility.no";

  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm("Are you sure you want to delete this report?")) return;

    try {
      await deleteReport.mutateAsync(id);
      navigate("/");
    } catch (error) {
      alert(`Failed to delete report: ${error}`);
    }
  };

  const handleApprove = async () => {
    if (!id) return;
    const notes = window.prompt("Add approval notes (optional):");
    if (notes === null) return; // User cancelled

    try {
      await approveReport.mutateAsync({ id, reviewedBy: reviewerEmail, notes });
    } catch (error) {
      alert(`Failed to approve report: ${error}`);
    }
  };

  const handleReject = async () => {
    if (!id) return;
    const notes = window.prompt("Add rejection notes (required):");
    if (!notes) return; // User cancelled or empty

    try {
      await rejectReport.mutateAsync({ id, reviewedBy: reviewerEmail, notes });
    } catch (error) {
      alert(`Failed to reject report: ${error}`);
    }
  };

  if (!id) {
    return (
      <>
        <Breadcrumbs>
          <Breadcrumbs.Item>
            <Link to="/">MCP Submissions</Link>
          </Breadcrumbs.Item>
        </Breadcrumbs>
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
        <Breadcrumbs>
          <Breadcrumbs.Item>
            <Link to="/">MCP Submissions</Link>
          </Breadcrumbs.Item>
        </Breadcrumbs>
        <Message state="alert">
          <strong>Error loading report:</strong> {(error as Error).message}
        </Message>
      </>
    );
  }

  if (!report) {
    return (
      <>
        <Breadcrumbs>
          <Breadcrumbs.Item>
            <Link to="/">MCP Submissions</Link>
          </Breadcrumbs.Item>
        </Breadcrumbs>
        <Message state="warning">Report not found</Message>
      </>
    );
  }

  return (
    <>
      <Breadcrumbs>
        <Breadcrumbs.Item>
          <Link to="/">MCP Submissions</Link>
        </Breadcrumbs.Item>
        <Breadcrumbs.Item>{report.server_name}</Breadcrumbs.Item>
      </Breadcrumbs>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h1 style={{ margin: 0 }}>{report.server_name}</h1>
        <StatusBadge status={report.status} />
      </div>

      {/* Action Buttons */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <Button
          onClick={handleApprove}
          state="success"
          disabled={approveReport.isPending}
        >
          {approveReport.isPending ? "Approving..." : "Approve"}
        </Button>
        <Button
          onClick={handleReject}
          state="alert"
          disabled={rejectReport.isPending}
        >
          {rejectReport.isPending ? "Rejecting..." : "Reject"}
        </Button>
        <Button
          onClick={handleDelete}
          state="alert"
          variant="outline"
          disabled={deleteReport.isPending}
          style={{ marginLeft: "auto" }}
        >
          {deleteReport.isPending ? "Deleting..." : "Delete"}
        </Button>
      </div>

      <Grid cols={1} gap="1.5rem">
        {/* Report Metadata */}
        <Section>
          <Section.Header>Report Information</Section.Header>
          <Section.Content>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <div>
                <div
                  style={{
                    color: "var(--bfc-base-c-2)",
                    fontSize: "0.875rem",
                    marginBottom: "var(--bf-spacing-xs)",
                  }}
                >
                  Server Name
                </div>
                <div>{report.server_name}</div>
              </div>

              <div>
                <div
                  style={{
                    color: "var(--bfc-base-c-2)",
                    fontSize: "0.875rem",
                    marginBottom: "var(--bf-spacing-xs)",
                  }}
                >
                  Repository URL
                </div>
                <div>
                  <a
                    href={report.repository_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {report.repository_url}
                  </a>
                </div>
              </div>

              <div>
                <div
                  style={{
                    color: "var(--bfc-base-c-2)",
                    fontSize: "0.875rem",
                    marginBottom: "var(--bf-spacing-xs)",
                  }}
                >
                  Developer
                </div>
                <div>{report.developer_email}</div>
              </div>

              <dt>
                <strong>Submitted:</strong>
              </dt>
              <dd>
                <FormatDate
                  date={new Date(report.submitted_at)}
                  show="datetime"
                />
              </dd>

              {report.reviewed_at && (
                <>
                  <dt>
                    <strong>Reviewed:</strong>
                  </dt>
                  <dd>
                    <FormatDate
                      date={new Date(report.reviewed_at)}
                      show="datetime"
                    />
                  </dd>
                </>
              )}
            </div>
          </Section.Content>
        </Section>

        {/* Structured Report Summary */}
        {report.report_json && (
          <Section>
            <Section.Header>Report Summary</Section.Header>
            <Section.Content>
              <dl
                style={{
                  display: "grid",
                  gridTemplateColumns: "200px 1fr",
                  gap: "0.75rem",
                  margin: 0,
                }}
              >
                {report.report_json.executive_summary?.overall_status && (
                  <>
                    <dt>
                      <strong>Overall Status:</strong>
                    </dt>
                    <dd>
                      <Badge
                        state={
                          report.report_json.executive_summary
                            .overall_status === "APPROVED"
                            ? "success"
                            : "warning"
                        }
                      >
                        {report.report_json.executive_summary.overall_status}
                      </Badge>
                    </dd>
                  </>
                )}

                {report.report_json.phase1_security?.risk_level && (
                  <>
                    <dt>
                      <strong>Risk Level:</strong>
                    </dt>
                    <dd>
                      <Badge
                        state={
                          report.report_json.phase1_security.risk_level ===
                            "LOW" ||
                          report.report_json.phase1_security.risk_level ===
                            "MEDIUM"
                            ? "success"
                            : "alert"
                        }
                      >
                        {report.report_json.phase1_security.risk_level}
                      </Badge>
                    </dd>
                  </>
                )}

                {report.report_json.executive_summary?.critical_issues_count !==
                  undefined && (
                  <>
                    <dt>
                      <strong>Critical Issues:</strong>
                    </dt>
                    <dd>
                      <Badge
                        state={
                          report.report_json.executive_summary
                            .critical_issues_count === 0
                            ? "success"
                            : "alert"
                        }
                      >
                        {
                          report.report_json.executive_summary
                            .critical_issues_count
                        }
                      </Badge>
                    </dd>
                  </>
                )}

                {report.report_json.report_version && (
                  <>
                    <dt>
                      <strong>Report Version:</strong>
                    </dt>
                    <dd>{report.report_json.report_version}</dd>
                  </>
                )}
              </dl>
            </Section.Content>
          </Section>
        )}

        {/* Security Review */}
        {(() => {
          // Try to get security review from structured JSON first
          const securityReviewItems =
            report.report_json?.security_review?.items;

          // Fall back to parsing from markdown if not in JSON
          if (!securityReviewItems) {
            const sections = parseReportContent(report.report_data);
            const securityContent = sections["Security Review"];
            if (securityContent) {
              const items = parseSecurityReview(securityContent);
              if (items.length > 0) {
                return (
                  <Section style={{ overflow: "hidden" }}>
                    <Section.Header>Security Review</Section.Header>
                    <Section.Content padding={0}>
                      <Table noBorder style={{ margin: 0 }}>
                        <Table.Header>
                          <Table.Row>
                            <Table.HeaderCell>Type</Table.HeaderCell>
                            <Table.HeaderCell>Status</Table.HeaderCell>
                            <Table.HeaderCell>Description</Table.HeaderCell>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {items.map((item) => (
                            <Table.Row key={item.type}>
                              <Table.Cell>{item.type}</Table.Cell>
                              <Table.Cell>
                                <Badge
                                  state={item.status as "success" | "alert"}
                                >
                                  {item.status === "success" ? "Pass" : "Fail"}
                                </Badge>
                              </Table.Cell>
                              <Table.Cell>{item.description}</Table.Cell>
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table>
                    </Section.Content>
                  </Section>
                );
              }
            }
            return null;
          }

          // Render from structured JSON
          return (
            <Section style={{ overflow: "hidden" }}>
              <Section.Header>Security Review</Section.Header>
              <Section.Content padding={0}>
                <Table noBorder style={{ margin: 0 }}>
                  <Table.Header>
                    <Table.Row>
                      <Table.HeaderCell>Type</Table.HeaderCell>
                      <Table.HeaderCell>Status</Table.HeaderCell>
                      <Table.HeaderCell>Description</Table.HeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {securityReviewItems.map((item: SecurityReviewItem) => (
                      <Table.Row key={item.type}>
                        <Table.Cell>{item.type}</Table.Cell>
                        <Table.Cell>
                          <Badge
                            state={item.status === "Pass" ? "success" : "alert"}
                          >
                            {item.status}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>{item.description}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </Section.Content>
            </Section>
          );
        })()}

        {/* Testing */}
        {(() => {
          const sections = parseReportContent(report.report_data);
          const testingContent = sections.Testing;
          if (testingContent) {
            return (
              <Section>
                <Section.Header>Testing</Section.Header>
                <Section.Content>
                  <div className="markdown-content" style={{ margin: 0 }}>
                    <Markdown remarkPlugins={[remarkGfm]}>
                      {cleanMarkdown(testingContent)}
                    </Markdown>
                  </div>
                </Section.Content>
              </Section>
            );
          }
          return null;
        })()}

        {/* Full Report */}
        <Section>
          <Section.Header>Full Report</Section.Header>
          <Section.Content>
            <div className="markdown-content" style={{ margin: 0 }}>
              <Markdown remarkPlugins={[remarkGfm]}>
                {cleanMarkdown(report.report_data)}
              </Markdown>
            </div>
          </Section.Content>
        </Section>

        {/* Review Notes */}
        {report.review_notes && (
          <Section>
            <Section.Header>Review Notes</Section.Header>
            <Section.Content>
              <p style={{ margin: 0 }}>{report.review_notes}</p>
            </Section.Content>
          </Section>
        )}
      </Grid>
    </>
  );
}
