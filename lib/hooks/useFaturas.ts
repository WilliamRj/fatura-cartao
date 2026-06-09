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
      // Limpar todos os dados relacionados explicitamente
      await supabase.from(TABLES.GASTOS).delete().eq('fatura_id', id);
      await supabase.from(TABLES.PARCELAMENTOS).delete().eq('fatura_id', id);

      // Finalmente deletar a fatura
      const { error } = await supabase
        .from(TABLES.FATURAS)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate everything explicitly to ensure no stale cache remains
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FATURAS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GASTOS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PARCELAMENTOS });
      queryClient.invalidateQueries({ queryKey: ['estatisticas'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RELATORIOS });
      
      // Limpa queries ativas no cache para forçar zeroing total em transições
      queryClient.resetQueries({ queryKey: QUERY_KEYS.GASTOS });
      queryClient.resetQueries({ queryKey: ['estatisticas'] });
    },
  });
}

