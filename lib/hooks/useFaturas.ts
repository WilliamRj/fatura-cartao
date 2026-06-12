"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { mapFaturaRow } from "@/lib/api/mappers";
import { QUERY_KEYS, STORAGE, TABLES } from "@/lib/api/endpoints";
import type { DeleteFaturaResultRow, FaturaRow } from "@/lib/api/types";
import { useAuth } from "@/components/auth-provider";
import { createPublicDataError } from "@/lib/errors";
import { supabase } from "@/lib/supabase/client";

export function useFaturas() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...QUERY_KEYS.FATURAS, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.FATURAS)
        .select("*")
        .eq("user_id", user!.id)
        .order("data_importacao", { ascending: false });

      if (error) {
        throw createPublicDataError(
          error,
          "Não foi possível carregar as faturas."
        );
      }

      return (data as FaturaRow[]).map(mapFaturaRow);
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user,
  });
}

export function useDeleteFatura() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const { data, error } = await supabase.rpc(
        "delete_fatura_atomically",
        { p_fatura_id: id }
      );

      if (error) {
        if (error.code === "P0002") {
          throw new Error("A fatura não existe ou já foi excluída.");
        }

        throw createPublicDataError(
          error,
          "Não foi possível excluir a fatura."
        );
      }

      const result = data as DeleteFaturaResultRow;
      let storageCleanupFailed = false;

      if (result.arquivo_url) {
        const { error: storageError } = await supabase.storage
          .from(STORAGE.FATURAS)
          .remove([result.arquivo_url]);

        if (storageError) {
          console.error(
            "Não foi possível remover o PDF da fatura:",
            storageError
          );
          storageCleanupFailed = true;
        }
      }

      return {
        ...result,
        storageCleanupFailed,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FATURAS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GASTOS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PARCELAMENTOS });
      queryClient.invalidateQueries({ queryKey: ["estatisticas"] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RELATORIOS });

      queryClient.resetQueries({ queryKey: QUERY_KEYS.GASTOS });
      queryClient.resetQueries({ queryKey: ["estatisticas"] });
    },
  });
}
