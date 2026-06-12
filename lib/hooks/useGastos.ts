"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  mapGastoCreateInput,
  mapGastoRow,
  mapGastoUpdateInput,
} from "@/lib/api/mappers";
import { QUERY_KEYS, TABLES } from "@/lib/api/endpoints";
import type { GastoRow } from "@/lib/api/types";
import type {
  GastoCreateInput,
  GastoUpdateInput,
} from "@/lib/domain/models";
import { useAuth } from "@/components/auth-provider";
import { normalizeCategory } from "@/lib/categories";
import { createPublicDataError } from "@/lib/errors";
import { supabase } from "@/lib/supabase/client";

export function useGastos(faturaId?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...QUERY_KEYS.GASTOS, user?.id, faturaId],
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

  return useQuery({
    queryKey: [...QUERY_KEYS.GASTOS_DETAIL(id), user?.id],
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GASTOS });
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GASTOS });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.GASTOS_DETAIL(variables.id),
      });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GASTOS });
    },
  });
}

export function useEstatisticas(faturaId?: string | null) {
  const { data: gastos, isLoading, error } = useGastos(faturaId);

  const estatisticas = useQuery({
    queryKey: ["estatisticas", gastos],
    queryFn: () => {
      if (!gastos) {
        return {
          gastosPorCategoria: [],
          gastosPorResponsavel: [],
        };
      }

      const categoriasMap = gastos.reduce<Record<string, number>>(
        (acc, gasto) => {
          const categoria = normalizeCategory(gasto.categoria);
          acc[categoria] = (acc[categoria] || 0) + gasto.valor;
          return acc;
        },
        {}
      );

      const gastosPorCategoria = Object.entries(categoriasMap)
        .map(([categoria, valor]) => ({ categoria, valor }))
        .sort((a, b) => b.valor - a.valor);

      const responsaveisMap = gastos.reduce<Record<string, number>>(
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
        {}
      );

      const gastosPorResponsavel = Object.entries(responsaveisMap)
        .map(([responsavel, valor]) => ({ responsavel, valor }))
        .sort((a, b) => b.valor - a.valor);

      return {
        gastosPorCategoria,
        gastosPorResponsavel,
      };
    },
  });

  return {
    ...estatisticas,
    data: estatisticas.data || {
      gastosPorCategoria: [],
      gastosPorResponsavel: [],
    },
    isLoading: isLoading || estatisticas.isLoading,
    error: error || estatisticas.error,
  };
}
