'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, TABLES } from '@/lib/api/endpoints';
import type { ApiResponsavel, CreateResponsavelRequest } from '@/lib/api/types';
import type { Responsavel } from '@/lib/data';
import { supabase } from '@/lib/supabase/client';

export function useResponsaveis() {
  return useQuery({
    queryKey: QUERY_KEYS.RESPONSAVEIS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.RESPONSAVEIS)
        .select('*')
        .order('nome', { ascending: true });
        
      if (error) throw error;
      
      return (data as ApiResponsavel[]).map((apiR) => ({
        id: apiR.id,
        nome: apiR.nome,
        cor: apiR.cor || 'bg-primary/20',
      })) as Responsavel[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateResponsavel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (responsavel: CreateResponsavelRequest) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const payload = {
        ...responsavel,
        ...(user?.id ? { user_id: user.id } : {})
      };

      const { data, error } = await supabase
        .from(TABLES.RESPONSAVEIS)
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RESPONSAVEIS });
    },
  });
}

export function useDeleteResponsavel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(TABLES.RESPONSAVEIS)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RESPONSAVEIS });
    },
  });
}

export function useSetResponsavelPrincipal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // First, set cor to null for all responsaveis of this user
      const { error: resetError } = await supabase
        .from(TABLES.RESPONSAVEIS)
        .update({ cor: null })
        .eq('user_id', user.id);

      if (resetError) throw resetError;

      // Then, set cor to 'pessoal' for the selected one
      const { error: updateError } = await supabase
        .from(TABLES.RESPONSAVEIS)
        .update({ cor: 'pessoal' })
        .eq('id', id)
        .eq('user_id', user.id); // Add user_id check for safety

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RESPONSAVEIS });
    },
  });
}
