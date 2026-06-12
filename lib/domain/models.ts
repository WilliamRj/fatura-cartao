export interface DivisaoGasto {
  valor: number;
  responsavel: string;
}

export interface Responsavel {
  id: string;
  nome: string;
  cor: string;
}

export interface Categoria {
  id: string;
  nome: string;
  icone: string;
}

export interface Gasto {
  id: string;
  faturaId?: string;
  data: string;
  estabelecimento: string;
  valor: number;
  categoria: string;
  responsavel: string;
  parcela?: string;
  observacao?: string;
  divisoes?: DivisaoGasto[] | null;
}

export interface Fatura {
  id: string;
  mesReferencia: string;
  valorTotal: number;
  quantidadeLancamentos: number;
  dataImportacao: string;
  arquivoUrl?: string;
}

export interface Parcelamento {
  id: string;
  nome: string;
  parcelaAtual: number;
  totalParcelas: number;
  valorParcela: number;
  valorTotal: number;
  responsavel?: string;
  divisoes?: DivisaoGasto[] | null;
}

export interface GastoCreateInput {
  faturaId?: string;
  data: string;
  estabelecimento: string;
  valor: number;
  categoria: string;
  responsavel: string;
  parcela?: string;
  observacao?: string;
  divisoes?: DivisaoGasto[] | null;
}

export type GastoUpdateInput = Partial<GastoCreateInput>;

export interface ResponsavelCreateInput {
  nome: string;
  cor?: string;
}
