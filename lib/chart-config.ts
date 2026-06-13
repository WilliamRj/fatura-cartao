export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
] as const;

const CATEGORY_COLOR_INDEX: Record<string, number> = {
  Alimentação: 0,
  Transporte: 1,
  Entretenimento: 2,
  Compras: 3,
  Assinaturas: 4,
  Saúde: 5,
  Educação: 6,
  Outros: 7,
  Pagamentos: 2,
  Condomínio: 5,
  Dívida: 3,
};

export function getCategoryColor(category: string, fallbackIndex = 0) {
  const colorIndex =
    CATEGORY_COLOR_INDEX[category] ?? fallbackIndex % CHART_COLORS.length;

  return CHART_COLORS[colorIndex];
}

export function getChartColor(index: number) {
  return CHART_COLORS[index % CHART_COLORS.length];
}
