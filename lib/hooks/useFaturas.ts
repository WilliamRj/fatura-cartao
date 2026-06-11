'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, TABLES } from '@/lib/api/endpoints';
import type { ApiFatura } from '@/lib/api/types';
import type { Fatura } from '@/lib/data';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';

export function useFaturas() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...QUERY_KEYS.FATURAS, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.FATURAS)
        .select('*')
        .eq('user_id', user!.id)
        .order('data_importacao', { ascending: false });
      
      if (error) throw error;
      
      return (data as ApiFatura[]).map((apiFatura) => ({
        id: apiFatura.id,
        mesReferencia: apiFatura.mes_referencia,
        valorTotal: apiFatura.valor_total,
        quantidadeLançamentos: apiFatura.quantidade_lancamentos,
        dataImportacao: apiFatura.data_importacao,
      })) as Fatura[];
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
      if (!user) throw new Error('Usuário não autenticado');

      const { error: gastosError } = await supabase
        .from(TABLES.GASTOS)
        .delete()
        .eq('fatura_id', id)
        .eq('user_id', user.id);
      if (gastosError) throw gastosError;

      const { error: faturaError } = await supabase
        .from(TABLES.FATURAS)
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (faturaError) throw faturaError;
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

