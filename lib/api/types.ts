// API Types - Mirror of lib/data.ts interfaces, extended for database responses

export interface ApiResponsavel {
  id: string;
  user_id: string;
  nome: string;
  cor?: string;
  created_at?: string;
}

export interface ApiCategoria {
  id: string;
  nome: string;
  icone?: string;
}

export interface ApiGasto {
  id: string;
  user_id?: string;
  data: string;
  estabelecimento: string;
  valor: number;
  categoria: string;
  responsavel: string;
  parcela?: string;
  observacao?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApiFatura {
  id: string;
  user_id?: string;
  mes_referencia: string;
  valor_total: number;
  quantidade_lancamentos: number;
  data_importacao: string;
  arquivo_url?: string;
  created_at?: string;
}

export interface ApiParcelamento {
  id: string;
  user_id?: string;
  nome: string;
  parcela_atual: number;
  total_parcelas: number;
  valor_parcela: number;
  valor_total: number;
  categoria?: string;
  created_at?: string;
}

// Request/Response types for mutations
export interface CreateGastoRequest {
  data: string;
  estabelecimento: string;
  valor: number;
  categoria: string;
  responsavel: string;
  parcela?: string;
  observacao?: string;
}

export interface UpdateGastoRequest {
  categoria?: string;
  responsavel?: string;
  observacao?: string;
}

export interface CreateResponsavelRequest {
  nome: string;
  cor?: string;
}

export interface FileUploadResponse {
  path: string;
  fullPath: string;
}
