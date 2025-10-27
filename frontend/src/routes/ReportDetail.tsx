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
} from "@intility/bifrost-react";
import ReactMarkdown from "react-markdown";
import { Link, useNavigate, useParams } from "react-router";
import remarkGfm from "remark-gfm";
import {
  useApproveReport,
  useDeleteReport,
  useRejectReport,
  useReport,
} from "../api/queries";
import { StatusBadge } from "../components/StatusBadge";

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
      <style>
        {`
          div.markdown-content {
            font-family: var(--bf-font-family-base);
            line-height: 1.6;
            color: var(--bfc-base-c-1);
          }

          div.markdown-content h1 {
            font-size: var(--bf-font-size-xl);
            font-weight: 600;
            margin: 0 0 var(--bf-spacing-l) 0;
            color: var(--bfc-base-c-1);
            line-height: 1.3;
            display: block;
          }

          div.markdown-content h1:first-child {
            margin-top: 0;
          }

          div.markdown-content h2 {
            font-size: var(--bf-font-size-l);
            font-weight: 600;
            margin: var(--bf-spacing-xl) 0 var(--bf-spacing-m) 0;
            color: var(--bfc-base-c-1);
            line-height: 1.3;
            display: block;
          }

          div.markdown-content h2:first-child {
            margin-top: 0;
          }

          div.markdown-content h3 {
            font-size: var(--bf-font-size-m);
            font-weight: 600;
            margin: var(--bf-spacing-l) 0 var(--bf-spacing-s) 0;
            color: var(--bfc-base-c-1);
            line-height: 1.4;
            display: block;
          }

          div.markdown-content h4 {
            font-size: var(--bf-font-size-m);
            font-weight: 600;
            margin: var(--bf-spacing-m) 0 var(--bf-spacing-xs) 0;
            color: var(--bfc-base-c-1);
            display: block;
          }

          div.markdown-content h5 {
            font-size: var(--bf-font-size-base);
            font-weight: 600;
            margin: var(--bf-spacing-m) 0 var(--bf-spacing-xs) 0;
            color: var(--bfc-base-c-2);
            display: block;
          }

          div.markdown-content h6 {
            font-size: var(--bf-font-size-s);
            font-weight: 600;
            margin: var(--bf-spacing-m) 0 var(--bf-spacing-xs) 0;
            color: var(--bfc-base-c-2);
            display: block;
          }

          div.markdown-content p {
            margin: 0 0 var(--bf-spacing-m) 0;
            font-size: var(--bf-font-size-base);
            display: block;
          }

          div.markdown-content ul,
          div.markdown-content ol {
            margin: 0 0 var(--bf-spacing-m) 0;
            padding-left: var(--bf-spacing-l);
            display: block;
          }

          div.markdown-content li {
            margin: var(--bf-spacing-xs) 0;
            display: list-item;
          }

          div.markdown-content ul li {
            list-style-type: disc;
          }

          div.markdown-content ol li {
            list-style-type: decimal;
          }

          div.markdown-content code {
            font-family: var(--bf-font-family-mono, 'Monaco', 'Courier New', monospace);
            font-size: var(--bf-font-size-s);
            background-color: var(--bfc-base-2);
            padding: var(--bf-spacing-2xs) var(--bf-spacing-xs);
            border-radius: var(--bf-border-radius-s);
            color: var(--bfc-base-c-1);
          }

          div.markdown-content pre {
            background-color: var(--bfc-base-2);
            border: 1px solid var(--bfc-base-dimmed);
            border-radius: var(--bf-border-radius-m);
            padding: var(--bf-spacing-m);
            overflow-x: auto;
            margin: 0 0 var(--bf-spacing-m) 0;
          }

          div.markdown-content pre code {
            background-color: transparent;
            padding: 0;
            font-size: var(--bf-font-size-s);
          }

          div.markdown-content blockquote {
            border-left: 4px solid var(--bfc-theme);
            padding-left: var(--bf-spacing-m);
            margin: 0 0 var(--bf-spacing-m) 0;
            color: var(--bfc-base-c-2);
            font-style: italic;
          }

          div.markdown-content a {
            color: var(--bfc-theme);
            text-decoration: none;
          }

          div.markdown-content a:hover {
            text-decoration: underline;
          }

          div.markdown-content hr {
            border: none;
            border-top: 1px solid var(--bfc-base-dimmed);
            margin: var(--bf-spacing-xl) 0;
          }

          div.markdown-content table {
            width: 100%;
            border-collapse: collapse;
            margin: 0 0 var(--bf-spacing-m) 0;
            border: 1px solid var(--bfc-base-dimmed);
            border-radius: var(--bf-border-radius-m);
            overflow: hidden;
          }

          div.markdown-content th {
            background-color: var(--bfc-base-2);
            padding: var(--bf-spacing-s);
            text-align: left;
            font-weight: 600;
            border-bottom: 1px solid var(--bfc-base-dimmed);
          }

          div.markdown-content td {
            padding: var(--bf-spacing-s);
            border-bottom: 1px solid var(--bfc-base-dimmed);
          }

          div.markdown-content tr:last-child td {
            border-bottom: none;
          }

          div.markdown-content strong {
            font-weight: 600;
            color: var(--bfc-base-c-1);
          }

          div.markdown-content em {
            font-style: italic;
          }
        `}
      </style>

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
            <div style={{ margin: "-16px 0" }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children, node }) => {
                    // Skip the first h1 (MCP Go-Live Report title)
                    const isFirstH1 = node?.position?.start?.line === 1;
                    if (isFirstH1) return null;

                    return (
                      <h2
                        style={{
                          fontSize: "var(--bf-font-size-l)",
                          fontWeight: 600,
                          margin: "1.5rem 0 0.75rem 0",
                          color: "var(--bfc-base-c-1)",
                        }}
                      >
                        {children}
                      </h2>
                    );
                  },
                h2: ({ children }) => (
                  <h3
                    style={{
                      fontSize: "var(--bf-font-size-m)",
                      fontWeight: 600,
                      margin: "1.25rem 0 0.5rem 0",
                      color: "var(--bfc-base-c-1)",
                    }}
                  >
                    {children}
                  </h3>
                ),
                h3: ({ children }) => (
                  <h4
                    style={{
                      fontSize: "var(--bf-font-size-base)",
                      fontWeight: 600,
                      margin: "1rem 0 0.5rem 0",
                      color: "var(--bfc-base-c-1)",
                    }}
                  >
                    {children}
                  </h4>
                ),
                p: ({ children }) => (
                  <p
                    style={{
                      margin: "0 0 1rem 0",
                      fontSize: "var(--bf-font-size-base)",
                      lineHeight: 1.6,
                    }}
                  >
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul
                    style={{
                      margin: "0 0 1rem 0",
                      paddingLeft: "1.5rem",
                    }}
                  >
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol
                    style={{
                      margin: "0 0 1rem 0",
                      paddingLeft: "1.5rem",
                    }}
                  >
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li style={{ margin: "0.25rem 0" }}>{children}</li>
                ),
              }}
              >
                {report.report_data}
              </ReactMarkdown>
            </div>
          </Section.Content>
        </Section>
      </Grid>
    </>
  );
}
