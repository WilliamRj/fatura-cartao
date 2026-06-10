"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar, TrendingUp, Users } from "lucide-react";
import { formatCurrency } from "@/lib/data";
import { useParcelamentos } from "@/lib/hooks/useParcelamentos";
import { useResponsaveis } from "@/lib/hooks/useResponsaveis";
import { useFaturaContext } from "@/components/fatura-provider";
import { LoadingSkeleton } from "@/components/loading";
import { ErrorAlert, EmptyState } from "@/components/error";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ParcelamentosPage() {
  const { faturaAtual } = useFaturaContext();
  const { data: parcelamentos = [], isLoading, error, refetch } = useParcelamentos(faturaAtual?.id || null);
  const { data: responsaveis = [] } = useResponsaveis();
  const [responsavelId, setResponsavelId] = useState<string>("todos");

  const parcelamentosProcessados = useMemo(() => {
    if (!parcelamentos) return [];

    if (responsavelId === "todos") {
      return parcelamentos.map(p => ({
        ...p,
        valorExibido: p.valorParcela,
        restanteExibido: p.valorParcela * (p.totalParcelas - p.parcelaAtual),
        totalExibido: p.valorTotal,
        temDivisao: false,
        percentual: 0,
      }));
    }

    return parcelamentos.reduce((acc, p) => {
      let percentual = 0;
      let temDivisao = false;
      let valorParte = 0;

      if (p.divisoes && p.divisoes.length > 0) {
        temDivisao = true;
        const divisao = p.divisoes.find(d => d.responsavel === responsavelId);
        if (divisao) {
          valorParte = divisao.valor;
          percentual = p.valorParcela > 0 ? divisao.valor / p.valorParcela : 0;
        }
      } else if (p.responsavel === responsavelId) {
        percentual = 1;
        valorParte = p.valorParcela;
      }

      if (percentual > 0) {
        acc.push({
          ...p,
          valorExibido: valorParte,
          restanteExibido: valorParte * (p.totalParcelas - p.parcelaAtual),
          totalExibido: valorParte * p.totalParcelas,
          temDivisao,
          percentual
        });
      }

      return acc;
    }, [] as (typeof parcelamentos[0] & {
      valorExibido: number;
      restanteExibido: number;
      totalExibido: number;
      temDivisao: boolean;
      percentual: number;
    })[]);
  }, [parcelamentos, responsavelId]);

  const totalParcelamentos = parcelamentosProcessados.reduce(
    (acc, p) => acc + p.valorExibido,
    0
  );
  const totalRestante = parcelamentosProcessados.reduce(
    (acc, p) => acc + p.restanteExibido,
    0
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Parcelamentos</h1>
            <p className="text-muted-foreground">
              Acompanhe todos os seus parcelamentos ativos
            </p>
          </div>
        </div>
        <LoadingSkeleton count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Parcelamentos</h1>
            <p className="text-muted-foreground">
              Acompanhe todos os seus parcelamentos ativos
            </p>
          </div>
        </div>
        <ErrorAlert error={error as Error} onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Parcelamentos</h1>
          <p className="text-muted-foreground">
            Acompanhe todos os seus parcelamentos ativos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Select
            value={responsavelId}
            onValueChange={(val) => setResponsavelId(val ?? "todos")}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {responsaveis.map((resp) => (
                <SelectItem key={resp.id} value={resp.nome}>
                  {resp.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
                  {parcelamentosProcessados.length}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-chart-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {!parcelamentosProcessados || parcelamentosProcessados.length === 0 ? (
        <EmptyState
          title={responsavelId !== "todos" ? "Nenhum parcelamento para este responsável" : "Nenhum parcelamento encontrado"}
          description="Os lançamentos com parcelas (ex: 1/10) aparecerão aqui automaticamente."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {parcelamentosProcessados.map((parcelamento) => {
            const progresso =
              (parcelamento.parcelaAtual / parcelamento.totalParcelas) * 100;

            return (
              <Card
                key={parcelamento.id}
                className="bg-card border-border hover:border-primary/50 transition-colors"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-foreground text-lg">
                      {parcelamento.nome}
                      {responsavelId !== "todos" && parcelamento.temDivisao && (
                         <span className="ml-2 text-xs font-normal text-muted-foreground">
                           (Sua parte: {(parcelamento.percentual * 100).toFixed(0)}%)
                         </span>
                      )}
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
                        {formatCurrency(parcelamento.valorExibido)}
                        {responsavelId !== "todos" && parcelamento.temDivisao && (
                          <span className="block text-[10px] text-muted-foreground">
                            Total: {formatCurrency(parcelamento.valorParcela)}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Valor Total</p>
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(parcelamento.totalExibido)}
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
                        {formatCurrency(parcelamento.restanteExibido)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
