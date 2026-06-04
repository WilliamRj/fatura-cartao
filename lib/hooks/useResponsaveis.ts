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
      const { data, error } = await supabase
        .from(TABLES.RESPONSAVEIS)
        .insert([responsavel])
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
