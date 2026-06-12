"use client";

import * as React from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import {
  mapGastoCreateInput,
  mapGastoRow,
  mapGastoUpdateInput,
} from "@/lib/api/mappers";
import { TABLES } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/queryKeys";
import type { GastoRow } from "@/lib/api/types";
import type {
  Gasto,
  GastoCreateInput,
  GastoUpdateInput,
} from "@/lib/domain/models";
import { useAuth } from "@/components/auth-provider";
import { normalizeCategory } from "@/lib/categories";
import { createPublicDataError } from "@/lib/errors";
import { supabase } from "@/lib/supabase/client";

export function useGastos(faturaId?: string | null) {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  return useQuery({
    queryKey: queryKeys.gastos.list(userId, faturaId ?? undefined),
    queryFn: async () => {
      let query = supabase
        .from(TABLES.GASTOS)
        .select("*")
        .eq("user_id", user!.id)
        .order("data", { ascending: false });

      if (faturaId) {
        query = query.eq("fatura_id", faturaId);
      } else if (faturaId === null) {
        return [];
      }

      const { data, error } = await query;

      if (error) {
        throw createPublicDataError(
          error,
          "Não foi possível carregar os gastos."
        );
      }

      return (data as GastoRow[]).map(mapGastoRow);
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user && faturaId !== null,
  });
}

export function useGasto(id: string) {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  return useQuery({
    queryKey: queryKeys.gastos.detail(userId, id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.GASTOS)
        .select("*")
        .eq("id", id)
        .eq("user_id", user!.id)
        .single();

      if (error) {
        throw createPublicDataError(
          error,
          "Não foi possível carregar este gasto."
        );
      }

      return mapGastoRow(data as GastoRow);
    },
    enabled: !!user && !!id,
  });
}

export function useCreateGasto() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (gasto: GastoCreateInput) => {
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const { data, error } = await supabase
        .from(TABLES.GASTOS)
        .insert([mapGastoCreateInput(gasto, user.id)])
        .select()
        .single();

      if (error) {
        throw createPublicDataError(
          error,
          "Não foi possível adicionar o gasto."
        );
      }

      return mapGastoRow(data as GastoRow);
    },
    onSuccess: (createdGasto) => {
      if (!user) {
        return;
      }

      return invalidateGastoCollections(
        queryClient,
        user.id,
        createdGasto.faturaId,
      );
    },
  });
}

export function useUpdateGasto() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: GastoUpdateInput;
    }) => {
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const { data, error } = await supabase
        .from(TABLES.GASTOS)
        .update(mapGastoUpdateInput(updates))
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) {
        throw createPublicDataError(
          error,
          "Não foi possível atualizar o gasto."
        );
      }

      return mapGastoRow(data as GastoRow);
    },
    onMutate: ({ id }) => {
      if (!user) {
        return;
      }

      return {
        previousGasto: queryClient.getQueryData<Gasto>(
          queryKeys.gastos.detail(user.id, id),
        ),
      };
    },
    onSuccess: async (updatedGasto, variables, context) => {
      if (!user) {
        return;
      }

      queryClient.setQueryData(
        queryKeys.gastos.detail(user.id, variables.id),
        updatedGasto,
      );

      const affectedFaturaIds = new Set(
        [context?.previousGasto?.faturaId, updatedGasto.faturaId].filter(
          (faturaId): faturaId is string => Boolean(faturaId),
        ),
      );

      if (affectedFaturaIds.size === 0) {
        await invalidateGastoCollections(queryClient, user.id);
        return;
      }

      await Promise.all(
        [...affectedFaturaIds].map((affectedFaturaId) =>
          invalidateGastoCollections(
            queryClient,
            user.id,
            affectedFaturaId,
          ),
        ),
      );
    },
  });
}

export function useDeleteGasto() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const { error } = await supabase
        .from(TABLES.GASTOS)
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        throw createPublicDataError(
          error,
          "Não foi possível excluir o gasto."
        );
      }
    },
    onMutate: (gastoId) => {
      if (!user) {
        return;
      }

      return {
        deletedGasto: queryClient.getQueryData<Gasto>(
          queryKeys.gastos.detail(user.id, gastoId),
        ),
      };
    },
    onSuccess: async (_, deletedGastoId, context) => {
      if (!user) {
        return;
      }

      queryClient.removeQueries({
        queryKey: queryKeys.gastos.detail(user.id, deletedGastoId),
        exact: true,
      });

      if (context?.deletedGasto?.faturaId) {
        await invalidateGastoCollections(
          queryClient,
          user.id,
          context.deletedGasto.faturaId,
        );
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.gastos.userLists(user.id),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.parcelamentos.userLists(user.id),
        }),
      ]);
    },
  });
}

export function useEstatisticas(faturaId?: string | null) {
  const { data: gastos, isLoading, error } = useGastos(faturaId);

  const estatisticas = React.useMemo(() => {
    const categoriasMap = (gastos ?? []).reduce<Record<string, number>>(
      (acc, gasto) => {
        const categoria = normalizeCategory(gasto.categoria);
        acc[categoria] = (acc[categoria] || 0) + gasto.valor;
        return acc;
      },
      {},
    );

    const gastosPorCategoria = Object.entries(categoriasMap)
      .map(([categoria, valor]) => ({ categoria, valor }))
      .sort((a, b) => b.valor - a.valor);

    const responsaveisMap = (gastos ?? []).reduce<Record<string, number>>(
      (acc, gasto) => {
        if (gasto.divisoes && gasto.divisoes.length > 0) {
          gasto.divisoes.forEach((divisao) => {
            acc[divisao.responsavel] =
              (acc[divisao.responsavel] || 0) + Number(divisao.valor);
          });
        } else {
          acc[gasto.responsavel] =
            (acc[gasto.responsavel] || 0) + gasto.valor;
        }
        return acc;
      },
      {},
    );

    const gastosPorResponsavel = Object.entries(responsaveisMap)
      .map(([responsavel, valor]) => ({ responsavel, valor }))
      .sort((a, b) => b.valor - a.valor);

    return {
      gastosPorCategoria,
      gastosPorResponsavel,
    };
  }, [gastos]);

  return {
    data: estatisticas,
    isLoading,
    error,
  };
}

async function invalidateGastoCollections(
  queryClient: QueryClient,
  userId: string,
  faturaId?: string,
) {
  const invalidations = [
    queryClient.invalidateQueries({
      queryKey: queryKeys.gastos.list(userId),
      exact: true,
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.parcelamentos.list(userId),
      exact: true,
    }),
  ];

  if (faturaId) {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: queryKeys.gastos.list(userId, faturaId),
        exact: true,
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.parcelamentos.list(userId, faturaId),
        exact: true,
      }),
    );
  }

  await Promise.all(invalidations);
}
