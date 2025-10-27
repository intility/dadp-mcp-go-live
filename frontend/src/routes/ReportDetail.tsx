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
            line-height: 1.7;
            color: var(--bfc-base-c-1);
          }

          div.markdown-content h1 {
            font-size: 2rem;
            font-weight: 600;
            margin: 0 0 2rem 0;
            color: var(--bfc-base-c-1);
            line-height: 1.3;
            padding-bottom: 1rem;
            border-bottom: 2px solid var(--bfc-base-dimmed);
          }

          div.markdown-content h1:first-child {
            margin-top: 0;
          }

          div.markdown-content h2 {
            font-size: 1.5rem;
            font-weight: 600;
            margin: 3rem 0 1.5rem 0;
            color: var(--bfc-base-c-1);
            line-height: 1.4;
            padding-bottom: 0.75rem;
            border-bottom: 1px solid var(--bfc-base-dimmed);
          }

          div.markdown-content h2:first-child {
            margin-top: 0;
          }

          div.markdown-content h3 {
            font-size: 1.25rem;
            font-weight: 600;
            margin: 2.5rem 0 1rem 0;
            color: var(--bfc-base-c-1);
            line-height: 1.5;
          }

          div.markdown-content h4 {
            font-size: 1.1rem;
            font-weight: 600;
            margin: 2rem 0 0.75rem 0;
            color: var(--bfc-base-c-1);
          }

          div.markdown-content h5 {
            font-size: 1rem;
            font-weight: 600;
            margin: 1.25rem 0 0.5rem 0;
            color: var(--bfc-base-c-2);
          }

          div.markdown-content h6 {
            font-size: 0.875rem;
            font-weight: 600;
            margin: 1rem 0 0.5rem 0;
            color: var(--bfc-base-c-2);
          }

          div.markdown-content p {
            margin: 0 0 1.5rem 0;
            font-size: 1rem;
            line-height: 1.8;
          }

          div.markdown-content ul,
          div.markdown-content ol {
            margin: 0 0 1.5rem 0;
            padding-left: 2.5rem;
          }

          div.markdown-content li {
            margin: 0.75rem 0;
            line-height: 1.8;
          }

          div.markdown-content ul li {
            list-style-type: disc;
          }

          div.markdown-content ol li {
            list-style-type: decimal;
          }

          div.markdown-content ul ul,
          div.markdown-content ol ul,
          div.markdown-content ul ol,
          div.markdown-content ol ol {
            margin: 0.5rem 0;
          }

          div.markdown-content code {
            font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
            font-size: 0.875rem;
            background-color: rgba(175, 184, 193, 0.2);
            padding: 0.2em 0.4em;
            border-radius: 3px;
            color: var(--bfc-base-c-1);
          }

          div.markdown-content pre {
            background-color: rgba(175, 184, 193, 0.1);
            border: 1px solid var(--bfc-base-dimmed);
            border-radius: 6px;
            padding: 1rem;
            overflow-x: auto;
            margin: 0 0 1.25rem 0;
          }

          div.markdown-content pre code {
            background-color: transparent;
            padding: 0;
            font-size: 0.875rem;
          }

          div.markdown-content blockquote {
            border-left: 4px solid var(--bfc-theme);
            padding-left: 1rem;
            margin: 0 0 1.25rem 0;
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
            margin: 2rem 0;
          }

          div.markdown-content table {
            width: 100%;
            border-collapse: collapse;
            margin: 1.5rem 0 2rem 0;
            border: 1px solid var(--bfc-base-dimmed);
            border-radius: 6px;
            overflow: hidden;
          }

          div.markdown-content th {
            background-color: rgba(175, 184, 193, 0.1);
            padding: 1rem 1.25rem;
            text-align: left;
            font-weight: 600;
            font-size: 0.9375rem;
            border-bottom: 1px solid var(--bfc-base-dimmed);
            color: var(--bfc-base-c-1);
          }

          div.markdown-content td {
            padding: 1rem 1.25rem;
            border-bottom: 1px solid var(--bfc-base-dimmed);
            font-size: 0.9375rem;
            line-height: 1.6;
          }

          div.markdown-content tr:last-child td {
            border-bottom: none;
          }

          div.markdown-content tbody tr:hover {
            background-color: rgba(175, 184, 193, 0.05);
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
        <Box
          radius
          padding={24}
          style={{
            border: "1px solid var(--bfc-base-dimmed)",
          }}
        >
          <div className="markdown-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {report.report_data}
            </ReactMarkdown>
          </div>
        </Box>
      </Grid>
    </>
  );
}
