// API Endpoints - Supabase table and storage names

// Tables
export const TABLES = {
  GASTOS: 'gastos',
  FATURAS: 'faturas',
  RESPONSAVEIS: 'responsaveis',
} as const;

// Storage buckets
export const STORAGE = {
  FATURAS: 'faturas',
} as const;

// Query keys for React Query (used for caching)
export const QUERY_KEYS = {
  GASTOS: ['gastos'],
  GASTOS_DETAIL: (id: string) => ['gastos', id],
  FATURAS: ['faturas'],
  FATURAS_DETAIL: (id: string) => ['faturas', id],
  PARCELAMENTOS: ['parcelamentos'],
  RESPONSAVEIS: ['responsaveis'],
  DASHBOARD: ['dashboard'],
  RELATORIOS: ['relatorios'],
} as const;
