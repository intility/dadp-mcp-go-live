/**
 * Dashboard page - Overview of MCP Go-Live reports
 */

import {
  Badge,
  Grid,
  Icon,
  Input,
  Message,
  Tabs,
} from "@intility/bifrost-react";
import { useState } from "react";
import { useReports } from "../api/queries";
import PageHeader from "../components/PageHeader";
import { ReportCard } from "../components/ReportCard";

export default function Dashboard() {
  const [nameFilter, setNameFilter] = useState<string>("");

  const { data: allReports, isLoading: loadingAll } = useReports();
  const { data: approvedReports, isLoading: loadingApproved } =
    useReports("approved");
  const { data: rejectedReports, isLoading: loadingRejected } =
    useReports("rejected");

  const isLoading = loadingAll || loadingApproved || loadingRejected;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNameFilter(e.target.value);
  };

  // Filter out pending_review reports and filter by MCP server name
  const filterByName = (reports: typeof allReports) => {
    let filtered = reports?.filter(
      (report) => report.status !== "pending_review",
    );
    if (nameFilter) {
      filtered = filtered?.filter((report) =>
        report.server_name.toLowerCase().includes(nameFilter.toLowerCase()),
      );
    }
    return filtered;
  };

  const filteredAllReports = filterByName(allReports);
  const filteredApprovedReports = filterByName(approvedReports);
  const filteredRejectedReports = filterByName(rejectedReports);

  // Helper to render report list with search input
  const renderReportList = (reports: typeof allReports, statusName: string) => {
    return (
      <div>
        <Input
          label="Search by MCP server name"
          placeholder="Enter MCP server name to filter submissions"
          value={nameFilter}
          onChange={handleNameChange}
          style={{ marginBottom: "16px" }}
        />
        {!reports || reports.length === 0 ? (
          <Message state="neutral">
            {nameFilter
              ? `No ${statusName} reports found matching "${nameFilter}".`
              : statusName === "all submissions"
                ? "No submissions yet."
                : `No ${statusName} reports found.`}
          </Message>
        ) : (
          <Grid cols={1} gap="1rem">
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} showRejectionReason />
            ))}
          </Grid>
        )}
      </div>
    );
  };

  return (
    <>
      <PageHeader
        title="MCP Server Submissions"
        description="View all MCP server submissions, their approval status, and feedback"
      />

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <Icon.Spinner size="large" />
        </div>
      ) : (
        <div
          style={{
            borderRadius: "12px",
            overflow: "hidden",
            marginTop: "1.5rem",
          }}
        >
          <Tabs contentBackground="base-2">
            <Tabs.Item
              content={renderReportList(filteredAllReports, "all submissions")}
            >
              All Submissions{" "}
              <Badge state="neutral">{filteredAllReports?.length || 0}</Badge>
            </Tabs.Item>

            <Tabs.Item
              content={renderReportList(filteredApprovedReports, "approved")}
            >
              Approved{" "}
              <Badge state="success">
                {filteredApprovedReports?.length || 0}
              </Badge>
            </Tabs.Item>

            <Tabs.Item
              content={renderReportList(filteredRejectedReports, "rejected")}
            >
              Rejected{" "}
              <Badge state="alert">
                {filteredRejectedReports?.length || 0}
              </Badge>
            </Tabs.Item>
          </Tabs>
        </div>
      )}
    </>
  );
}
