'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, STORAGE, TABLES } from '@/lib/api/endpoints';
import type { ApiFatura } from '@/lib/api/types';
import type { Fatura } from '@/lib/data';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';

interface DeleteFaturaResult {
  arquivo_url: string | null;
  gastos_removidos: number;
  parcelamentos_removidos: number;
}

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
        arquivoUrl: apiFatura.arquivo_url ?? undefined,
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

      const { data, error } = await supabase.rpc(
        'delete_fatura_atomically',
        { p_fatura_id: id },
      );

      if (error) {
        if (error.code === 'P0002') {
          throw new Error('A fatura não existe ou já foi excluída.');
        }
        throw error;
      }

      const result = data as DeleteFaturaResult;
      let storageCleanupFailed = false;

      if (result.arquivo_url) {
        const { error: storageError } = await supabase.storage
          .from(STORAGE.FATURAS)
          .remove([result.arquivo_url]);

        if (storageError) {
          console.error('Não foi possível remover o PDF da fatura:', storageError);
          storageCleanupFailed = true;
        }
      }

      return {
        ...result,
        storageCleanupFailed,
      };
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

