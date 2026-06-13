"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { ChartDataSummary } from "@/components/chart-data-summary";
import { formatCurrency } from "@/lib/data";
import { getCategoryColor, getChartColor } from "@/lib/chart-config";
import { useGastos, useEstatisticas } from "@/lib/hooks/useGastos";
import { useParcelamentos } from "@/lib/hooks/useParcelamentos";
import { useFaturas } from "@/lib/hooks/useFaturas";
import { useResponsaveis } from "@/lib/hooks/useResponsaveis";
import { useFaturaContext } from "@/components/fatura-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/loading";
import { EmptyState, ErrorAlert } from "@/components/error";
import {
  BarChart3,
  Receipt,
  TrendingUp,
  User,
  Users,
  ShoppingCart,
  CreditCard,
  Tags,
} from "lucide-react";

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: number; positive: boolean };
}) {
  return (
    <Card className="bg-card border-border card-hover">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div
                className={`flex items-center gap-1 text-xs ${
                  trend.positive ? "text-success" : "text-destructive"
                }`}
              >
                <TrendingUp
                  className={`h-3 w-3 ${!trend.positive && "rotate-180"}`}
                />
                <span>
                  {trend.positive ? "+" : ""}
                  {trend.value}% vs mês anterior
                </span>
              </div>
            )}
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardContent() {
  const { faturaAtual } = useFaturaContext();
  const { data: gastos = [], isLoading: isLoadingGastos, error: errorGastos } = useGastos(faturaAtual?.id || null);
  const { data: parcelamentos = [], isLoading: isLoadingParcelamentos, error: errorParcelamentos } = useParcelamentos(faturaAtual?.id || null);
  const { data: estatisticas, isLoading: isLoadingEstatisticas } = useEstatisticas(faturaAtual?.id || null);
  const { data: responsaveis = [], isLoading: isLoadingResponsaveis, error: errorResponsaveis } = useResponsaveis();
  const { data: todasFaturas = [], isLoading: isLoadingFaturas, error: errorFaturas } = useFaturas();

  const isLoading = isLoadingGastos || isLoadingParcelamentos || isLoadingEstatisticas || isLoadingResponsaveis || isLoadingFaturas;
  const error = errorGastos || errorParcelamentos || errorResponsaveis || errorFaturas;

  if (isLoading) {
    return <LoadingSkeleton count={3} />;
  }

  if (error) {
    return (
      <ErrorAlert
        error={error as Error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const { gastosPorCategoria, gastosPorResponsavel } = estatisticas;

  // Calculando Evolucao Mensal baseado nas Faturas diretamente
  const evolucaoMensal = todasFaturas
    .slice()
    .reverse() // Reverse since order is descending by data_importacao, usually we want chronological
    .map(f => ({
      mes: f.mesReferencia,
      valor: f.valorTotal,
    }));

  const totalFatura = gastos.reduce((acc, g) => acc + g.valor, 0);

  // Calcula Trend da Fatura Atual em relação à anterior
  let trendData = undefined;
  if (faturaAtual && todasFaturas.length > 1) {
    // Array está ordenado por data_importacao DESC (faturas recentes primeiro)
    const currentIndex = todasFaturas.findIndex(f => f.id === faturaAtual.id);
    
    // A fatura "anterior" é a próxima no array (index + 1)
    if (currentIndex >= 0 && currentIndex < todasFaturas.length - 1) {
      const faturaAnterior = todasFaturas[currentIndex + 1];
      const valorAnterior = faturaAnterior.valorTotal;
      const valorAtual = totalFatura; // Usamos os gastos carregados para a fatura atual
      
      if (valorAnterior > 0) {
        const diff = valorAtual - valorAnterior;
        const percentage = (Math.abs(diff) / valorAnterior) * 100;
        
        // Se atual for menor que anterior -> setinha pra baixo (rotate-180 ou não, configurado no componente) e verde (positive: true)
        // Se atual for maior que anterior -> setinha pra cima e vermelho (positive: false)
        trendData = {
          value: Number(percentage.toFixed(1)),
          positive: valorAtual < valorAnterior
        };
      }
    }
  }

  const responsavelPrincipal = responsaveis.find(r => r.cor === 'pessoal');

  const nomePrincipal = responsavelPrincipal?.nome || "Não definido";

  const gastosPessoaisValor = gastosPorResponsavel
    .find((r) => r.responsavel === responsavelPrincipal?.nome)?.valor || 0;

  const gastosTerceiros = gastosPorResponsavel
    .filter((r) => r.responsavel !== responsavelPrincipal?.nome && r.valor > 0);

  const gastosTerceirosValor = gastosTerceiros.reduce((acc, r) => acc + r.valor, 0);

  const nomesTerceiros = gastosTerceiros.length > 0 
    ? gastosTerceiros.map(r => r.responsavel).join(', ') 
    : "Nenhum";

  const totalCompras = gastos.length;
  const parcelamentosAtivos = parcelamentos.length;
  const totalCategorias = gastosPorCategoria.reduce(
    (total, item) => total + item.valor,
    0,
  );
  const totalResponsaveis = gastosPorResponsavel.reduce(
    (total, item) => total + item.valor,
    0,
  );
  const monthlySummaryItems = evolucaoMensal.slice(-6).map((item) => ({
    color: "var(--chart-2)",
    label: item.mes,
    value: item.valor,
  }));
  const categorySummaryItems = gastosPorCategoria.map((item, index) => ({
    color: getCategoryColor(item.categoria, index),
    label: item.categoria,
    value: item.valor,
  }));
  const responsibleSummaryItems = gastosPorResponsavel.map((item, index) => ({
    color: getChartColor(index),
    label: item.responsavel,
    value: item.valor,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total da Fatura"
          value={formatCurrency(totalFatura)}
          subtitle={faturaAtual?.mesReferencia || "Nenhuma fatura selecionada"}
          icon={Receipt}
          trend={trendData}
        />
        <StatCard
          title="Gastos Pessoais"
          value={formatCurrency(gastosPessoaisValor)}
          subtitle={nomePrincipal}
          icon={User}
        />
        <StatCard
          title="Gastos de Terceiros"
          value={formatCurrency(gastosTerceirosValor)}
          subtitle={nomesTerceiros}
          icon={Users}
        />
        <StatCard
          title="Total de Compras"
          value={totalCompras.toString()}
          subtitle="Lançamentos no mês"
          icon={ShoppingCart}
        />
        <StatCard
          title="Parcelamentos"
          value={parcelamentosAtivos.toString()}
          subtitle="Ativos"
          icon={CreditCard}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card border-border card-hover">
          <CardHeader>
            <CardTitle className="text-foreground">Evolução Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            {evolucaoMensal.length > 0 ? (
              <>
                <div aria-hidden="true" className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolucaoMensal}>
                  <defs>
                    <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--chart-2)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--chart-2)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                  />
                  <XAxis
                    dataKey="mes"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                    axisLine={{ stroke: "var(--border)" }}
                  />
                  <YAxis
                    tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickFormatter={(value) =>
                      `R$ ${(value / 1000).toFixed(1)}k`
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      color: "var(--foreground)",
                    }}
                    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
formatter={(value: any) => [
                      formatCurrency(value),
                      "Total",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="valor"
                    stroke="var(--chart-2)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorValor)"
                    dot={{ fill: "var(--card)", strokeWidth: 3, r: 4 }}
                  />
                </AreaChart>
                  </ResponsiveContainer>
                </div>
                <ChartDataSummary
                  description="Valores das últimas faturas, em ordem cronológica. O gráfico mostra a tendência e a lista informa os valores exatos."
                  items={monthlySummaryItems}
                  showPercentage={false}
                />
              </>
            ) : (
              <EmptyState
                icon={BarChart3}
                title="Ainda não há evolução mensal"
                description="Importe uma fatura para iniciar o histórico de gastos."
              />
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border card-hover">
          <CardHeader>
            <CardTitle className="text-foreground">
              Gastos por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {gastosPorCategoria.length > 0 ? (
              <>
                <div aria-hidden="true" className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gastosPorCategoria}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="valor"
                    nameKey="categoria"
                  >
                    {gastosPorCategoria.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getCategoryColor(entry.categoria, index)}
                        stroke="var(--card)"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      color: "var(--foreground)",
                    }}
                    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
formatter={(value: any) => [formatCurrency(value)]}
                  />
                </PieChart>
                  </ResponsiveContainer>
                </div>
                <ChartDataSummary
                  description="Distribuição da fatura por categoria, com valor e participação no total."
                  items={categorySummaryItems}
                  total={totalCategorias}
                />
              </>
            ) : (
              <EmptyState
                icon={Tags}
                title="Sem gastos por categoria"
                description="Os valores por categoria aparecerão quando a fatura selecionada tiver lançamentos."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border card-hover">
        <CardHeader>
          <CardTitle className="text-foreground">
            Gastos por Responsável
          </CardTitle>
        </CardHeader>
        <CardContent>
          {gastosPorResponsavel.length > 0 ? (
            <>
              <div aria-hidden="true" className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gastosPorResponsavel} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickFormatter={(value) => `R$ ${value}`}
                />
                <YAxis
                  type="category"
                  dataKey="responsavel"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  axisLine={{ stroke: "var(--border)" }}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    color: "var(--foreground)",
                  }}
                  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
formatter={(value: any) => [formatCurrency(value), "Total"]}
                />
                <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                  {gastosPorResponsavel.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getChartColor(index)}
                    />
                  ))}
                </Bar>
              </BarChart>
                </ResponsiveContainer>
              </div>
              <ChartDataSummary
                description="Participação de cada responsável nos gastos da fatura selecionada."
                items={responsibleSummaryItems}
                total={totalResponsaveis}
              />
            </>
          ) : (
            <EmptyState
              icon={Users}
              title="Sem gastos por responsável"
              description="Atribua os lançamentos para visualizar a participação de cada pessoa."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
