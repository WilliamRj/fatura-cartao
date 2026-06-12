"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/components/auth-provider";
import { mapImportJobRow } from "@/lib/api/mappers";
import { queryKeys } from "@/lib/api/queryKeys";
import { TABLES } from "@/lib/api/endpoints";
import type { ImportJobRow } from "@/lib/api/types";
import { createPublicDataError } from "@/lib/errors";
import { supabase } from "@/lib/supabase/client";

export function useImportJobs() {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  return useQuery({
    queryKey: queryKeys.importJobs.list(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.IMPORT_JOBS)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        throw createPublicDataError(
          error,
          "Não foi possível acompanhar as importações.",
        );
      }

      return (data as ImportJobRow[]).map(mapImportJobRow);
    },
    enabled: !!user,
    refetchInterval: (query) => {
      const hasActiveJob = query.state.data?.some(
        (job) => job.status === "queued" || job.status === "processing",
      );
      return hasActiveJob ? 2_000 : 15_000;
    },
  });
}
