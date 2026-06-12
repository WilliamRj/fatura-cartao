import type { DivisaoGasto } from "@/lib/domain/models";

export interface ResponsavelRow {
  id: string;
  user_id: string;
  nome: string;
  cor: string | null;
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
