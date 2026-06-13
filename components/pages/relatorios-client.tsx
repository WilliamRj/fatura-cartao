"use client";

import * as React from "react";
import Link from "next/link";
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
  LineChart,
  Line,
} from "recharts";
import { ChartDataSummary } from "@/components/chart-data-summary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/data";
import { useEstatisticas, useGastos } from "@/lib/hooks/useGastos";
import { useFaturas } from "@/lib/hooks/useFaturas";
import { useResponsaveis } from "@/lib/hooks/useResponsaveis";
import { useFaturaContext } from "@/components/fatura-provider";
import { LoadingSkeleton } from "@/components/loading";
import { EmptyState, ErrorAlert } from "@/components/error";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BarChart3,
  Download,
  FileUp,
  PieChartIcon,
  Receipt,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCategoryColor, getChartColor } from "@/lib/chart-config";
import {
  generatePDFReport,
  type ReportScope,
} from "@/lib/utils/pdfExport";

export function RelatoriosClient() {
  const [isExporting, setIsExporting] = React.useState(false);
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

  const handleExportPDF = async (scope: ReportScope) => {
    if (!faturaAtual) {
      toast.error("Selecione uma fatura antes de exportar.");
      return;
    }

    if (isExporting) return;
    setIsExporting(true);
    const toastId = toast.loading("Gerando PDF...");

    try {
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });
      await generatePDFReport(faturaAtual, gastosAtuais, scope);
      toast.success("PDF exportado com sucesso!", { id: toastId });
    } catch (error: unknown) {
      console.error("Erro inesperado ao exportar PDF:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível gerar o PDF.",
        { id: toastId },
      );
    } finally {
      setIsExporting(false);
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
  const hasMonthlyData = evolucaoMensal.length > 0;
  const hasCategoryData = gastosPorCategoria.length > 0 && totalGeral !== 0;
  const totalResponsaveis = gastosPorResponsavel.reduce(
    (total, item) => total + item.valor,
    0,
  );
  const hasResponsibleData =
    gastosPorResponsavel.length > 0 && totalResponsaveis !== 0;
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

  const importAction = (
    <Button render={<Link href="/faturas" />}>
      <FileUp />
      Importar fatura
    </Button>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={!faturaAtual || gastosAtuais.length === 0 || isExporting}
            className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Gerando PDF..." : "Exportar PDF"}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Fatura: {faturaAtual?.mesReferencia}</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => void handleExportPDF({ type: "all" })}
            >
              Fatura Completa (Todos)
            </DropdownMenuItem>
            {responsaveis.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Por Responsável</DropdownMenuLabel>
                {responsaveis.map((resp) => (
                  <DropdownMenuItem
                    key={resp.id}
                    onClick={() =>
                      void handleExportPDF({
                        type: "responsible",
                        id: resp.id,
                        name: resp.nome,
                      })
                    }
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
          <TabsTrigger value="responsavel">Por Responsável</TabsTrigger>
        </TabsList>

        <TabsContent value="mensal" className="space-y-6">
          <Card className="card-static border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">
                Evolução dos Gastos Mensais
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hasMonthlyData ? (
                <>
                  <div aria-hidden="true" className="h-[400px]">
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
                      stroke="var(--chart-2)"
                      strokeWidth={3}
                      dot={{
                        fill: "var(--card)",
                        stroke: "var(--chart-2)",
                        strokeWidth: 3,
                      }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <ChartDataSummary
                    description="Últimas faturas em ordem cronológica. Os valores abaixo oferecem a mesma informação sem depender da leitura visual da linha."
                    items={monthlySummaryItems}
                    showPercentage={false}
                  />
                </>
              ) : (
                <EmptyState
                  icon={BarChart3}
                  title="Ainda não há histórico mensal"
                  description="Importe uma fatura para iniciar a evolução dos gastos ao longo dos meses."
                  action={importAction}
                />
              )}
            </CardContent>
          </Card>

          {hasMonthlyData && <div className="grid gap-4 md:grid-cols-3">
            {evolucaoMensal.slice(-3).map((mes, index) => (
              <Card key={mes.mes} className="card-static border-border bg-card" size="sm">
                <CardContent className="p-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{mes.mes}</p>
                    <p className="text-xl font-bold text-foreground">
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
          </div>}
        </TabsContent>

        <TabsContent value="categoria" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="card-static border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground">
                  Distribuição por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hasCategoryData ? (
                  <>
                    <div aria-hidden="true" className="h-[400px]">
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
                            fill={getCategoryColor(
                              gastosPorCategoria[index].categoria,
                              index,
                            )}
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
                      description="Legenda completa da distribuição, com valor e percentual de cada categoria."
                      items={categorySummaryItems}
                      total={totalGeral}
                    />
                  </>
                ) : (
                  <EmptyState
                    icon={PieChartIcon}
                    title="Sem dados por categoria"
                    description="A fatura selecionada precisa ter lançamentos para gerar esta distribuição."
                    action={importAction}
                  />
                )}
              </CardContent>
            </Card>

            <Card className="card-static border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground">
                  Detalhamento por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hasCategoryData ? (
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
                                backgroundColor: getCategoryColor(
                                  cat.categoria,
                                  index,
                                ),
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
                              backgroundColor: getCategoryColor(
                                cat.categoria,
                                index,
                              ),
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  </div>
                ) : (
                  <EmptyState
                    icon={PieChartIcon}
                    title="Nenhuma categoria para detalhar"
                    description="Os valores por categoria aparecerão depois que uma fatura com lançamentos for importada."
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="responsavel" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="card-static border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground">
                  Gastos por Responsável
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hasResponsibleData ? (
                  <>
                    <div aria-hidden="true" className="h-[400px]">
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
                            fill={getChartColor(index)}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <ChartDataSummary
                      description="Comparação dos valores atribuídos a cada responsável, incluindo a participação no total."
                      items={responsibleSummaryItems}
                      total={totalResponsaveis}
                    />
                  </>
                ) : (
                  <EmptyState
                    icon={Users}
                    title="Sem gastos por responsável"
                    description="Atribua lançamentos aos responsáveis para comparar os valores neste gráfico."
                    action={
                      <Button render={<Link href="/gastos" />}>
                        <Receipt />
                        Ver gastos
                      </Button>
                    }
                  />
                )}
              </CardContent>
            </Card>

            <Card className="card-static border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground">
                  Participação por Responsável
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hasResponsibleData ? (
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
                                backgroundColor: getChartColor(index),
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
                              backgroundColor: getChartColor(index),
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  </div>
                ) : (
                  <EmptyState
                    icon={Users}
                    title="Nenhuma participação calculada"
                    description="A participação será exibida quando houver gastos atribuídos na fatura selecionada."
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
