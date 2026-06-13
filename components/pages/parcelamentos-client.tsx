"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  CreditCard,
  FileText,
  Receipt,
  RotateCcw,
  TrendingUp,
  Users,
} from "lucide-react";

import { EmptyState, ErrorAlert } from "@/components/error";
import { useFaturaContext } from "@/components/fatura-provider";
import { LoadingSkeleton } from "@/components/loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/data";
import type { Parcelamento } from "@/lib/domain/models";
import { useParcelamentos } from "@/lib/hooks/useParcelamentos";
import { useResponsaveis } from "@/lib/hooks/useResponsaveis";

interface DivisaoExibida {
  responsavel: string;
  valor: number;
}

interface ParcelamentoProcessado extends Parcelamento {
  valorExibido: number;
  restanteExibido: number;
  totalExibido: number;
  temDivisao: boolean;
  percentual: number;
  divisoesExibidas: DivisaoExibida[];
}

export function ParcelamentosClient() {
  const responsavelFilterId = "parcelamentos-responsavel-filter";
  const { faturaAtual } = useFaturaContext();
  const {
    data: parcelamentos = [],
    isLoading,
    error,
    refetch,
  } = useParcelamentos(faturaAtual?.id || null);
  const { data: responsaveis = [] } = useResponsaveis();
  const [responsavelSelecionado, setResponsavelSelecionado] = useState("todos");

  const parcelamentosProcessados = useMemo<ParcelamentoProcessado[]>(() => {
    return parcelamentos.flatMap((parcelamento) => {
      const divisoes = (parcelamento.divisoes ?? []).map((divisao) => ({
        responsavel: divisao.responsavel,
        valor: Number(divisao.valor),
      }));
      const temDivisao = divisoes.length > 0;

      if (responsavelSelecionado === "todos") {
        return [{
          ...parcelamento,
          valorExibido: parcelamento.valorParcela,
          restanteExibido:
            parcelamento.valorParcela *
            (parcelamento.totalParcelas - parcelamento.parcelaAtual),
          totalExibido: parcelamento.valorTotal,
          temDivisao,
          percentual: 1,
          divisoesExibidas: divisoes,
        }];
      }

      const valorDaDivisao = divisoes
        .filter((divisao) => divisao.responsavel === responsavelSelecionado)
        .reduce((total, divisao) => total + divisao.valor, 0);
      const valorDoResponsavel = temDivisao
        ? valorDaDivisao
        : parcelamento.responsavel === responsavelSelecionado
          ? parcelamento.valorParcela
          : 0;

      if (valorDoResponsavel <= 0) {
        return [];
      }

      return [{
        ...parcelamento,
        valorExibido: valorDoResponsavel,
        restanteExibido:
          valorDoResponsavel *
          (parcelamento.totalParcelas - parcelamento.parcelaAtual),
        totalExibido: valorDoResponsavel * parcelamento.totalParcelas,
        temDivisao,
        percentual:
          parcelamento.valorParcela > 0
            ? valorDoResponsavel / parcelamento.valorParcela
            : 0,
        divisoesExibidas: temDivisao
          ? [{ responsavel: responsavelSelecionado, valor: valorDoResponsavel }]
          : [],
      }];
    });
  }, [parcelamentos, responsavelSelecionado]);

  const totalParcelamentos = parcelamentosProcessados.reduce(
    (total, parcelamento) => total + parcelamento.valorExibido,
    0
  );
  const totalRestante = parcelamentosProcessados.reduce(
    (total, parcelamento) => total + parcelamento.restanteExibido,
    0
  );
  const possuiFiltro = responsavelSelecionado !== "todos";

  if (isLoading) {
    return <LoadingSkeleton count={3} />;
  }

  if (error) {
    return <ErrorAlert error={error as Error} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="hidden text-sm text-muted-foreground sm:block">
          {possuiFiltro
            ? `Exibindo valores atribuídos a ${responsavelSelecionado}`
            : "Visão consolidada de todos os responsáveis"}
        </p>
        <div className="ml-auto flex items-center gap-2">
          <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
          <label
            className="sr-only"
            htmlFor={responsavelFilterId}
          >
            Filtrar parcelamentos por responsável
          </label>
          <Select
            value={responsavelSelecionado}
            onValueChange={(value) => setResponsavelSelecionado(value ?? "todos")}
          >
            <SelectTrigger
              id={responsavelFilterId}
              aria-label="Filtrar parcelamentos por responsável"
              className="w-[200px]"
            >
              <SelectValue>
                {responsavelSelecionado === "todos"
                  ? "Todos Responsáveis"
                  : responsavelSelecionado}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Responsáveis</SelectItem>
              {responsaveis.map((responsavel) => (
                <SelectItem key={responsavel.id} value={responsavel.nome}>
                  {responsavel.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          icon={CreditCard}
          iconClassName="bg-primary/10 text-primary"
          label={possuiFiltro ? "Parte Mensal em Parcelas" : "Total Mensal em Parcelas"}
          value={formatCurrency(totalParcelamentos)}
        />
        <SummaryCard
          icon={TrendingUp}
          iconClassName="bg-chart-3/10 text-chart-3"
          label={possuiFiltro ? "Parte Restante a Pagar" : "Total a Pagar (Restante)"}
          value={formatCurrency(totalRestante)}
        />
        <SummaryCard
          icon={Calendar}
          iconClassName="bg-chart-2/10 text-chart-2"
          label="Parcelamentos Ativos"
          value={parcelamentosProcessados.length.toString()}
        />
      </div>

      {parcelamentosProcessados.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={
            possuiFiltro
              ? "Nenhum parcelamento para este responsável"
              : "Nenhum parcelamento encontrado"
          }
          description={
            possuiFiltro
              ? "Este responsável não participa dos parcelamentos da fatura atual. Remova o filtro para consultar todos."
              : "Esta visão é criada automaticamente a partir de lançamentos com parcela, como 01/10, encontrados nas faturas importadas."
          }
          action={
            possuiFiltro ? (
              <Button
                onClick={() => setResponsavelSelecionado("todos")}
                variant="outline"
              >
                <RotateCcw />
                Ver todos
              </Button>
            ) : (
              <>
                <Button render={<Link href="/faturas" />}>
                  <FileText />
                  Importar fatura
                </Button>
                <Button render={<Link href="/gastos" />} variant="outline">
                  <Receipt />
                  Ver gastos
                </Button>
              </>
            )
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {parcelamentosProcessados.map((parcelamento) => (
            <ParcelamentoCard
              key={parcelamento.id}
              parcelamento={parcelamento}
              possuiFiltro={possuiFiltro}
              responsavelSelecionado={responsavelSelecionado}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  iconClassName,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClassName: string;
  label: string;
  value: string;
}) {
  return (
    <Card className="card-static border-border bg-card" size="sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-xl font-bold text-foreground">{value}</p>
          </div>
          <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}>
            <Icon className="size-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ParcelamentoCard({
  parcelamento,
  possuiFiltro,
  responsavelSelecionado,
}: {
  parcelamento: ParcelamentoProcessado;
  possuiFiltro: boolean;
  responsavelSelecionado: string;
}) {
  const progresso =
    (parcelamento.parcelaAtual / parcelamento.totalParcelas) * 100;
  const parcelasRestantes =
    parcelamento.totalParcelas - parcelamento.parcelaAtual;

  return (
    <Card className="card-static border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <CardTitle className="break-words text-lg text-foreground">
              {parcelamento.nome}
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              {parcelamento.temDivisao ? (
                <Badge variant="outline">
                  <Users className="mr-1 h-3 w-3" />
                  Gasto dividido
                </Badge>
              ) : parcelamento.responsavel ? (
                <Badge variant="outline">{parcelamento.responsavel}</Badge>
              ) : null}
              {possuiFiltro && parcelamento.temDivisao && (
                <Badge variant="secondary">
                  {(parcelamento.percentual * 100).toFixed(0)}% para {responsavelSelecionado}
                </Badge>
              )}
            </div>
          </div>
          <Badge className="shrink-0" variant="secondary">
            {parcelamento.parcelaAtual}/{parcelamento.totalParcelas}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium text-foreground">
              {progresso.toFixed(0)}%
            </span>
          </div>
          <Progress value={progresso} className="h-2" />
        </div>

        {parcelamento.temDivisao && (
          <div className="rounded-lg border border-border/70 bg-muted/35 p-3">
            <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2">
              <span className="text-xs text-muted-foreground">
                Valor original da parcela
              </span>
              <span className="text-sm font-semibold text-foreground">
                {formatCurrency(parcelamento.valorParcela)}
              </span>
            </div>
            <div className="space-y-2 pt-2">
              {parcelamento.divisoesExibidas.map((divisao) => (
                <div
                  key={`${parcelamento.id}-${divisao.responsavel}`}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="truncate text-muted-foreground">
                    {possuiFiltro ? "Parte selecionada" : divisao.responsavel}
                  </span>
                  <span className="font-semibold text-primary">
                    {formatCurrency(divisao.valor)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          <Metric
            label={possuiFiltro ? "Parcela do responsável" : "Valor da Parcela"}
            value={formatCurrency(parcelamento.valorExibido)}
          />
          <Metric
            label={possuiFiltro ? "Total do responsável" : "Valor Total"}
            value={formatCurrency(parcelamento.totalExibido)}
          />
          <Metric
            label="Parcelas Restantes"
            value={parcelasRestantes.toString()}
          />
          <Metric
            label={possuiFiltro ? "Restante do responsável" : "Valor Restante"}
            value={formatCurrency(parcelamento.restanteExibido)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-xs leading-snug text-muted-foreground">{label}</p>
      <p className="break-words text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
