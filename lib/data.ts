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
  data: string;
  estabelecimento: string;
  valor: number;
  categoria: string;
  responsavel: string;
  parcela?: string;
  observacao?: string;
  divisoes?: { valor: number; responsavel: string }[] | null;
}

export interface Fatura {
  id: string;
  mesReferencia: string;
  valorTotal: number;
  quantidadeLancamentos: number;
  dataImportacao: string;
}

export interface Parcelamento {
  id: string;
  nome: string;
  parcelaAtual: number;
  totalParcelas: number;
  valorParcela: number;
  valorTotal: number;
}

export const responsaveis: Responsavel[] = [
  { id: "1", nome: "William", cor: "bg-chart-1" },
  { id: "2", nome: "Esposa", cor: "bg-chart-2" },
  { id: "3", nome: "Filho", cor: "bg-chart-3" },
  { id: "4", nome: "Mae", cor: "bg-chart-4" },
  { id: "5", nome: "Outro", cor: "bg-chart-5" },
];

export const categorias: Categoria[] = [
  { id: "1", nome: "Alimentacao", icone: "utensils" },
  { id: "2", nome: "Transporte", icone: "car" },
  { id: "3", nome: "Entretenimento", icone: "gamepad-2" },
  { id: "4", nome: "Compras", icone: "shopping-bag" },
  { id: "5", nome: "Assinaturas", icone: "tv" },
  { id: "6", nome: "Saude", icone: "heart-pulse" },
  { id: "7", nome: "Educacao", icone: "graduation-cap" },
  { id: "8", nome: "Pagamentos", icone: "credit-card" },
  { id: "9", nome: "Condomínio", icone: "building" },
  { id: "10", nome: "Dívida", icone: "landmark" },
  { id: "11", nome: "Outros", icone: "more-horizontal" },
];

export const gastos: Gasto[] = [
  { id: "1", data: "2024-01-05", estabelecimento: "Samsung 09/18", valor: 194.54, categoria: "Compras", responsavel: "William", parcela: "9/18" },
  { id: "2", data: "2024-01-06", estabelecimento: "Flamengo Nacao 07/12", valor: 200.00, categoria: "Entretenimento", responsavel: "William", parcela: "7/12" },
  { id: "3", data: "2024-01-07", estabelecimento: "Uber", valor: 21.00, categoria: "Transporte", responsavel: "Esposa" },
  { id: "4", data: "2024-01-08", estabelecimento: "iFood", valor: 58.90, categoria: "Alimentacao", responsavel: "Filho" },
  { id: "5", data: "2024-01-09", estabelecimento: "Netflix", valor: 39.90, categoria: "Assinaturas", responsavel: "William" },
  { id: "6", data: "2024-01-10", estabelecimento: "Farmacia Drogasil", valor: 87.50, categoria: "Saude", responsavel: "Mae" },
  { id: "7", data: "2024-01-11", estabelecimento: "Posto Shell", valor: 250.00, categoria: "Transporte", responsavel: "William" },
  { id: "8", data: "2024-01-12", estabelecimento: "Supermercado Extra", valor: 456.78, categoria: "Alimentacao", responsavel: "Esposa" },
  { id: "9", data: "2024-01-13", estabelecimento: "Spotify", valor: 21.90, categoria: "Assinaturas", responsavel: "Filho" },
  { id: "10", data: "2024-01-14", estabelecimento: "Amazon Prime", valor: 14.90, categoria: "Assinaturas", responsavel: "William" },
  { id: "11", data: "2024-01-15", estabelecimento: "Lojas Americanas", valor: 89.90, categoria: "Compras", responsavel: "Esposa" },
  { id: "12", data: "2024-01-16", estabelecimento: "99 Pop", valor: 18.50, categoria: "Transporte", responsavel: "Filho" },
  { id: "13", data: "2024-01-17", estabelecimento: "Padaria Pao Quente", valor: 32.40, categoria: "Alimentacao", responsavel: "Mae" },
  { id: "14", data: "2024-01-18", estabelecimento: "Cinema Cinemark", valor: 75.00, categoria: "Entretenimento", responsavel: "Filho" },
  { id: "15", data: "2024-01-19", estabelecimento: "Curso Udemy", valor: 27.90, categoria: "Educacao", responsavel: "William" },
  { id: "16", data: "2024-01-20", estabelecimento: "Magazine Luiza 03/10", valor: 159.90, categoria: "Compras", responsavel: "Esposa", parcela: "3/10" },
  { id: "17", data: "2024-01-21", estabelecimento: "Restaurante Outback", valor: 187.00, categoria: "Alimentacao", responsavel: "William" },
  { id: "18", data: "2024-01-22", estabelecimento: "Academia Smart Fit", valor: 99.90, categoria: "Saude", responsavel: "William" },
  { id: "19", data: "2024-01-23", estabelecimento: "Pet Shop", valor: 145.00, categoria: "Outros", responsavel: "Esposa" },
  { id: "20", data: "2024-01-24", estabelecimento: "Mercado Livre 05/12", valor: 83.25, categoria: "Compras", responsavel: "Filho", parcela: "5/12" },
];

