/**
 * Review form component for approving/rejecting reports
 */

import { Button, FieldGroup, TextArea } from "@intility/bifrost-react";
import { useState } from "react";
import type { Report } from "../types/api";

interface ReviewFormProps {
  report: Report;
  onApprove: (reviewedBy: string, notes: string) => void;
  onReject: (reviewedBy: string, notes: string) => void;
  isLoading?: boolean;
}

export function ReviewForm({
  report,
  onApprove,
  onReject,
  isLoading = false,
}: ReviewFormProps) {
  const reviewedBy = "platform@intility.no";
  const [notes, setNotes] = useState("");

  const handleApprove = () => {
    onApprove(reviewedBy, notes);
  };

  const handleReject = () => {
    if (!notes.trim()) {
      alert("Please provide rejection notes");
      return;
    }
    onReject(reviewedBy, notes);
  };

  const isPending = report.status === "pending_review";
  const isReviewed =
    report.status === "approved" || report.status === "rejected";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <FieldGroup>
        <TextArea
          label="Review Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={!isPending || isLoading}
          rows={4}
          placeholder={
            isPending
              ? "Add any notes about this review..."
              : isReviewed
                ? "This report has already been reviewed"
                : undefined
          }
        />
      </FieldGroup>

      {isReviewed && report.review_notes && (
        <div>
          <p>
            <strong>Notes:</strong> {report.review_notes}
          </p>
        </div>
      )}

      {isPending && (
        <div style={{ display: "flex", gap: "1rem" }}>
          <Button variant="filled" onClick={handleApprove} disabled={isLoading}>
            ✅ Approve
          </Button>
          <Button
            variant="filled"
            state="alert"
            onClick={handleReject}
            disabled={isLoading || !notes.trim()}
          >
            ❌ Reject
          </Button>
        </div>
      )}
    </div>
  );
}
