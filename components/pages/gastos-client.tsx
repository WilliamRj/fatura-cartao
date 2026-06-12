"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, X, Search, Filter, ArrowUpDown, Edit2, MessageSquare, SplitSquareHorizontal, Undo2, CornerDownRight } from "lucide-react";
import { useGastos, useUpdateGasto } from "@/lib/hooks/useGastos";
import { useResponsaveis } from "@/lib/hooks/useResponsaveis";
import { useFaturaContext } from "@/components/fatura-provider";
import {
  categorias,
  formatCurrency,
  formatDate,
} from "@/lib/data";
import type { Gasto } from "@/lib/domain/models";
import { LoadingSkeleton } from "@/components/loading";
import { ErrorAlert, EmptyState } from "@/components/error";
import { toast } from "sonner";

export function GastosClient() {
  const formId = React.useId();
  const searchInputId = `${formId}-search`;
  const categoryFilterId = `${formId}-category-filter`;
  const responsibleFilterId = `${formId}-responsible-filter`;
  const valueInputId = `${formId}-value`;
  const categoryInputId = `${formId}-category`;
  const responsibleInputId = `${formId}-responsible`;
  const observationInputId = `${formId}-observation`;
  const splitSummaryId = `${formId}-split-summary`;
  const { faturaAtual } = useFaturaContext();
  const { data: gastos, isLoading, error, refetch } = useGastos(faturaAtual?.id || null);
  const { data: responsaveis = [] } = useResponsaveis();
  const updateGasto = useUpdateGasto();

  const [search, setSearch] = React.useState("");
  const [categoriaFilter, setCategoriaFilter] = React.useState("all");
  const [responsavelFilter, setResponsavelFilter] = React.useState("all");
  const [sortField, setSortField] = React.useState<keyof Gasto>("data");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");
  
  const [editingGasto, setEditingGasto] = React.useState<Gasto | null>(null);
  const [editedValor, setEditedValor] = React.useState<number | "">("");
  const [editedCategoria, setEditedCategoria] = React.useState("");
  const [editedResponsavel, setEditedResponsavel] = React.useState("");
  const [editedObservacao, setEditedObservacao] = React.useState("");
  
  const [isSplitMode, setIsSplitMode] = React.useState(false);
  const [originalValor, setOriginalValor] = React.useState<number | null>(null);
  const [splits, setSplits] = React.useState<{ id?: string; valor: number | ""; responsavel: string }[]>([]);
  const [validationAttempted, setValidationAttempted] = React.useState(false);

  const splitValidation = React.useMemo(() => {
    const total = splits.reduce(
      (sum, split) => sum + (Number(split.valor) || 0),
      0,
    );
    const difference = (originalValor ?? 0) - total;
    const responsibleCounts = splits.reduce<Record<string, number>>(
      (counts, split) => {
        if (split.responsavel) {
          counts[split.responsavel] =
            (counts[split.responsavel] ?? 0) + 1;
        }
        return counts;
      },
      {},
    );
    const rows = splits.map((split) => ({
      value:
        !split.valor || Number(split.valor) <= 0
          ? "Informe um valor maior que zero."
          : "",
      responsible: !split.responsavel
        ? "Selecione um responsável."
        : responsibleCounts[split.responsavel] > 1
          ? "Esse responsável já foi usado em outra divisão."
          : "",
    }));

    return {
      total,
      difference,
      rows,
      isValid:
        Math.abs(difference) <= 0.01 &&
        rows.every((row) => !row.value && !row.responsible),
    };
  }, [originalValor, splits]);

  const filteredGastos = React.useMemo(() => {
    if (!gastos) return [];

    let result = [...gastos];

    if (search) {
      result = result.filter((g) =>
        g.estabelecimento.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (categoriaFilter !== "all") {
      result = result.filter((g) => g.categoria === categoriaFilter);
    }

    if (responsavelFilter !== "all") {
      result = result.filter((g) => {
        if (g.divisoes && g.divisoes.length > 0) {
          return g.divisoes.some(d => d.responsavel === responsavelFilter);
        }
        return g.responsavel === responsavelFilter;
      });
    }

    result.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      const modifier = sortDirection === "asc" ? 1 : -1;

      if (typeof aValue === "number" && typeof bValue === "number") {
        return (aValue - bValue) * modifier;
      }

      return String(aValue).localeCompare(String(bValue)) * modifier;
    });

    return result;
  }, [gastos, search, categoriaFilter, responsavelFilter, sortField, sortDirection]);

  const handleSort = (field: keyof Gasto) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const openEditModal = (gasto: Gasto) => {
    setValidationAttempted(false);
    setEditingGasto(gasto);
    setEditedCategoria(gasto.categoria);
    setEditedResponsavel(gasto.responsavel);
    setEditedObservacao(gasto.observacao || "");
    
    if (gasto.divisoes && gasto.divisoes.length > 0) {
      setIsSplitMode(true);
      setOriginalValor(gasto.valor);
      setEditedValor(""); // Not used in split mode
      setSplits(gasto.divisoes.map((d, i) => ({ id: `split-${i}`, valor: d.valor, responsavel: d.responsavel })));
    } else {
      setIsSplitMode(false);
      setEditedValor(gasto.valor);
      setOriginalValor(gasto.valor);
      setSplits([]);
    }
  };

  const handleAddSplit = () => {
    setSplits(prev => [...prev, { id: `temp-${Date.now()}`, valor: "", responsavel: "" }]);
  };

  const handleRemoveSplit = (index: number) => {
    setSplits(prev => prev.filter((_, i) => i !== index));
  };

  const handleSplitChange = (index: number, field: 'valor' | 'responsavel', value: string | number) => {
    setSplits(prev => {
      const newSplits = [...prev];
      newSplits[index] = { ...newSplits[index], [field]: value };
      return newSplits;
    });
  };

  const handleUndoSplit = async () => {
    if (!editingGasto) return;

    try {
      await updateGasto.mutateAsync({
        id: editingGasto.id,
        updates: {
          divisoes: null
        }
      });
      toast.success("Divisão desfeita com sucesso!");
      setEditingGasto(null);
    } catch (error) {
      toast.error("Erro ao desfazer divisão");
      console.error(error);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingGasto) return;
    setValidationAttempted(true);

    try {
      if (isSplitMode) {
        if (!originalValor) return;

        if (!splitValidation.isValid) {
          toast.error("Revise os campos da divisão antes de salvar.");
          return;
        }

        await updateGasto.mutateAsync({
          id: editingGasto.id,
          updates: {
            categoria: editedCategoria,
            observacao: editedObservacao,
            divisoes: splits.map(s => ({ valor: Number(s.valor), responsavel: s.responsavel }))
          }
        });

      } else {
        await updateGasto.mutateAsync({
          id: editingGasto.id,
          updates: {
            valor: Number(editedValor),
            categoria: editedCategoria,
            responsavel: editedResponsavel,
            observacao: editedObservacao,
            divisoes: null
          }
        });
      }

      toast.success("Gasto atualizado com sucesso!");
      setEditingGasto(null);
    } catch (error) {
      toast.error("Erro ao atualizar gasto");
      console.error(error);
    }
  };

  const getCategoriaColor = (categoria: string) => {
    const colors: Record<string, string> = {
      Alimentação: "bg-[var(--chart-1)]/20 text-[var(--chart-1)]",
      Transporte: "bg-[var(--chart-2)]/20 text-[var(--chart-2)]",
      Entretenimento: "bg-[var(--chart-3)]/20 text-[var(--chart-3)]",
      Compras: "bg-[var(--chart-4)]/20 text-[var(--chart-4)]",
      Assinaturas: "bg-[var(--chart-5)]/20 text-[var(--chart-5)]",
      Saúde: "bg-[var(--chart-6)]/20 text-[var(--chart-6)]",
      Educação: "bg-[var(--chart-7)]/20 text-[var(--chart-7)]",
      Pagamentos: "bg-[var(--chart-9)]/20 text-[var(--chart-9)]",
      Condomínio: "bg-[var(--chart-10)]/20 text-[var(--chart-10)]",
      Dívida: "bg-[var(--chart-11)]/20 text-[var(--chart-11)]",
      Outros: "bg-[var(--chart-8)]/20 text-[var(--chart-8)]",
    };
    return colors[categoria] || "bg-muted text-muted-foreground";
  };

  if (isLoading) {
    return <LoadingSkeleton count={5} />;
  }

  if (error) {
    return <ErrorAlert error={error as Error} onRetry={() => refetch()} />;
  }

  if (!gastos || gastos.length === 0) {
    return (
      <EmptyState
        title="Nenhum gasto encontrado"
        description="Quando você adicionar gastos, eles aparecerão aqui"
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border card-hover">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <fieldset className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_180px]">
            <legend className="sr-only">Filtros da lista de gastos</legend>
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor={searchInputId}
              >
                Estabelecimento
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id={searchInputId}
                  placeholder="Buscar estabelecimento..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor={categoryFilterId}
              >
                Categoria
              </label>
              <Select
                value={categoriaFilter}
                onValueChange={(val) => setCategoriaFilter(val ?? "all")}
              >
                <SelectTrigger id={categoryFilterId} className="w-full">
                  <SelectValue placeholder="Categoria">
                    {categoriaFilter === "all" ? "Todas Categorias" : categoriaFilter}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Categorias</SelectItem>
                  {categorias.map((cat) => (
                    <SelectItem key={cat.id} value={cat.nome}>
                      {cat.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor={responsibleFilterId}
              >
                Responsável
              </label>
              <Select
                value={responsavelFilter}
                onValueChange={(val) => setResponsavelFilter(val ?? "all")}
              >
                <SelectTrigger id={responsibleFilterId} className="w-full">
                  <SelectValue placeholder="Responsável">
                    {responsavelFilter === "all" ? "Todos Responsáveis" : responsavelFilter}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Responsáveis</SelectItem>
                  {responsaveis.map((resp) => (
                    <SelectItem key={resp.id} value={resp.nome}>
                      {resp.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </fieldset>
        </CardContent>
      </Card>

      <Card className="bg-card border-border card-hover">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead
                    aria-sort={
                      sortField === "data"
                        ? sortDirection === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <button
                      type="button"
                      className="flex w-full items-center gap-1 rounded-sm py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => handleSort("data")}
                    >
                      Data
                      <ArrowUpDown className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">
                        {sortField === "data"
                          ? `Ordenado de forma ${sortDirection === "asc" ? "crescente" : "decrescente"}`
                          : "Ordenar por data"}
                      </span>
                    </button>
                  </TableHead>
                  <TableHead
                    aria-sort={
                      sortField === "estabelecimento"
                        ? sortDirection === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <button
                      type="button"
                      className="flex w-full items-center gap-1 rounded-sm py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => handleSort("estabelecimento")}
                    >
                      Estabelecimento
                      <ArrowUpDown className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">
                        {sortField === "estabelecimento"
                          ? `Ordenado de forma ${sortDirection === "asc" ? "crescente" : "decrescente"}`
                          : "Ordenar por estabelecimento"}
                      </span>
                    </button>
                  </TableHead>
                  <TableHead
                    className="text-right"
                    aria-sort={
                      sortField === "valor"
                        ? sortDirection === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <button
                      type="button"
                      className="flex w-full items-center justify-end gap-1 rounded-sm py-2 text-right outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => handleSort("valor")}
                    >
                      Valor
                      <ArrowUpDown className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">
                        {sortField === "valor"
                          ? `Ordenado de forma ${sortDirection === "asc" ? "crescente" : "decrescente"}`
                          : "Ordenar por valor"}
                      </span>
                    </button>
                  </TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGastos.map((gasto) => (
                  <React.Fragment key={gasto.id}>
                    <TableRow
                      className="border-border hover:bg-muted/50"
                    >
                      <TableCell className="text-muted-foreground">
                        {formatDate(gasto.data)}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {gasto.estabelecimento}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-foreground">
                        <span
                          className={
                            gasto.valor < 0
                              ? "font-medium text-success"
                              : undefined
                          }
                        >
                          {formatCurrency(gasto.valor)}
                        </span>
                        {gasto.valor < 0 && (
                          <Badge
                            variant="outline"
                            className="ml-2 border-success/30 text-success"
                          >
                            Crédito/Ajuste
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={getCategoriaColor(gasto.categoria)}
                        >
                          {gasto.categoria}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground">
                        {gasto.divisoes && gasto.divisoes.length > 0 
                          ? "Múltiplos" 
                          : gasto.responsavel}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {gasto.parcela || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 items-center">
                          {gasto.observacao && (
                            <div
                              className="flex items-center justify-center text-muted-foreground mr-1" 
                              title={gasto.observacao}
                            >
                              <MessageSquare className="h-4 w-4" aria-hidden="true" />
                              <span className="sr-only">
                                Observação: {gasto.observacao}
                              </span>
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditModal(gasto)}
                            aria-label={`Editar gasto de ${gasto.estabelecimento}`}
                            title={`Editar ${gasto.estabelecimento}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {gasto.divisoes && gasto.divisoes.length > 0 && gasto.divisoes.map((divisao, idx) => (
                      <TableRow
                        key={`${gasto.id}-div-${idx}`}
                        className="border-border/50 bg-muted/20 hover:bg-muted/30"
                      >
                        <TableCell></TableCell>
                        <TableCell className="text-muted-foreground flex items-center gap-2 py-3">
                          <CornerDownRight className="h-4 w-4 ml-4" />
                          <span className="text-sm">Divisão</span>
                        </TableCell>
                        <TableCell className="text-right font-medium text-muted-foreground">
                          {formatCurrency(divisao.valor)}
                        </TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-foreground text-sm">
                          {divisao.responsavel}
                        </TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between px-4 py-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Mostrando {filteredGastos.length} gastos
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={!!editingGasto}
        onOpenChange={(open) => !open && setEditingGasto(null)}
      >
        <DialogContent className="bg-card border-border">
          <form
            className="contents"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSaveEdit();
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-foreground">Editar Gasto</DialogTitle>
              <DialogDescription>
                Atualize a categoria, o responsável, a observação ou a divisão
                deste lançamento.
              </DialogDescription>
            </DialogHeader>
            {editingGasto && (
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Estabelecimento
                </p>
                <p className="text-sm text-muted-foreground">
                  {editingGasto.estabelecimento}
                </p>
              </div>
              
              {isSplitMode ? (
                <div className="space-y-4 border rounded-md p-4 bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-foreground">Valor Original</p>
                    <p className="text-sm font-bold text-foreground">
                      {originalValor ? formatCurrency(originalValor) : "-"}
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <div
                      id={splitSummaryId}
                      className="text-sm text-muted-foreground"
                      aria-live="polite"
                    >
                      Soma: {formatCurrency(splitValidation.total)} · Restante:{" "}
                      {formatCurrency(splitValidation.difference)}
                    </div>
                    {validationAttempted && !splitValidation.isValid && (
                      <p className="text-sm text-destructive" role="alert">
                        Corrija os campos indicados e faça a soma coincidir com
                        o valor original.
                      </p>
                    )}
                    {splits.map((split, index) => (
                      <div key={split.id} className="space-y-2">
                        <div className="flex items-start gap-2">
                          <div className="w-32 space-y-1">
                            <label
                              className="sr-only"
                              htmlFor={`${formId}-split-${index}-value`}
                            >
                              Valor da divisão {index + 1}
                            </label>
                            <Input
                              id={`${formId}-split-${index}-value`}
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              min="0.01"
                              placeholder="Valor"
                              value={split.valor}
                              onChange={(e) => handleSplitChange(index, 'valor', e.target.value)}
                              aria-invalid={
                                validationAttempted &&
                                !!splitValidation.rows[index]?.value
                              }
                              aria-describedby={
                                validationAttempted &&
                                splitValidation.rows[index]?.value
                                  ? `${splitSummaryId} ${formId}-split-${index}-value-error`
                                  : splitSummaryId
                              }
                            />
                            {validationAttempted &&
                              splitValidation.rows[index]?.value && (
                                <p
                                  id={`${formId}-split-${index}-value-error`}
                                  className="text-xs text-destructive"
                                >
                                  {splitValidation.rows[index].value}
                                </p>
                              )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <label
                              className="sr-only"
                              htmlFor={`${formId}-split-${index}-responsible`}
                            >
                              Responsável da divisão {index + 1}
                            </label>
                            <Select
                              value={split.responsavel}
                              onValueChange={(val) => handleSplitChange(index, 'responsavel', val ?? "")}
                            >
                              <SelectTrigger
                                id={`${formId}-split-${index}-responsible`}
                                className="w-full"
                                aria-invalid={
                                  validationAttempted &&
                                  !!splitValidation.rows[index]?.responsible
                                }
                                aria-describedby={
                                  validationAttempted &&
                                  splitValidation.rows[index]?.responsible
                                    ? `${formId}-split-${index}-responsible-error`
                                    : undefined
                                }
                              >
                                <SelectValue placeholder="Responsável" />
                              </SelectTrigger>
                              <SelectContent>
                                {responsaveis.map((resp) => (
                                  <SelectItem key={resp.id} value={resp.nome}>
                                    {resp.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {validationAttempted &&
                              splitValidation.rows[index]?.responsible && (
                                <p
                                  id={`${formId}-split-${index}-responsible-error`}
                                  className="text-xs text-destructive"
                                >
                                  {splitValidation.rows[index].responsible}
                                </p>
                              )}
                          </div>
                          {splits.length > 2 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              type="button"
                              className="h-9 w-9 text-destructive"
                              onClick={() => handleRemoveSplit(index)}
                              aria-label={`Remover divisão ${index + 1}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      className="w-full mt-2 border border-dashed"
                      onClick={handleAddSplit}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Adicionar divisão
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-foreground"
                    htmlFor={valueInputId}
                  >
                    Valor
                  </label>
                  <Input
                    id={valueInputId}
                    type="number"
                    value={editedValor}
                    disabled
                  />
                </div>
              )}

              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-foreground"
                  htmlFor={categoryInputId}
                >
                  Categoria
                </label>
                <Select
                  value={editedCategoria}
                  onValueChange={(val) => setEditedCategoria(val ?? "")}
                >
                  <SelectTrigger id={categoryInputId}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((cat) => (
                      <SelectItem key={cat.id} value={cat.nome}>
                        {cat.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!isSplitMode && (
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-foreground"
                    htmlFor={responsibleInputId}
                  >
                    Responsável
                  </label>
                  <Select
                    value={editedResponsavel}
                    onValueChange={(val) => setEditedResponsavel(val ?? "")}
                  >
                    <SelectTrigger id={responsibleInputId}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {responsaveis.map((resp) => (
                        <SelectItem key={resp.id} value={resp.nome}>
                          {resp.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-foreground"
                  htmlFor={observationInputId}
                >
                  Observação
                </label>
                <Input
                  id={observationInputId}
                  placeholder="Adicione uma observação..."
                  aria-describedby={`${observationInputId}-description`}
                  value={editedObservacao}
                  onChange={(e) => setEditedObservacao(e.target.value)}
                />
                <p
                  id={`${observationInputId}-description`}
                  className="text-xs text-muted-foreground"
                >
                  Campo opcional, usado apenas para complementar o lançamento.
                </p>
              </div>
              </div>
            )}
            <DialogFooter className="sm:justify-between">
              <div className="flex-1 mr-auto">
                {editingGasto?.divisoes && editingGasto.divisoes.length > 0 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={handleUndoSplit}
                    disabled={updateGasto.isPending}
                  >
                  <Undo2 className="h-4 w-4 mr-2" />
                  Desfazer divisão
                </Button>
              ) : !isSplitMode && (
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setIsSplitMode(true);
                    setOriginalValor(editingGasto?.valor || 0);
                    setSplits([
                      { id: `split-0`, valor: editingGasto?.valor || "", responsavel: editedResponsavel },
                      { id: `temp-${Date.now()}`, valor: "", responsavel: "" }
                    ]);
                  }}
                >
                  <SplitSquareHorizontal className="h-4 w-4 mr-2" />
                  Dividir valor
                </Button>
              )}
              </div>
              <div className="flex gap-2 mt-2 sm:mt-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingGasto(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={updateGasto.isPending}
                >
                  {updateGasto.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
