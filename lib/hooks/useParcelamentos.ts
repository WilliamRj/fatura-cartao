"use client";

import { useQuery } from "@tanstack/react-query";

import { mapGastoRowToParcelamento } from "@/lib/api/mappers";
import { TABLES } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/queryKeys";
import type { GastoRow } from "@/lib/api/types";
import { useAuth } from "@/components/auth-provider";
import { createPublicDataError } from "@/lib/errors";
import { supabase } from "@/lib/supabase/client";

export function useParcelamentos(faturaId?: string | null) {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  return useQuery({
    queryKey: queryKeys.parcelamentos.list(userId, faturaId ?? undefined),
    queryFn: async () => {
      let query = supabase
        .from(TABLES.GASTOS)
        .select("*")
        .eq("user_id", user!.id)
        .not("parcela", "is", null);

      if (faturaId) {
        query = query.eq("fatura_id", faturaId);
      } else if (faturaId === null) {
        return [];
      }

      const { data, error } = await query;

      if (error) {
        throw createPublicDataError(
          error,
          "Não foi possível carregar os parcelamentos."
        );
      }

      return (data as GastoRow[])
        .map(mapGastoRowToParcelamento)
        .filter((parcelamento) => parcelamento !== null);
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user && faturaId !== null,
  });
}