export const faturas: Fatura[] = [
  { id: "1", mesReferencia: "Janeiro 2024", valorTotal: 3264.27, quantidadeLancamentos: 20, dataImportacao: "2024-01-25" },
  { id: "2", mesReferencia: "Dezembro 2023", valorTotal: 4521.89, quantidadeLancamentos: 28, dataImportacao: "2023-12-26" },
  { id: "3", mesReferencia: "Novembro 2023", valorTotal: 2987.45, quantidadeLancamentos: 22, dataImportacao: "2023-11-25" },
];

export const parcelamentos: Parcelamento[] = [
  { id: "1", nome: "Samsung Galaxy S23", parcelaAtual: 9, totalParcelas: 18, valorParcela: 194.54, valorTotal: 3501.72 },
  { id: "2", nome: "Flamengo Nacao", parcelaAtual: 7, totalParcelas: 12, valorParcela: 200.00, valorTotal: 2400.00 },
  { id: "3", nome: "Magazine Luiza - TV", parcelaAtual: 3, totalParcelas: 10, valorParcela: 159.90, valorTotal: 1599.00 },
  { id: "4", nome: "Mercado Livre - Fone", parcelaAtual: 5, totalParcelas: 12, valorParcela: 83.25, valorTotal: 999.00 },
];

export const gastosPorCategoria = [
  { categoria: "Alimentacao", valor: 735.08, cor: "var(--chart-1)" },
  { categoria: "Transporte", valor: 289.50, cor: "var(--chart-2)" },
  { categoria: "Compras", valor: 527.59, cor: "var(--chart-3)" },
  { categoria: "Assinaturas", valor: 76.70, cor: "var(--chart-4)" },
  { categoria: "Entretenimento", valor: 275.00, cor: "var(--chart-5)" },
  { categoria: "Saude", valor: 187.40, cor: "var(--chart-1)" },
  { categoria: "Educacao", valor: 27.90, cor: "var(--chart-2)" },
  { categoria: "Outros", valor: 145.00, cor: "var(--chart-3)" },
];

export const gastosPorResponsavel = [
  { responsavel: "William", valor: 1285.58, cor: "var(--chart-1)" },
  { responsavel: "Esposa", valor: 891.58, cor: "var(--chart-2)" },
  { responsavel: "Filho", valor: 276.55, cor: "var(--chart-3)" },
  { responsavel: "Mae", valor: 119.90, cor: "var(--chart-4)" },
];

export const evolucaoMensal = [
  { mes: "Ago", valor: 2850 },
  { mes: "Set", valor: 3120 },
  { mes: "Out", valor: 2980 },
  { mes: "Nov", valor: 2987 },
  { mes: "Dez", valor: 4521 },
  { mes: "Jan", valor: 3264 },
];

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("pt-BR");
}
