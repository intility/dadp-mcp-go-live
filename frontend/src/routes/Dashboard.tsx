/**
 * Dashboard page - Overview of MCP Go-Live reports
 */

import {
  faGrid2,
  faList,
  faMagnifyingGlass,
} from "@fortawesome/pro-regular-svg-icons";
import {
  Button,
  Grid,
  Icon,
  Input,
  Message,
  Table,
  Tabs,
} from "@intility/bifrost-react";
import { useState } from "react";
import { useReports } from "../api/queries";
import PageHeader from "../components/PageHeader";
import { ReportCard } from "../components/ReportCard";
import { StatusBadge } from "../components/StatusBadge";

type ViewMode = "card" | "list";

export default function Dashboard() {
  const [nameFilter, setNameFilter] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("card");

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
        <div
          style={{
            display: "flex",
            gap: "1rem",
            marginBottom: "16px",
            alignItems: "flex-end",
          }}
        >
          <div style={{ flex: 1 }}>
            <Input
              label="Search by MCP server name"
              placeholder="Enter MCP server name to filter submissions"
              value={nameFilter}
              onChange={handleNameChange}
              icon={faMagnifyingGlass}
              iconButton
              rightIcon
            />
          </div>
          <Button.Group>
            <Button
              active={viewMode === "card"}
              onClick={() => setViewMode("card")}
              aria-label="Card view"
            >
              <Icon icon={faGrid2} />
            </Button>
            <Button
              active={viewMode === "list"}
              onClick={() => setViewMode("list")}
              aria-label="List view"
            >
              <Icon icon={faList} />
            </Button>
          </Button.Group>
        </div>
        {!reports || reports.length === 0 ? (
          <Message state="neutral">
            {nameFilter
              ? `No ${statusName} reports found matching "${nameFilter}".`
              : statusName === "all submissions"
                ? "No reviewed submissions yet."
                : `No ${statusName} reports found.`}
          </Message>
        ) : viewMode === "card" ? (
          <Grid cols={1} gap="1rem">
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} showRejectionReason />
            ))}
          </Grid>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Server Name</Table.HeaderCell>
                <Table.HeaderCell>Developer</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {reports.map((report) => (
                <Table.Row
                  key={report.id}
                  onClick={() => {
                    window.location.href = `/reports/${report.id}`;
                  }}
                >
                  <Table.Cell>{report.server_name}</Table.Cell>
                  <Table.Cell>{report.developer_email}</Table.Cell>
                  <Table.Cell>
                    <StatusBadge status={report.status} />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>
    );
  };

  return (
    <>
      <PageHeader
        title="MCP Submissions"
        description="View reviewed MCP server submissions, their approval status, and feedback"
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
              <span style={{ color: "var(--bf-color-fg-subtle)" }}>
                ({filteredAllReports?.length || 0})
              </span>
            </Tabs.Item>

            <Tabs.Item
              content={renderReportList(filteredApprovedReports, "approved")}
            >
              Approved{" "}
              <span style={{ color: "var(--bf-color-fg-success)" }}>
                ({filteredApprovedReports?.length || 0})
              </span>
            </Tabs.Item>

            <Tabs.Item
              content={renderReportList(filteredRejectedReports, "rejected")}
            >
              Rejected{" "}
              <span style={{ color: "var(--bf-color-fg-alert)" }}>
                ({filteredRejectedReports?.length || 0})
              </span>
            </Tabs.Item>
          </Tabs>
        </div>
      )}
    </>
  );
}
