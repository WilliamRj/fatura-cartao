'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, TABLES } from '@/lib/api/endpoints';
import type { ApiParcelamento } from '@/lib/api/types';
import type { Parcelamento } from '@/lib/data';
import { supabase } from '@/lib/supabase/client';

export function useParcelamentos() {
  return useQuery({
    queryKey: QUERY_KEYS.PARCELAMENTOS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.PARCELAMENTOS)
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      return (data as ApiParcelamento[]).map((apiP) => ({
        id: apiP.id,
        nome: apiP.nome,
        parcelaAtual: apiP.parcela_atual,
        totalParcelas: apiP.total_parcelas,
        valorParcela: apiP.valor_parcela,
        valorTotal: apiP.valor_total,
      })) as Parcelamento[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

