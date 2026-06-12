"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { mapFaturaRow } from "@/lib/api/mappers";
import { STORAGE, TABLES } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/queryKeys";
import type { DeleteFaturaResultRow, FaturaRow } from "@/lib/api/types";
import type { Gasto } from "@/lib/domain/models";
import { useAuth } from "@/components/auth-provider";
import { createPublicDataError } from "@/lib/errors";
import { supabase } from "@/lib/supabase/client";

export function useFaturas() {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  return useQuery({
    queryKey: queryKeys.faturas.list(userId),
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
    onSuccess: async (_, deletedFaturaId) => {
      if (!user) {
        return;
      }

      queryClient.removeQueries({
        queryKey: queryKeys.gastos.list(user.id, deletedFaturaId),
        exact: true,
      });
      queryClient.removeQueries({
        queryKey: queryKeys.parcelamentos.list(user.id, deletedFaturaId),
        exact: true,
      });
      queryClient.removeQueries({
        queryKey: queryKeys.gastos.details(user.id),
        predicate: (query) =>
          (query.state.data as Gasto | undefined)?.faturaId ===
          deletedFaturaId,
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.faturas.list(user.id),
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.gastos.list(user.id),
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.parcelamentos.list(user.id),
          exact: true,
        }),
      ]);
    },
  });
}
