/**
 * Report detail page - View full report and review
 */

import {
  Badge,
  Breadcrumbs,
  FormatDate,
  Grid,
  Icon,
  Message,
  Section,
  Table,
} from "@intility/bifrost-react";
import Markdown from "react-markdown";
import { Link, useParams } from "react-router";
import { useReport } from "../api/queries";
import { StatusBadge } from "../components/StatusBadge";

interface SecurityReviewItem {
  type: string;
  status: string;
  description: string;
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
  const { data: report, isLoading, error } = useReport(id ?? "");

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

      <Grid cols={1} gap="1.5rem">
        {/* Report Metadata */}
        <Section>
          <Section.Header>Report Information</Section.Header>
          <Section.Content>
            <dl
              style={{
                display: "grid",
                gridTemplateColumns: "200px 1fr",
                gap: "0.75rem",
                margin: 0,
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
                </>
              )}
            </dl>
          </Section.Content>
        </Section>

        {/* Security Review */}
        {(() => {
          const sections = parseReportContent(report.report_data);
          const securityContent = sections["Security Review"];
          if (securityContent) {
            const items = parseSecurityReview(securityContent);
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
                            <Badge state={item.status as "success" | "alert"}>
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
          return null;
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
                    <Markdown>{testingContent}</Markdown>
                  </div>
                </Section.Content>
              </Section>
            );
          }
          return null;
        })()}

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
