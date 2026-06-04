'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, TABLES } from '@/lib/api/endpoints';
import type { ApiFatura } from '@/lib/api/types';
import type { Fatura } from '@/lib/data';
import { supabase } from '@/lib/supabase/client';

export function useFaturas() {
  return useQuery({
    queryKey: QUERY_KEYS.FATURAS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.FATURAS)
        .select('*')
        .order('data_importacao', { ascending: false });
      
      if (error) throw error;
      
      return (data as ApiFatura[]).map((apiFatura) => ({
        id: apiFatura.id,
        mesReferencia: apiFatura.mes_referencia,
        valorTotal: apiFatura.valor_total,
        quantidadeLancamentos: apiFatura.quantidade_lancamentos,
        dataImportacao: apiFatura.data_importacao,
      })) as Fatura[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useDeleteFatura() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(TABLES.FATURAS)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FATURAS });
    },
  });
}

