import type {
  Fatura,
  Gasto,
  GastoCreateInput,
  GastoUpdateInput,
  Parcelamento,
  Responsavel,
  ResponsavelCreateInput,
} from "@/lib/domain/models";
import type {
  FaturaRow,
  GastoInsert,
  GastoRow,
  GastoUpdate,
  ResponsavelInsert,
  ResponsavelRow,
} from "@/lib/api/types";
import { normalizeCategory } from "@/lib/categories";

export function mapFaturaRow(row: FaturaRow): Fatura {
  return {
    id: row.id,
    mesReferencia: row.mes_referencia,
    valorTotal: row.valor_total,
    quantidadeLancamentos: row.quantidade_lancamentos,
    dataImportacao: row.data_importacao,
    arquivoUrl: row.arquivo_url ?? undefined,
  };
}

export function mapGastoRow(row: GastoRow): Gasto {
  return {
    id: row.id,
    data: row.data,
    estabelecimento: row.estabelecimento,
    valor: row.valor,
    categoria: normalizeCategory(row.categoria),
    responsavel: row.responsavel,
    parcela: row.parcela ?? undefined,
    observacao: row.observacao ?? undefined,
    divisoes: row.divisoes,
  };
}

export function mapResponsavelRow(row: ResponsavelRow): Responsavel {
  return {
    id: row.id,
    nome: row.nome,
    cor: row.cor ?? "bg-primary/20",
  };
}

export function mapGastoCreateInput(
  input: GastoCreateInput,
  userId: string
): GastoInsert {
  return {
    user_id: userId,
    fatura_id: input.faturaId,
    data: input.data,
    estabelecimento: input.estabelecimento,
    valor: input.valor,
    categoria: normalizeCategory(input.categoria),
    responsavel: input.responsavel,
    parcela: input.parcela,
    observacao: input.observacao,
    divisoes: input.divisoes,
  };
}

export function mapGastoUpdateInput(input: GastoUpdateInput): GastoUpdate {
  return {
    ...(input.faturaId !== undefined && { fatura_id: input.faturaId }),
    ...(input.data !== undefined && { data: input.data }),
    ...(input.estabelecimento !== undefined && {
      estabelecimento: input.estabelecimento,
    }),
    ...(input.valor !== undefined && { valor: input.valor }),
    ...(input.categoria !== undefined && {
      categoria: normalizeCategory(input.categoria),
    }),
    ...(input.responsavel !== undefined && {
      responsavel: input.responsavel,
    }),
    ...(input.parcela !== undefined && { parcela: input.parcela }),
    ...(input.observacao !== undefined && { observacao: input.observacao }),
    ...(input.divisoes !== undefined && { divisoes: input.divisoes }),
  };
}

export function mapResponsavelCreateInput(
  input: ResponsavelCreateInput,
  userId: string
): ResponsavelInsert {
  return {
    user_id: userId,
    nome: input.nome,
    cor: input.cor,
  };
}

export function mapGastoRowToParcelamento(
  row: GastoRow
): Parcelamento | null {
  if (!row.parcela) {
    return null;
  }

  const match = /^(\d+)\/(\d+)$/.exec(row.parcela.trim());
  if (!match) {
    return null;
  }

  const parcelaAtual = Number.parseInt(match[1], 10);
  const totalParcelas = Number.parseInt(match[2], 10);

  if (
    parcelaAtual < 1 ||
    totalParcelas < 1 ||
    parcelaAtual > totalParcelas
  ) {
    return null;
  }

  return {
    id: row.id,
    nome: row.estabelecimento,
    parcelaAtual,
    totalParcelas,
    valorParcela: row.valor,
    valorTotal: row.valor * totalParcelas,
    responsavel: row.responsavel,
    divisoes: row.divisoes,
  };
}
