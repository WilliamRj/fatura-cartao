export interface Gasto {
  id: string
  data: string
  estabelecimento: string
  valor: number
  categoria: string
  responsavel: string
  parcela?: string
  observacao?: string
}

export interface Fatura {
  id: string
  mesReferencia: string
  valorTotal: number
  quantidadeLancamentos: number
  dataImportacao: string
}

export interface Parcelamento {
  id: string
  nome: string
  parcelaAtual: number
  totalParcelas: number
  valorParcela: number
  categoria: string
}

export const categorias = [
  "Alimentacao",
  "Transporte",
  "Streaming",
  "Compras",
  "Lazer",
  "Saude",
  "Educacao",
  "Outros",
]

export const responsaveis = [
  "William",
  "Esposa",
  "Filho",
  "Mae",
  "Outro",
]

export const gastosMock: Gasto[] = [
  { id: "1", data: "2024-01-15", estabelecimento: "Samsung 09/18", valor: 194.54, categoria: "Compras", responsavel: "William", parcela: "9/18" },
  { id: "2", data: "2024-01-14", estabelecimento: "Flamengo Nacao 07/12", valor: 200.00, categoria: "Lazer", responsavel: "William", parcela: "7/12" },
  { id: "3", data: "2024-01-13", estabelecimento: "Uber", valor: 21.00, categoria: "Transporte", responsavel: "William" },
  { id: "4", data: "2024-01-12", estabelecimento: "iFood", valor: 58.90, categoria: "Alimentacao", responsavel: "Esposa" },
  { id: "5", data: "2024-01-11", estabelecimento: "Netflix", valor: 39.90, categoria: "Streaming", responsavel: "William" },
  { id: "6", data: "2024-01-10", estabelecimento: "Spotify", valor: 21.90, categoria: "Streaming", responsavel: "Filho" },
  { id: "7", data: "2024-01-09", estabelecimento: "Farmacia Drogasil", valor: 87.50, categoria: "Saude", responsavel: "Mae" },
  { id: "8", data: "2024-01-08", estabelecimento: "Posto Shell", valor: 250.00, categoria: "Transporte", responsavel: "William" },
  { id: "9", data: "2024-01-07", estabelecimento: "Supermercado Extra", valor: 423.67, categoria: "Alimentacao", responsavel: "Esposa" },
  { id: "10", data: "2024-01-06", estabelecimento: "Amazon 03/10", valor: 89.90, categoria: "Compras", responsavel: "William", parcela: "3/10" },
  { id: "11", data: "2024-01-05", estabelecimento: "Curso Udemy", valor: 27.90, categoria: "Educacao", responsavel: "Filho" },
  { id: "12", data: "2024-01-04", estabelecimento: "Cinema Cinemark", valor: 78.00, categoria: "Lazer", responsavel: "William" },
  { id: "13", data: "2024-01-03", estabelecimento: "99 Pop", valor: 15.80, categoria: "Transporte", responsavel: "Esposa" },
  { id: "14", data: "2024-01-02", estabelecimento: "Mercado Livre 05/12", valor: 156.33, categoria: "Compras", responsavel: "William", parcela: "5/12" },
  { id: "15", data: "2024-01-01", estabelecimento: "Padaria Bom Dia", valor: 32.50, categoria: "Alimentacao", responsavel: "Mae" },
]

export const faturasMock: Fatura[] = [
  { id: "1", mesReferencia: "Janeiro 2024", valorTotal: 2847.94, quantidadeLancamentos: 45, dataImportacao: "2024-01-20" },
  { id: "2", mesReferencia: "Dezembro 2023", valorTotal: 3521.87, quantidadeLancamentos: 52, dataImportacao: "2023-12-22" },
  { id: "3", mesReferencia: "Novembro 2023", valorTotal: 2156.43, quantidadeLancamentos: 38, dataImportacao: "2023-11-21" },
]

export const parcelamentosMock: Parcelamento[] = [
  { id: "1", nome: "Samsung Galaxy S23", parcelaAtual: 9, totalParcelas: 18, valorParcela: 194.54, categoria: "Compras" },
  { id: "2", nome: "Flamengo Nacao", parcelaAtual: 7, totalParcelas: 12, valorParcela: 200.00, categoria: "Lazer" },
  { id: "3", nome: "Amazon Compras", parcelaAtual: 3, totalParcelas: 10, valorParcela: 89.90, categoria: "Compras" },
  { id: "4", nome: "Mercado Livre", parcelaAtual: 5, totalParcelas: 12, valorParcela: 156.33, categoria: "Compras" },
]

export const gastosPorCategoria = [
  { categoria: "Alimentacao", valor: 514.07, fill: "var(--color-chart-1)" },
  { categoria: "Transporte", valor: 286.80, fill: "var(--color-chart-2)" },
  { categoria: "Compras", valor: 640.77, fill: "var(--color-chart-3)" },
  { categoria: "Streaming", valor: 61.80, fill: "var(--color-chart-4)" },
  { categoria: "Lazer", valor: 278.00, fill: "var(--color-chart-5)" },
]

export const gastosPorResponsavel = [
  { responsavel: "William", valor: 1208.94, fill: "var(--color-chart-1)" },
  { responsavel: "Esposa", valor: 498.37, fill: "var(--color-chart-2)" },
  { responsavel: "Filho", valor: 49.80, fill: "var(--color-chart-3)" },
  { responsavel: "Mae", valor: 120.00, fill: "var(--color-chart-4)" },
]

export const evolucaoMensal = [
  { mes: "Ago", valor: 2450.00 },
  { mes: "Set", valor: 2780.00 },
  { mes: "Out", valor: 2156.43 },
  { mes: "Nov", valor: 2890.00 },
  { mes: "Dez", valor: 3521.87 },
  { mes: "Jan", valor: 2847.94 },
]
