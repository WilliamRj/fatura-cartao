import type { DivisaoGasto } from "@/lib/domain/models";

export interface ResponsavelRow {
  id: string;
  user_id: string;
  nome: string;
  cor: string | null;
  is_owner: boolean;
  created_at?: string;
}

export interface GastoRow {
  id: string;
  user_id: string;
  fatura_id: string | null;
  data: string;
  estabelecimento: string;
  valor: number;
  categoria: string;
  responsavel: string;
  parcela: string | null;
  observacao: string | null;
  divisoes: DivisaoGasto[] | null;
  created_at?: string;
  updated_at?: string;
}

export interface FaturaRow {
  id: string;
  user_id: string;
  mes_referencia: string;
  valor_total: number;
  quantidade_lancamentos: number;
  data_importacao: string;
  arquivo_url: string | null;
  arquivo_hash: string | null;
  created_at?: string;
}

export interface GastoInsert {
  user_id: string;
  fatura_id?: string;
  data: string;
  estabelecimento: string;
  valor: number;
  categoria: string;
  responsavel: string;
  parcela?: string;
  observacao?: string;
  divisoes?: DivisaoGasto[] | null;
}

export type GastoUpdate = Partial<Omit<GastoInsert, "user_id">>;

export interface ResponsavelInsert {
  user_id: string;
  nome: string;
  cor?: string;
}

export interface DeleteFaturaResultRow {
  arquivo_url: string | null;
  gastos_removidos: number;
  parcelamentos_removidos: number;
}

export interface ImportJobRow {
  id: string;
  user_id: string;
  request_id: string;
  file_name: string;
  file_size: number;
  file_hash: string;
  pdf_path: string;
  status: "queued" | "processing" | "success" | "duplicate" | "error";
  stage: string;
  progress: number;
  error_message: string | null;
  fatura_id: string | null;
  duration_ms: number | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
}
