/**
 * Report card component for displaying report summaries
 */

import { Card, Ellipsis, FormatDate } from "@intility/bifrost-react";
import { Link } from "react-router";
import type { ReportSummary } from "../types/api";
import { StatusBadge } from "./StatusBadge";

interface ReportCardProps {
  report: ReportSummary;
}

export function ReportCard({ report }: ReportCardProps) {
  return (
    <Link
      to={`/reports/${report.id}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <Card radius="s">
        <Card.Title>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>{report.server_name}</span>
            <span style={{ pointerEvents: "none" }}>
              <StatusBadge status={report.status} />
            </span>
          </div>
        </Card.Title>
        <Card.Content>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            <div>
              <strong>Repository:</strong>{" "}
              <Ellipsis style={{ maxWidth: "400px" }}>
                {report.repository_url}
              </Ellipsis>
            </div>
            <div>
              <strong>Developer:</strong> {report.developer_email}
            </div>
            <div>
              <strong>Submitted:</strong>{" "}
              <FormatDate
                date={new Date(report.submitted_at)}
                show="datetime"
              />
            </div>
            {report.reviewed_at && (
              <div>
                <strong>Reviewed:</strong>{" "}
                <FormatDate
                  date={new Date(report.reviewed_at)}
                  show="datetime"
                />
              </div>
            )}
          </div>
        </Card.Content>
      </Card>
    </Link>
  );
}
