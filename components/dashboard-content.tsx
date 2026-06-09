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
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/data";
import { useGastos, useEstatisticas } from "@/lib/hooks/useGastos";
import { useParcelamentos } from "@/lib/hooks/useParcelamentos";
import { useFaturas } from "@/lib/hooks/useFaturas";
import { useResponsaveis } from "@/lib/hooks/useResponsaveis";
import { useFaturaContext } from "@/components/fatura-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/loading";
import { ErrorAlert } from "@/components/error";
import {
  Receipt,
  TrendingUp,
  Users,
  ShoppingCart,
  CreditCard,
} from "lucide-react";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const CATEGORIA_COLORS: Record<string, string> = {
  Alimentacao: "hsl(var(--chart-1))",
  Transporte: "hsl(var(--chart-2))",
  Entretenimento: "hsl(var(--chart-3))",
  Compras: "hsl(var(--chart-4))",
  Assinaturas: "hsl(var(--chart-5))",
  Saude: "hsl(var(--chart-1))",
  Educacao: "hsl(var(--chart-2))",
  Outros: "hsl(var(--chart-3))",
};

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
    <Card className="bg-card border-border">
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
                  {trend.value}% vs mes anterior
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
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visao geral dos seus gastos e faturas</p>
        </div>
        <LoadingSkeleton count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visao geral dos seus gastos e faturas</p>
        </div>
        <ErrorAlert error={error as Error} onRetry={() => window.location.reload()} />
      </div>
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Visao geral dos seus gastos e faturas
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total da Fatura"
          value={formatCurrency(totalFatura)}
          subtitle={faturaAtual?.mesReferencia || "Nenhuma fatura selecionada"}
          icon={Receipt}
          trend={{ value: 27.8, positive: false }}
        />
        <StatCard
          title="Gastos Pessoais"
          value={formatCurrency(gastosPessoaisValor)}
          subtitle={nomePrincipal}
          icon={Users}
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
          subtitle="Lancamentos no mes"
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
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Evolucao Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolucaoMensal}>
                  <defs>
                    <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="hsl(var(--chart-1))"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(var(--chart-1))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="mes"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickFormatter={(value) =>
                      `R$ ${(value / 1000).toFixed(1)}k`
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
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
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorValor)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">
              Gastos por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
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
                        fill={CATEGORIA_COLORS[entry.categoria] || COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
formatter={(value: any) => [formatCurrency(value)]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => (
                      <span style={{ color: "hsl(var(--muted-foreground))" }}>
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">
            Gastos por Responsavel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gastosPorResponsavel} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickFormatter={(value) => `R$ ${value}`}
                />
                <YAxis
                  type="category"
                  dataKey="responsavel"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                  }}
                  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
formatter={(value: any) => [formatCurrency(value), "Total"]}
                />
                <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                  {gastosPorResponsavel.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
