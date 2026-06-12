"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  listAccessAudit,
  listAccessUsers,
  setUserAccessStatus,
} from "@/lib/access-control";
import { queryKeys } from "@/lib/api/queryKeys";
import { useAuth } from "@/components/auth-provider";

export function useAccessUsers() {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: queryKeys.accessControl.users(),
    queryFn: () => listAccessUsers(),
    enabled: isAdmin,
    staleTime: 30_000,
  });
}

export function useAccessAudit(userId?: string) {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: queryKeys.accessControl.audit(userId ?? ""),
    queryFn: () => listAccessAudit(userId!),
    enabled: isAdmin && !!userId,
  });
}

export function useSetUserAccessStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      status,
      reason,
    }: {
      userId: string;
      status: "approved" | "rejected" | "suspended";
      reason?: string;
    }) => setUserAccessStatus(userId, status, reason),
    onSuccess: (_, variables) =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.accessControl.users(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.accessControl.audit(variables.userId),
        }),
      ]),
  });
}
