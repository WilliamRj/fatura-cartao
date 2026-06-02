'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { TABLES, QUERY_KEYS } from '@/lib/api/endpoints';
import type { ApiGasto, CreateGastoRequest, UpdateGastoRequest } from '@/lib/api/types';
import { gastos as defaultGastos } from '@/lib/data';

// Fetch all expenses
export function useGastos() {
  return useQuery({
    queryKey: QUERY_KEYS.GASTOS,
    queryFn: async () => {
      // For now, return mock data until Supabase is set up
      // In production, this will fetch from Supabase:
      // const { data, error } = await supabase
      //   .from(TABLES.GASTOS)
      //   .select('*')
      //   .order('data', { ascending: false });
      // if (error) throw error;
      // return data;

      return defaultGastos;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Fetch single expense
export function useGasto(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.GASTOS_DETAIL(id),
    queryFn: async () => {
      // const { data, error } = await supabase
      //   .from(TABLES.GASTOS)
      //   .select('*')
      //   .eq('id', id)
      //   .single();
      // if (error) throw error;
      // return data;

      return defaultGastos.find(g => g.id === id);
    },
    enabled: !!id,
  });
}

// Create expense
export function useCreateGasto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (gasto: CreateGastoRequest) => {
      // const { data, error } = await supabase
      //   .from(TABLES.GASTOS)
      //   .insert([gasto])
      //   .select()
      //   .single();
      // if (error) throw error;
      // return data;

      return {
        id: Math.random().toString(),
        ...gasto,
      } as ApiGasto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GASTOS });
    },
  });
}

// Update expense
export function useUpdateGasto(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: UpdateGastoRequest) => {
      // const { data, error } = await supabase
      //   .from(TABLES.GASTOS)
      //   .update(updates)
      //   .eq('id', id)
      //   .select()
      //   .single();
      // if (error) throw error;
      // return data;

      const gasto = defaultGastos.find(g => g.id === id);
      if (!gasto) throw new Error('Expense not found');
      return { ...gasto, ...updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GASTOS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GASTOS_DETAIL(id) });
    },
  });
}

// Delete expense
export function useDeleteGasto(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // const { error } = await supabase
      //   .from(TABLES.GASTOS)
      //   .delete()
      //   .eq('id', id);
      // if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GASTOS });
    },
  });
}
