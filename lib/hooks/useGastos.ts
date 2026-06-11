'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, TABLES } from '@/lib/api/endpoints';
import type { CreateGastoRequest, UpdateGastoRequest, ApiGasto } from '@/lib/api/types';
import { supabase } from '@/lib/supabase/client';
import { normalizeCategory } from '@/lib/categories';

// Fetch all expenses, optionally filtered by fatura_id
export function useGastos(faturaId?: string | null) {
  return useQuery({
    queryKey: ['gastos', faturaId],
    queryFn: async () => {
      let query = supabase
        .from(TABLES.GASTOS)
        .select('*')
        .order('data', { ascending: false });
        
      if (faturaId) {
        query = query.eq('fatura_id', faturaId);
      } else if (faturaId === null) {
        // If faturaId is explicitly null, maybe we don't fetch or we fetch none.
        // For now, let's fetch all if it's undefined, or return empty if null?
        // Let's assume if null, it means "no fatura selected yet", returning empty.
        return [];
      }

      const { data, error } = await query;
      if (error) throw error;
      return ((data as unknown) as ApiGasto[]).map((apiGasto) => ({
        id: apiGasto.id,
        data: apiGasto.data,
        estabelecimento: apiGasto.estabelecimento,
        valor: apiGasto.valor,
        categoria: normalizeCategory(apiGasto.categoria),
        responsavel: apiGasto.responsavel,
        parcela: apiGasto.parcela,
        observacao: apiGasto.observacao,
        divisoes: apiGasto.divisoes,
      }));
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: faturaId !== null, // Only run if faturaId is provided or undefined (not null)
  });
}

// Fetch single expense
export function useGasto(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.GASTOS_DETAIL(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.GASTOS)
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      const gasto = (data as unknown) as ApiGasto;
      return {
        ...gasto,
        categoria: normalizeCategory(gasto.categoria),
      };
    },
    enabled: !!id,
  });
}

// Create expense
export function useCreateGasto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (gasto: CreateGastoRequest) => {
      const payload = {
        ...gasto,
        categoria: normalizeCategory(gasto.categoria),
      };
      const { data, error } = await supabase
        .from(TABLES.GASTOS)
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return (data as unknown) as ApiGasto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gastos'] });
    },
  });
}

// Update expense
export function useUpdateGasto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateGastoRequest }) => {
      const payload = updates.categoria
        ? { ...updates, categoria: normalizeCategory(updates.categoria) }
        : updates;
      const { data, error } = await supabase
        .from(TABLES.GASTOS)
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return (data as unknown) as ApiGasto;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gastos'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GASTOS_DETAIL(variables.id) });
    },
  });
}

// Delete expense
export function useDeleteGasto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(TABLES.GASTOS)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gastos'] });
    },
  });
}

// Calculate statistics for charts
export function useEstatisticas(faturaId?: string | null) {
  const { data: gastos, isLoading, error } = useGastos(faturaId);

  const estatisticas = useQuery({
    queryKey: ['estatisticas', gastos],
    queryFn: () => {
      if (!gastos) return { gastosPorCategoria: [], gastosPorResponsavel: [], evolucaoMensal: [] };

      // Gastos por Categoria
      const categoriasMap = gastos.reduce((acc, gasto) => {
        const categoria = normalizeCategory(gasto.categoria);
        acc[categoria] = (acc[categoria] || 0) + gasto.valor;
        return acc;
      }, {} as Record<string, number>);
      
      const gastosPorCategoria = Object.entries(categoriasMap)
        .map(([categoria, valor]) => ({ categoria, valor }))
        .sort((a, b) => b.valor - a.valor);

      // Gastos por Responsavel
      const responsaveisMap = gastos.reduce((acc, gasto) => {
        if (gasto.divisoes && gasto.divisoes.length > 0) {
          gasto.divisoes.forEach((div) => {
            acc[div.responsavel] = (acc[div.responsavel] || 0) + Number(div.valor);
          });
        } else {
          acc[gasto.responsavel] = (acc[gasto.responsavel] || 0) + gasto.valor;
        }
        return acc;
      }, {} as Record<string, number>);
      const gastosPorResponsavel = Object.entries(responsaveisMap)
        .map(([responsavel, valor]) => ({ responsavel, valor }))
        .sort((a, b) => b.valor - a.valor);

      return {
        gastosPorCategoria,
        gastosPorResponsavel
      };
    },
  });

  return {
    ...estatisticas,
    data: estatisticas.data || { gastosPorCategoria: [], gastosPorResponsavel: [] },
    isLoading: isLoading || estatisticas.isLoading,
    error: error || estatisticas.error
  };
}
