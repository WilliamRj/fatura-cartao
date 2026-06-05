"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/data";
import { useParcelamentos } from "@/lib/hooks/useParcelamentos";
import { useFaturaContext } from "@/components/fatura-provider";
import { LoadingSkeleton } from "@/components/loading";
import { ErrorAlert, EmptyState } from "@/components/error";

export default function ParcelamentosPage() {
  const { faturaAtual } = useFaturaContext();
  const { data: parcelamentos = [], isLoading, error, refetch } = useParcelamentos(faturaAtual?.id || null);

  const totalParcelamentos = parcelamentos.reduce(
    (acc, p) => acc + p.valorParcela,
    0
  );
  const totalRestante = parcelamentos.reduce(
    (acc, p) => acc + p.valorParcela * (p.totalParcelas - p.parcelaAtual),
    0
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Parcelamentos</h1>
          <p className="text-muted-foreground">
            Acompanhe todos os seus parcelamentos ativos
          </p>
        </div>
        <LoadingSkeleton count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Parcelamentos</h1>
          <p className="text-muted-foreground">
            Acompanhe todos os seus parcelamentos ativos
          </p>
        </div>
        <ErrorAlert error={error as Error} onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Parcelamentos</h1>
        <p className="text-muted-foreground">
          Acompanhe todos os seus parcelamentos ativos
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Total Mensal em Parcelas
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(totalParcelamentos)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Total a Pagar (Restante)
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(totalRestante)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-chart-3/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-chart-3" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Parcelamentos Ativos
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {parcelamentos.length}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-chart-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {parcelamentos.map((parcelamento) => {
          const progresso =
            (parcelamento.parcelaAtual / parcelamento.totalParcelas) * 100;
          const restante =
            parcelamento.valorParcela *
            (parcelamento.totalParcelas - parcelamento.parcelaAtual);

          return (
            <Card
              key={parcelamento.id}
              className="bg-card border-border hover:border-primary/50 transition-colors"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-foreground text-lg">
                    {parcelamento.nome}
                  </CardTitle>
                  <Badge variant="secondary">
                    {parcelamento.parcelaAtual}/{parcelamento.totalParcelas}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="text-foreground font-medium">
                      {progresso.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={progresso} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Valor da Parcela
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(parcelamento.valorParcela)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Valor Total</p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(parcelamento.valorTotal)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Parcelas Restantes
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {parcelamento.totalParcelas - parcelamento.parcelaAtual}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Valor Restante
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(restante)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
