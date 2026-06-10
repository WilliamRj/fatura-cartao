"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/data";
import { useEstatisticas, useGastos } from "@/lib/hooks/useGastos";
import { useFaturas } from "@/lib/hooks/useFaturas";
import { useResponsaveis } from "@/lib/hooks/useResponsaveis";
import { useFaturaContext } from "@/components/fatura-provider";
import { LoadingSkeleton } from "@/components/loading";
import { ErrorAlert } from "@/components/error";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";
import { generatePDFReport } from "@/lib/utils/pdfExport";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
];

const CATEGORIA_COLORS: Record<string, string> = {
  Alimentacao: "var(--chart-1)",
  Transporte: "var(--chart-2)",
  Entretenimento: "var(--chart-3)",
  Compras: "var(--chart-4)",
  Assinaturas: "var(--chart-5)",
  Saude: "var(--chart-6)",
  Educacao: "var(--chart-7)",
  Pagamentos: "var(--chart-9)",
  Condomínio: "var(--chart-10)",
  Dívida: "var(--chart-11)",
  Outros: "var(--chart-8)",
};

export default function RelatoriosPage() {
  const { faturaAtual } = useFaturaContext();
  const { data: estatisticas, isLoading: isLoadingEst, error: errorEst } = useEstatisticas(faturaAtual?.id || null);
  const { data: todasFaturas = [], isLoading: isLoadingFat, error: errorFat } = useFaturas();
  const { data: responsaveis = [] } = useResponsaveis();
  const { data: gastosAtuais = [] } = useGastos(faturaAtual?.id || null);

  const isLoading = isLoadingEst || isLoadingFat;
  const error = errorEst || errorFat;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatorios</h1>
          <p className="text-muted-foreground">Analise detalhada dos seus gastos</p>
        </div>
        <LoadingSkeleton count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatorios</h1>
          <p className="text-muted-foreground">Analise detalhada dos seus gastos</p>
        </div>
        <ErrorAlert error={error as Error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const handleExportPDF = async (responsavelId: string | 'todos') => {
    toast.info("Gerando PDF, aguarde...");
    const success = await generatePDFReport(faturaAtual, gastosAtuais, responsavelId);
    if (success) {
      toast.success("PDF exportado com sucesso!");
    } else {
      toast.error("Erro ao gerar PDF.");
    }
  };

  const { gastosPorCategoria, gastosPorResponsavel } = estatisticas;

  // Calculando Evolucao Mensal baseado nas Faturas diretamente (em ordem cronológica)
  const evolucaoMensal = todasFaturas
    .slice()
    .reverse() 
    .map(f => ({
      mes: f.mesReferencia,
      valor: f.valorTotal,
    }));

  const totalGeral = gastosPorCategoria.reduce((acc, g) => acc + g.valor, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">
            Análise detalhada dos seus gastos
          </p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
            <Download className="h-4 w-4" />
            Exportar PDF
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Fatura: {faturaAtual?.mesReferencia}</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleExportPDF('todos')}>
              Fatura Completa (Todos)
            </DropdownMenuItem>
            {responsaveis.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Por Responsável</DropdownMenuLabel>
                {responsaveis.map((resp) => (
                  <DropdownMenuItem key={resp.id} onClick={() => handleExportPDF(resp.nome)}>
                    {resp.nome}
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tabs defaultValue="mensal" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="mensal">Por Mes</TabsTrigger>
          <TabsTrigger value="categoria">Por Categoria</TabsTrigger>
          <TabsTrigger value="responsavel">Por Responsavel</TabsTrigger>
        </TabsList>

        <TabsContent value="mensal" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">
                Evolucao dos Gastos Mensais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolucaoMensal}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="mes"
                      tick={{
                        fill: "hsl(var(--muted-foreground))",
                        fontSize: 12,
                      }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                    />
                    <YAxis
                      tick={{
                        fill: "hsl(var(--muted-foreground))",
                        fontSize: 12,
                      }}
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
                    <Line
                      type="monotone"
                      dataKey="valor"
                      stroke="var(--chart-1)"
                      strokeWidth={3}
                      dot={{ fill: "var(--chart-1)", strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            {evolucaoMensal.slice(-3).map((mes, index) => (
              <Card key={mes.mes} className="bg-card border-border">
                <CardContent className="p-6">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{mes.mes}</p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(mes.valor)}
                    </p>
                    {index > 0 && (
                      <p
                        className={`text-xs ${
                          mes.valor > evolucaoMensal[evolucaoMensal.length - 3 + index - 1].valor
                            ? "text-destructive"
                            : "text-success"
                        }`}
                      >
                        {mes.valor > evolucaoMensal[evolucaoMensal.length - 3 + index - 1].valor
                          ? "+"
                          : ""}
                        {(
                          ((mes.valor - evolucaoMensal[evolucaoMensal.length - 3 + index - 1].valor) /
                            evolucaoMensal[evolucaoMensal.length - 3 + index - 1].valor) *
                          100
                        ).toFixed(1)}
                        % vs mes anterior
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="categoria" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">
                  Distribuicao por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={gastosPorCategoria}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={140}
                        paddingAngle={2}
                        dataKey="valor"
                        nameKey="categoria"
                      >
                        {gastosPorCategoria.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
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
                        formatter={(value) => (
                          <span
                            style={{ color: "hsl(var(--muted-foreground))" }}
                          >
                            {value}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">
                  Detalhamento por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {gastosPorCategoria.map((cat, index) => {
                    const percentage = (cat.valor / totalGeral) * 100;
                    return (
                      <div key={cat.categoria} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{
                                backgroundColor: COLORS[index % COLORS.length],
                              }}
                            />
                            <span className="text-sm text-foreground">
                              {cat.categoria}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-foreground">
                              {formatCurrency(cat.valor)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {percentage.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="responsavel" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">
                  Gastos por Responsavel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gastosPorResponsavel}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="responsavel"
                        tick={{
                          fill: "hsl(var(--muted-foreground))",
                          fontSize: 12,
                        }}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                      />
                      <YAxis
                        tick={{
                          fill: "hsl(var(--muted-foreground))",
                          fontSize: 12,
                        }}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                        tickFormatter={(value) => `R$ ${value}`}
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
                      <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
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

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">
                  Participacao por Responsavel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {gastosPorResponsavel.map((resp, index) => {
                    const totalResp = gastosPorResponsavel.reduce(
                      (acc, r) => acc + r.valor,
                      0
                    );
                    const percentage = (resp.valor / totalResp) * 100;
                    return (
                      <div key={resp.responsavel} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold"
                              style={{
                                backgroundColor: COLORS[index % COLORS.length],
                              }}
                            >
                              {resp.responsavel.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {resp.responsavel}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {percentage.toFixed(1)}% do total
                              </p>
                            </div>
                          </div>
                          <p className="text-lg font-bold text-foreground">
                            {formatCurrency(resp.valor)}
                          </p>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
