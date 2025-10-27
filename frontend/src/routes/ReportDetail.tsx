/**
 * Report detail page - View full report and review
 */

import { faArrowDownToLine, faTrash } from "@fortawesome/pro-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Badge,
  Box,
  Breadcrumbs,
  Button,
  FormatDate,
  Grid,
  Icon,
  Message,
  Section,
  Table,
} from "@intility/bifrost-react";
import { Link, useNavigate, useParams } from "react-router";
import {
  useApproveReport,
  useDeleteReport,
  useRejectReport,
  useReport,
} from "../api/queries";
import { StatusBadge } from "../components/StatusBadge";
import type { SecurityReviewItem } from "../types/api";

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

  const handleDownload = () => {
    if (!report) return;

    // Create a blob from the markdown content
    const blob = new Blob([report.report_data], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);

    // Create a temporary link and trigger download
    const link = document.createElement("a");
    link.href = url;
    link.download = `${report.server_name.replace(/[^a-z0-9]/gi, "_")}_report.md`;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
      <Breadcrumbs style={{ marginBottom: "1.5rem" }}>
        <Breadcrumbs.Item>
          <Link to="/">MCP Submissions</Link>
        </Breadcrumbs.Item>
        <Breadcrumbs.Item>{report.server_name}</Breadcrumbs.Item>
      </Breadcrumbs>

      <Box
        radius
        shadow
        background
        style={{
          marginBottom: "24px",
          padding: "24px 24px 16px 24px",
          position: "relative",
        }}
      >
        <style>
          {`
            .header-buttons-wrapper {
              position: absolute;
              top: 24px;
              right: 24px;
            }
            .report-summary-grid {
              display: grid;
              grid-template-columns: 200px 1fr;
              gap: 0.75rem;
              margin: 0;
            }
            @media (max-width: 799px) {
              .header-buttons-wrapper {
                position: static;
                width: calc(100% + 48px);
                padding-top: 16px;
                border-top: 1px solid var(--bfc-base-dimmed);
                margin-top: 16px;
                margin-left: -24px;
                margin-right: -24px;
                padding-left: 24px;
                padding-right: 24px;
              }
              .action-buttons-group {
                flex-direction: column;
                align-items: stretch;
                width: 100%;
              }
            }
            @media (max-width: 599px) {
              .header-buttons-wrapper {
                flex-direction: column-reverse;
                align-items: stretch;
              }
              .header-buttons-group {
                width: 100%;
              }
              .report-summary-grid {
                grid-template-columns: auto 1fr;
                gap: 0.5rem;
              }
            }
          `}
        </style>

        {/* Top row: Status badge */}
        <div
          className="header-title-section"
          style={{
            marginBottom: "4px",
          }}
        >
          <StatusBadge status={report.status} />
        </div>

        {/* Title */}
        <h3
          style={{ margin: "0 0 16px 0", fontSize: "1.5rem", fontWeight: 600 }}
        >
          {report.server_name}
        </h3>

        {/* Separator line */}
        <div
          style={{
            borderTop: "1px solid var(--bfc-base-dimmed)",
            margin: "0 -24px 0 -24px",
          }}
        />

        {/* Metadata row */}
        <div
          className="metadata-row"
          style={{
            display: "flex",
            gap: "1rem",
            fontSize: "0.875rem",
            color: "var(--bfc-base-c-2)",
            marginTop: "16px",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <style>
            {`
              @media (max-width: 1279px) {
                .metadata-row {
                  flex-direction: column !important;
                  gap: 0.75rem !important;
                }
                .metadata-item {
                  border-left: none !important;
                  padding-left: 0 !important;
                }
              }
            `}
          </style>
          <div
            className="metadata-item"
            style={{ display: "flex", gap: "8px" }}
          >
            <span>Repository URL:</span>
            <a
              href={report.repository_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                textDecoration: "none",
                color: "var(--bfc-theme)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = "underline";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = "none";
              }}
            >
              {report.repository_url}
            </a>
          </div>
          <div
            className="metadata-item"
            style={{
              borderLeft: "1px solid var(--bfc-base-dimmed)",
              paddingLeft: "1rem",
              display: "flex",
              gap: "8px",
            }}
          >
            <span>Developer:</span>
            <span style={{ color: "var(--bfc-base-c-1)" }}>
              {report.developer_email}
            </span>
          </div>
          <div
            className="metadata-item"
            style={{
              borderLeft: "1px solid var(--bfc-base-dimmed)",
              paddingLeft: "1rem",
              display: "flex",
              gap: "8px",
            }}
          >
            <span>Submitted:</span>
            <span style={{ color: "var(--bfc-base-c-1)" }}>
              <FormatDate
                date={new Date(report.submitted_at)}
                show="datetime"
              />
            </span>
          </div>
          {report.reviewed_at && (
            <div
              className="metadata-item"
              style={{
                borderLeft: "1px solid var(--bfc-base-dimmed)",
                paddingLeft: "1rem",
                display: "flex",
                gap: "8px",
              }}
            >
              <span>Reviewed:</span>
              <span style={{ color: "var(--bfc-base-c-1)" }}>
                <FormatDate
                  date={new Date(report.reviewed_at)}
                  show="datetime"
                />
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div
          className="header-buttons-wrapper"
          style={{
            display: "flex",
            gap: "0.5rem",
            justifyContent: "space-between",
          }}
        >
          <div
            className="action-buttons-group"
            style={{ display: "flex", gap: "0.5rem" }}
          >
            <Button onClick={handleDownload} variant="flat" size="small">
              <FontAwesomeIcon
                icon={faArrowDownToLine}
                style={{ marginRight: "4px" }}
              />
              Download report
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleteReport.isPending}
              state="alert"
              variant="flat"
              size="small"
            >
              <FontAwesomeIcon icon={faTrash} style={{ marginRight: "4px" }} />
              {deleteReport.isPending ? "Deleting..." : "Delete report"}
            </Button>
          </div>
          <div
            className="header-buttons-group"
            style={{ display: "none", gap: "0.5rem" }}
          >
            <Button
              onClick={handleApprove}
              variant="filled"
              disabled={approveReport.isPending}
            >
              {approveReport.isPending ? "Approving..." : "Approve"}
            </Button>
            <Button
              onClick={handleReject}
              variant="filled"
              state="alert"
              disabled={rejectReport.isPending}
            >
              {rejectReport.isPending ? "Rejecting..." : "Reject"}
            </Button>
          </div>
        </div>
      </Box>

      <Grid cols={1} gap="1.5rem">
        {/* Structured Report Summary */}
        {report.report_json && (
          <Section>
            <Section.Header>Report Summary</Section.Header>
            <Section.Content>
              <dl className="report-summary-grid">
                {report.report_json.executive_summary?.overall_status && (
                  <>
                    <dt style={{ fontWeight: 600 }}>Overall Status:</dt>
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
                    <dt style={{ fontWeight: 600 }}>Risk Level:</dt>
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
                    <dt style={{ fontWeight: 600 }}>Critical Issues:</dt>
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
                    <dt style={{ fontWeight: 600 }}>Report Version:</dt>
                    <dd>{report.report_json.report_version}</dd>
                  </>
                )}
              </dl>
            </Section.Content>
          </Section>
        )}

        {/* Review Notes */}
        {report.review_notes && (
          <Section>
            <Section.Header>Review Notes</Section.Header>
            <Section.Content>
              <div style={{ margin: 0 }}>
                {report.review_notes
                  .split("\n")
                  .filter((line) => line.trim())
                  .map((line) => {
                    const trimmedLine = line.trim();
                    // Check if line starts with a number followed by a period
                    if (/^\d+\./.test(trimmedLine)) {
                      return (
                        <div
                          key={trimmedLine}
                          style={{ marginBottom: "0.5rem" }}
                        >
                          {trimmedLine}
                        </div>
                      );
                    }
                    // Otherwise, render as plain text
                    return (
                      <p key={trimmedLine} style={{ margin: "0 0 0.5rem 0" }}>
                        {trimmedLine}
                      </p>
                    );
                  })}
              </div>
            </Section.Content>
          </Section>
        )}

        {/* Full Report */}
        <Section>
          <Section.Header>Full Report</Section.Header>
          <Section.Content>
            {/* Security Review Table */}
            {(() => {
              const securityReviewItems =
                report.report_json?.security_review?.items;

              if (securityReviewItems && securityReviewItems.length > 0) {
                return (
                  <div
                    style={{
                      marginBottom: "2rem",
                      border: "1px solid var(--bfc-base-dimmed)",
                      borderRadius: "8px",
                      overflow: "hidden",
                    }}
                  >
                    <Table noBorder>
                      <Table.Header>
                        <Table.Row>
                          <Table.HeaderCell
                            colSpan={3}
                            style={{
                              borderBottom: "1px solid var(--bfc-base-dimmed)",
                              backgroundColor: "var(--bfc-base-2)",
                            }}
                          >
                            <span style={{ fontWeight: 600 }}>
                              Security Review
                            </span>
                          </Table.HeaderCell>
                        </Table.Row>
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
                                state={
                                  item.status === "Pass" ? "success" : "alert"
                                }
                              >
                                {item.status}
                              </Badge>
                            </Table.Cell>
                            <Table.Cell>{item.description}</Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table>
                  </div>
                );
              }

              // Fall back to parsing from markdown if not in JSON
              const sections = parseReportContent(report.report_data);
              const securityContent = sections["Security Review"];
              if (securityContent) {
                const items = parseSecurityReview(securityContent);
                if (items.length > 0) {
                  return (
                    <div
                      style={{
                        marginBottom: "2rem",
                        border: "1px solid var(--bfc-base-dimmed)",
                        borderRadius: "8px",
                        overflow: "hidden",
                      }}
                    >
                      <Table noBorder>
                        <Table.Header>
                          <Table.Row>
                            <Table.HeaderCell
                              colSpan={3}
                              style={{
                                borderBottom:
                                  "1px solid var(--bfc-base-dimmed)",
                                backgroundColor: "var(--bfc-base-2)",
                              }}
                            >
                              <span style={{ fontWeight: 600 }}>
                                Security Review
                              </span>
                            </Table.HeaderCell>
                          </Table.Row>
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
                    </div>
                  );
                }
              }
              return null;
            })()}

            {/* Testing Section */}
            {(() => {
              const sections = parseReportContent(report.report_data);
              const testingContent = sections.Testing;
              if (testingContent) {
                // Parse testing content to get bullet points
                const lines = testingContent
                  .split("\n")
                  .map((l) => l.trim())
                  .filter((l) => l.startsWith("-"));

                // Find unit tests and integration tests lines
                const unitTestLine = lines.find((l) =>
                  /unit\s+tests?:/i.test(l),
                );
                const integrationTestLine = lines.find((l) =>
                  /integration\s+tests?:/i.test(l),
                );

                // Only render if at least one test line exists
                if (!unitTestLine && !integrationTestLine) {
                  return null;
                }

                return (
                  <div
                    style={{
                      marginTop: "var(--bfs24)",
                      border: "1px solid var(--bfc-base-dimmed)",
                      borderRadius: "8px",
                      overflow: "hidden",
                    }}
                  >
                    <Table noBorder>
                      <Table.Header>
                        <Table.Row>
                          <Table.HeaderCell
                            style={{
                              borderBottom: "1px solid var(--bfc-base-dimmed)",
                              backgroundColor: "var(--bfc-base-2)",
                            }}
                          >
                            <span style={{ fontWeight: 600 }}>Testing</span>
                          </Table.HeaderCell>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {unitTestLine && (
                          <Table.Row>
                            <Table.Cell>
                              {(() => {
                                const text = unitTestLine.replace(/^-\s*/i, "");
                                const [before, after] = text.split(":");
                                return (
                                  <>
                                    <strong>{before}:</strong> {after}
                                  </>
                                );
                              })()}
                            </Table.Cell>
                          </Table.Row>
                        )}
                        {integrationTestLine && (
                          <Table.Row>
                            <Table.Cell>
                              {(() => {
                                const text = integrationTestLine.replace(
                                  /^-\s*/i,
                                  "",
                                );
                                const [before, after] = text.split(":");
                                return (
                                  <>
                                    <strong>{before}:</strong> {after}
                                  </>
                                );
                              })()}
                            </Table.Cell>
                          </Table.Row>
                        )}
                      </Table.Body>
                    </Table>
                  </div>
                );
              }
              return null;
            })()}
          </Section.Content>
        </Section>
      </Grid>
    </>
  );
}
