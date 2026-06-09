'use client';

import { useQuery } from '@tanstack/react-query';
import { TABLES } from '@/lib/api/endpoints';
import type { Parcelamento } from '@/lib/data';
import { supabase } from '@/lib/supabase/client';

export function useParcelamentos(faturaId?: string | null) {
  return useQuery({
    queryKey: ['parcelamentos', faturaId],
    queryFn: async () => {
      let query = supabase
        .from(TABLES.GASTOS)
        .select('*')
        .not('parcela', 'is', null);
        
      if (faturaId) {
        query = query.eq('fatura_id', faturaId);
      } else if (faturaId === null) {
        return [];
      }

      const { data, error } = await query;
        
      if (error) throw error;
      
      const parcelamentos: Parcelamento[] = [];

      for (const gasto of data) {
        if (!gasto.parcela) continue;
        
        // Extrai o formato X/Y, ex: "04/10"
        const parts = gasto.parcela.split('/');
        if (parts.length === 2) {
          const atual = parseInt(parts[0], 10);
          const total = parseInt(parts[1], 10);
          
          if (!isNaN(atual) && !isNaN(total)) {
             parcelamentos.push({
               id: gasto.id,
               nome: gasto.estabelecimento,
               parcelaAtual: atual,
               totalParcelas: total,
               valorParcela: gasto.valor,
               valorTotal: gasto.valor * total,
             });
          }
        }
      }
      
      return parcelamentos;
    },
    staleTime: 1000 * 60 * 5,
    enabled: faturaId !== null,
  });
}

