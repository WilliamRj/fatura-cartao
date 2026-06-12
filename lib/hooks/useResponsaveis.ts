"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  mapResponsavelCreateInput,
  mapResponsavelRow,
} from "@/lib/api/mappers";
import { QUERY_KEYS, TABLES } from "@/lib/api/endpoints";
import type { ResponsavelRow } from "@/lib/api/types";
import type { ResponsavelCreateInput } from "@/lib/domain/models";
import { useAuth } from "@/components/auth-provider";
import { createPublicDataError } from "@/lib/errors";
import { supabase } from "@/lib/supabase/client";

export function useResponsaveis() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...QUERY_KEYS.RESPONSAVEIS, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.RESPONSAVEIS)
        .select("*")
        .eq("user_id", user!.id)
        .order("nome", { ascending: true });

      if (error) {
        throw createPublicDataError(
          error,
          "Não foi possível carregar os responsáveis."
        );
      }

      return (data as ResponsavelRow[]).map(mapResponsavelRow);
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user,
  });
}

export function useCreateResponsavel() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (responsavel: ResponsavelCreateInput) => {
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const { data, error } = await supabase
        .from(TABLES.RESPONSAVEIS)
        .insert([mapResponsavelCreateInput(responsavel, user.id)])
        .select()
        .single();

      if (error) {
        throw createPublicDataError(
          error,
          "Não foi possível adicionar o responsável."
        );
      }

      return mapResponsavelRow(data as ResponsavelRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RESPONSAVEIS });
    },
  });
}

export function useDeleteResponsavel() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const { error } = await supabase
        .from(TABLES.RESPONSAVEIS)
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        throw createPublicDataError(
          error,
          "Não foi possível remover o responsável."
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RESPONSAVEIS });
    },
  });
}

export function useSetResponsavelPrincipal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const { error: resetError } = await supabase
        .from(TABLES.RESPONSAVEIS)
        .update({ cor: null })
        .eq("user_id", user.id);

      if (resetError) {
        throw createPublicDataError(
          resetError,
          "Não foi possível alterar o responsável principal."
        );
      }

      const { error: updateError } = await supabase
        .from(TABLES.RESPONSAVEIS)
        .update({ cor: "pessoal" })
        .eq("id", id)
        .eq("user_id", user.id);

      if (updateError) {
        throw createPublicDataError(
          updateError,
          "Não foi possível alterar o responsável principal."
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RESPONSAVEIS });
    },
  });
}
