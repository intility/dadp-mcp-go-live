/**
 * Status badge component for report status
 */

import { Badge } from "@intility/bifrost-react";
import type { ReportStatus } from "../types/api";

interface StatusBadgeProps {
  status: ReportStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getState = (status: ReportStatus) => {
    switch (status) {
      case "pending_review":
        return "warning" as const;
      case "approved":
        return "success" as const;
      case "rejected":
        return "alert" as const;
    }
  };

  const getLabel = (status: ReportStatus) => {
    switch (status) {
      case "pending_review":
        return "Pending Review";
      case "approved":
        return "Approved";
      case "rejected":
        return "Rejected";
    }
  };

  return <Badge state={getState(status)}>{getLabel(status)}</Badge>;
}
