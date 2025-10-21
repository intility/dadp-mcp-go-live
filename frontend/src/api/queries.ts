/**
 * React Query hooks for MCP Go-Live API
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReportStatus, UpdateStatusRequest } from "../types/api";
import { reportsApi } from "./client";

/**
 * Query keys for React Query
 */
export const queryKeys = {
  reports: {
    all: ["reports"] as const,
    lists: () => [...queryKeys.reports.all, "list"] as const,
    list: (status?: ReportStatus) =>
      [...queryKeys.reports.lists(), { status }] as const,
    details: () => [...queryKeys.reports.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.reports.details(), id] as const,
  },
};

/**
 * Hook to fetch all reports or filter by status
 */
export function useReports(status?: ReportStatus) {
  return useQuery({
    queryKey: queryKeys.reports.list(status),
    queryFn: () => reportsApi.list(status),
  });
}

/**
 * Hook to fetch a single report by ID
 */
export function useReport(id: string) {
  return useQuery({
    queryKey: queryKeys.reports.detail(id),
    queryFn: () => reportsApi.get(id),
    enabled: !!id,
  });
}

/**
 * Hook to submit a new report
 */
export function useSubmitReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reportsApi.submit,
    onSuccess: () => {
      // Invalidate all report lists
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.lists() });
    },
  });
}

/**
 * Hook to update report status
 */
export function useUpdateReportStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStatusRequest }) =>
      reportsApi.updateStatus(id, data),
    onSuccess: (_, variables) => {
      // Invalidate the specific report and all lists
      queryClient.invalidateQueries({
        queryKey: queryKeys.reports.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.lists() });
    },
  });
}

/**
 * Hook to approve a report
 */
export function useApproveReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      reviewedBy,
      notes,
    }: {
      id: string;
      reviewedBy: string;
      notes?: string;
    }) => reportsApi.approve(id, reviewedBy, notes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.reports.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.lists() });
    },
  });
}

/**
 * Hook to reject a report
 */
export function useRejectReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      reviewedBy,
      notes,
    }: {
      id: string;
      reviewedBy: string;
      notes: string;
    }) => reportsApi.reject(id, reviewedBy, notes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.reports.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.lists() });
    },
  });
}
