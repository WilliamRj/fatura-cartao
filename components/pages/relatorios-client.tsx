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

export function RelatoriosClient() {
  const { faturaAtual } = useFaturaContext();
  const { data: estatisticas, isLoading: isLoadingEst, error: errorEst } = useEstatisticas(faturaAtual?.id || null);
  const { data: todasFaturas = [], isLoading: isLoadingFat, error: errorFat } = useFaturas();
  const { data: responsaveis = [] } = useResponsaveis();
  const { data: gastosAtuais = [] } = useGastos(faturaAtual?.id || null);

  const isLoading = isLoadingEst || isLoadingFat;
  const error = errorEst || errorFat;

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

  const handleExportPDF = async (responsavelId: string | "todos") => {
    if (!faturaAtual) {
      toast.error("Selecione uma fatura antes de exportar.");
      return;
    }

    const toastId = toast.loading("Gerando PDF...");

    try {
      const success = await generatePDFReport(
        faturaAtual,
        gastosAtuais,
        responsavelId,
      );

      if (success) {
        toast.success("PDF exportado com sucesso!", { id: toastId });
      } else {
        toast.error("Nao foi possivel gerar o PDF.", { id: toastId });
      }
    } catch (error: unknown) {
      console.error("Erro inesperado ao exportar PDF:", error);
      toast.error("Nao foi possivel gerar o PDF.", { id: toastId });
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
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={!faturaAtual || gastosAtuais.length === 0}
            className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Exportar PDF
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Fatura: {faturaAtual?.mesReferencia}</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => void handleExportPDF("todos")}>
              Fatura Completa (Todos)
            </DropdownMenuItem>
            {responsaveis.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Por Responsável</DropdownMenuLabel>
                {responsaveis.map((resp) => (
                  <DropdownMenuItem
                    key={resp.id}
                    onClick={() => void handleExportPDF(resp.nome)}
                  >
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
          <TabsTrigger value="mensal">Por Mês</TabsTrigger>
          <TabsTrigger value="categoria">Por Categoria</TabsTrigger>
          <TabsTrigger value="responsavel">Por Responsavel</TabsTrigger>
        </TabsList>

        <TabsContent value="mensal" className="space-y-6">
          <Card className="bg-card border-border card-hover">
            <CardHeader>
              <CardTitle className="text-foreground">
                Evolução dos Gastos Mensais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolucaoMensal}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                    />
                    <XAxis
                      dataKey="mes"
                      tick={{
                        fill: "var(--muted-foreground)",
                        fontSize: 12,
                      }}
                      axisLine={{ stroke: "var(--border)" }}
                    />
                    <YAxis
                      tick={{
                        fill: "var(--muted-foreground)",
                        fontSize: 12,
                      }}
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
                        % vs mês anterior
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
            <Card className="bg-card border-border card-hover">
              <CardHeader>
                <CardTitle className="text-foreground">
                  Distribuição por Categoria
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
                          backgroundColor: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                          color: "var(--foreground)",
                        }}
                        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
formatter={(value: any) => [formatCurrency(value)]}
                      />
                      <Legend
                        verticalAlign="bottom"
                        formatter={(value) => (
                          <span
                            style={{ color: "var(--muted-foreground)" }}
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

            <Card className="bg-card border-border card-hover">
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
            <Card className="bg-card border-border card-hover">
              <CardHeader>
                <CardTitle className="text-foreground">
                  Gastos por Responsável
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gastosPorResponsavel}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                      />
                      <XAxis
                        dataKey="responsavel"
                        tick={{
                          fill: "var(--muted-foreground)",
                          fontSize: 12,
                        }}
                        axisLine={{ stroke: "var(--border)" }}
                      />
                      <YAxis
                        tick={{
                          fill: "var(--muted-foreground)",
                          fontSize: 12,
                        }}
                        axisLine={{ stroke: "var(--border)" }}
                        tickFormatter={(value) => `R$ ${value}`}
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

            <Card className="bg-card border-border card-hover">
              <CardHeader>
                <CardTitle className="text-foreground">
                  Participação por Responsável
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
