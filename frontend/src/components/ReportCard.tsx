/**
 * Report card component for displaying report summaries
 */

import { Card, Ellipsis, FormatDate, Message } from "@intility/bifrost-react";
import { Link } from "react-router";
import type { ReportSummary } from "../types/api";
import { StatusBadge } from "./StatusBadge";

interface ReportCardProps {
  report: ReportSummary;
  showRejectionReason?: boolean;
}

export function ReportCard({
  report,
  showRejectionReason = false,
}: ReportCardProps) {
  return (
    <Link
      to={`/reports/${report.id}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <Card>
        <Card.Title>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>{report.server_name}</span>
            <StatusBadge status={report.status} />
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
              <FormatDate date={new Date(report.submitted_at)} />
            </div>
            {report.reviewed_at && (
              <div>
                <strong>Reviewed:</strong>{" "}
                <FormatDate date={new Date(report.reviewed_at)} />
              </div>
            )}
            {showRejectionReason &&
              report.status === "rejected" &&
              report.review_notes && (
                <div style={{ marginTop: "0.5rem" }}>
                  <Message state="warning">
                    <strong>Why it was not approved:</strong>
                    <p style={{ margin: "0.5rem 0 0 0" }}>
                      {report.review_notes}
                    </p>
                  </Message>
                </div>
              )}
          </div>
        </Card.Content>
      </Card>
    </Link>
  );
}
