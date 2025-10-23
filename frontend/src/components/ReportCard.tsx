/**
 * Report card component for displaying report summaries
 */

import { Ellipsis, FormatDate, Section } from "@intility/bifrost-react";
import { Link } from "react-router";
import type { ReportSummary } from "../types/api";
import { StatusBadge } from "./StatusBadge";

interface ReportCardProps {
  report: ReportSummary;
}

export function ReportCard({ report }: ReportCardProps) {
  return (
    <Section shadow={false}>
      <Link
        to={`/reports/${report.id}`}
        style={{ textDecoration: "none" }}
        className="bf-neutral-link"
      >
        <Section.Header arrow>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--bf-spacing-m)",
            }}
          >
            <span className="bf-neutral-link-text">{report.server_name}</span>
            <span style={{ marginRight: "16px" }}>
              <StatusBadge status={report.status} />
            </span>
          </div>
        </Section.Header>
      </Link>
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
              Repository
            </div>
            <Ellipsis style={{ maxWidth: "400px" }}>
              {report.repository_url}
            </Ellipsis>
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
          <div>
            <div
              style={{
                color: "var(--bfc-base-c-2)",
                fontSize: "0.875rem",
                marginBottom: "var(--bf-spacing-xs)",
              }}
            >
              Submitted
            </div>
            <div>
              <FormatDate date={new Date(report.submitted_at)} />
            </div>
          </div>
          {report.reviewed_at && (
            <div>
              <div
                style={{
                  color: "var(--bfc-base-c-2)",
                  fontSize: "0.875rem",
                  marginBottom: "var(--bf-spacing-xs)",
                }}
              >
                Reviewed
              </div>
              <div>
                <FormatDate date={new Date(report.reviewed_at)} />
              </div>
            </div>
          )}
        </div>
      </Section.Content>
    </Section>
  );
}
