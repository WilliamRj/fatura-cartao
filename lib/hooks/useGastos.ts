'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, TABLES } from '@/lib/api/endpoints';
import type { CreateGastoRequest, UpdateGastoRequest, ApiGasto } from '@/lib/api/types';
import { supabase } from '@/lib/supabase/client';

// Fetch all expenses
export function useGastos() {
  return useQuery({
    queryKey: QUERY_KEYS.GASTOS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.GASTOS)
        .select('*')
        .order('data', { ascending: false });
      if (error) throw error;
      return (data as unknown) as ApiGasto[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
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
      return (data as unknown) as ApiGasto;
    },
    enabled: !!id,
  });
}

// Create expense
export function useCreateGasto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (gasto: CreateGastoRequest) => {
      const { data, error } = await supabase
        .from(TABLES.GASTOS)
        .insert([gasto])
        .select()
        .single();
      if (error) throw error;
      return (data as unknown) as ApiGasto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GASTOS });
    },
  });
}

// Update expense
export function useUpdateGasto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateGastoRequest }) => {
      const { data, error } = await supabase
        .from(TABLES.GASTOS)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return (data as unknown) as ApiGasto;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GASTOS });
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GASTOS });
    },
  });
}

// Calculate statistics for charts
export function useEstatisticas() {
  const { data: gastos, isLoading, error } = useGastos();

  const estatisticas = useQuery({
    queryKey: ['estatisticas', gastos],
    queryFn: () => {
      if (!gastos) return { gastosPorCategoria: [], gastosPorResponsavel: [], evolucaoMensal: [] };

      // Gastos por Categoria
      const categoriasMap = gastos.reduce((acc, gasto) => {
        acc[gasto.categoria] = (acc[gasto.categoria] || 0) + gasto.valor;
        return acc;
      }, {} as Record<string, number>);
      
      const gastosPorCategoria = Object.entries(categoriasMap)
        .map(([categoria, valor]) => ({ categoria, valor }))
        .sort((a, b) => b.valor - a.valor);

      // Gastos por Responsavel
      const responsaveisMap = gastos.reduce((acc, gasto) => {
        acc[gasto.responsavel] = (acc[gasto.responsavel] || 0) + gasto.valor;
        return acc;
      }, {} as Record<string, number>);
      
      const gastosPorResponsavel = Object.entries(responsaveisMap)
        .map(([responsavel, valor]) => ({ responsavel, valor }))
        .sort((a, b) => b.valor - a.valor);

      // Evolucao Mensal (Simplificada para pegar meses unicos)
      const mensalMap = gastos.reduce((acc, gasto) => {
        const date = new Date(gasto.data);
        const mesAno = `${date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '')}/${date.getFullYear().toString().slice(-2)}`;
        // Transformar em CamelCase / TitleCase o mês ex: "Jan" ou "Fev"
        const mesAnoFormatado = mesAno.charAt(0).toUpperCase() + mesAno.slice(1);
        acc[mesAnoFormatado] = (acc[mesAnoFormatado] || 0) + gasto.valor;
        return acc;
      }, {} as Record<string, number>);
      
      const evolucaoMensal = Object.entries(mensalMap)
        .map(([mes, valor]) => ({ mes, valor }))
        // sort chronologically? A bit tricky with this string format, 
        // assuming standard insertion order from descending date, we just reverse it.
        .reverse();

      return {
        gastosPorCategoria,
        gastosPorResponsavel,
        evolucaoMensal
      };
    },
    enabled: !!gastos,
  });

  return {
    ...estatisticas,
    data: estatisticas.data || { gastosPorCategoria: [], gastosPorResponsavel: [], evolucaoMensal: [] },
    isLoading: isLoading || estatisticas.isLoading,
    error: error || estatisticas.error
  };
}
