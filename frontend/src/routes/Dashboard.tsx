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
  FormatDate,
  Grid,
  Icon,
  Input,
  Message,
  Table,
  Tabs,
} from "@intility/bifrost-react";
import { useEffect, useState } from "react";
import { useReports } from "../api/queries";
import PageHeader from "../components/PageHeader";
import { ReportCard } from "../components/ReportCard";
import { StatusBadge } from "../components/StatusBadge";

type ViewMode = "card" | "list";

export default function Dashboard() {
  const [nameFilter, setNameFilter] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 800);

  const { data: allReports, isLoading: loadingAll } = useReports();
  const { data: approvedReports, isLoading: loadingApproved } =
    useReports("approved");
  const { data: rejectedReports, isLoading: loadingRejected } =
    useReports("rejected");

  const isLoading = loadingAll || loadingApproved || loadingRejected;

  // Listen for window resize to update mobile state
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 800);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
              radius="s"
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
              <ReportCard key={report.id} report={report} />
            ))}
          </Grid>
        ) : (
          <Table noBorder radius="s">
            <Table.Header>
              <Table.Row>
                {isMobile && <Table.HeaderCell></Table.HeaderCell>}
                <Table.HeaderCell>Server Name</Table.HeaderCell>
                {!isMobile && <Table.HeaderCell>Developer</Table.HeaderCell>}
                {!isMobile && <Table.HeaderCell>Submitted</Table.HeaderCell>}
                {!isMobile && <Table.HeaderCell>Reviewed</Table.HeaderCell>}
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
                  limitExpandClick={isMobile}
                  content={
                    isMobile ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          paddingLeft: "16px",
                          paddingRight: "16px",
                          paddingTop: "8px",
                          paddingBottom: "8px",
                        }}
                      >
                        <div>
                          <strong style={{ marginRight: "8px" }}>
                            Developer:
                          </strong>
                          <span>{report.developer_email}</span>
                        </div>
                        <div>
                          <strong style={{ marginRight: "8px" }}>
                            Submitted:
                          </strong>
                          <FormatDate date={new Date(report.submitted_at)} />
                        </div>
                        {report.reviewed_at && (
                          <div>
                            <strong style={{ marginRight: "8px" }}>
                              Reviewed:
                            </strong>
                            <FormatDate date={new Date(report.reviewed_at)} />
                          </div>
                        )}
                      </div>
                    ) : undefined
                  }
                >
                  <Table.Cell>{report.server_name}</Table.Cell>
                  {!isMobile && (
                    <Table.Cell>{report.developer_email}</Table.Cell>
                  )}
                  {!isMobile && (
                    <Table.Cell>
                      <FormatDate date={new Date(report.submitted_at)} />
                    </Table.Cell>
                  )}
                  {!isMobile && (
                    <Table.Cell>
                      {report.reviewed_at ? (
                        <FormatDate date={new Date(report.reviewed_at)} />
                      ) : (
                        <span style={{ color: "var(--bf-color-fg-subtle)" }}>
                          —
                        </span>
                      )}
                    </Table.Cell>
                  )}
                  <Table.Cell onClick={(e) => e.stopPropagation()}>
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
