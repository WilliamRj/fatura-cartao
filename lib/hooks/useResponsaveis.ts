'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, TABLES } from '@/lib/api/endpoints';
import type { ApiResponsavel, CreateResponsavelRequest } from '@/lib/api/types';
import type { Responsavel } from '@/lib/data';
import { createPublicDataError } from '@/lib/errors';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';

export function useResponsaveis() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...QUERY_KEYS.RESPONSAVEIS, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.RESPONSAVEIS)
        .select('*')
        .eq('user_id', user!.id)
        .order('nome', { ascending: true });
        
      if (error) {
        throw createPublicDataError(
          error,
          'Não foi possível carregar os responsáveis.'
        );
      }
      
      return (data as ApiResponsavel[]).map((apiR) => ({
        id: apiR.id,
        nome: apiR.nome,
        cor: apiR.cor || 'bg-primary/20',
      })) as Responsavel[];
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user,
  });
}

export function useCreateResponsavel() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (responsavel: CreateResponsavelRequest) => {
      if (!user) throw new Error('Usuário não autenticado');

      const payload = {
        ...responsavel,
        user_id: user.id,
      };

      const { data, error } = await supabase
        .from(TABLES.RESPONSAVEIS)
        .insert([payload])
        .select()
        .single();
      if (error) {
        throw createPublicDataError(
          error,
          'Não foi possível adicionar o responsável.'
        );
      }
      return data;
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
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from(TABLES.RESPONSAVEIS)
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) {
        throw createPublicDataError(
          error,
          'Não foi possível remover o responsável.'
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
      if (!user) throw new Error('Usuário não autenticado');

      // First, set cor to null for all responsaveis of this user
      const { error: resetError } = await supabase
        .from(TABLES.RESPONSAVEIS)
        .update({ cor: null })
        .eq('user_id', user.id);

      if (resetError) {
        throw createPublicDataError(
          resetError,
          'Não foi possível alterar o responsável principal.'
        );
      }

      // Then, set cor to 'pessoal' for the selected one
      const { error: updateError } = await supabase
        .from(TABLES.RESPONSAVEIS)
        .update({ cor: 'pessoal' })
        .eq('id', id)
        .eq('user_id', user.id); // Add user_id check for safety

      if (updateError) {
        throw createPublicDataError(
          updateError,
          'Não foi possível alterar o responsável principal.'
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RESPONSAVEIS });
    },
  });
}
