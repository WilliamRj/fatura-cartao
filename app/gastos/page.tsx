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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, X, Search, Filter, ArrowUpDown, Edit2, Trash2, ChevronLeft, ChevronRight, SplitSquareHorizontal, Undo2 } from "lucide-react";
import { useGastos, useUpdateGasto, useDeleteGasto } from "@/lib/hooks/useGastos";
import { useResponsaveis } from "@/lib/hooks/useResponsaveis";
import { useFaturaContext } from "@/components/fatura-provider";
import {
  categorias,
  formatCurrency,
  formatDate,
  type Gasto,
} from "@/lib/data";
import { LoadingSkeleton } from "@/components/loading";
import { ErrorAlert, EmptyState } from "@/components/error";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 10;

export default function GastosPage() {
  const { faturaAtual } = useFaturaContext();
  const { data: gastos, isLoading, error, refetch } = useGastos(faturaAtual?.id || null);
  const { data: responsaveis = [] } = useResponsaveis();
  const updateGasto = useUpdateGasto();
  const deleteGasto = useDeleteGasto();

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
  const [originalResponsavel, setOriginalResponsavel] = React.useState<string | null>(null);
  const [splits, setSplits] = React.useState<{ id?: string; valor: number | ""; responsavel: string }[]>([]);

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
      result = result.filter((g) => g.responsavel === responsavelFilter);
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
      refetch();
    } catch (error) {
      toast.error("Erro ao desfazer divisão");
      console.error(error);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingGasto) return;

    try {
      if (isSplitMode) {
        if (!originalValor) return;
        
        // Validation
        const sum = splits.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
        // Using Math.abs to handle floating point precision issues
        if (Math.abs(sum - originalValor) > 0.01) {
          toast.error("A soma das divisões deve ser exatamente igual ao valor original");
          return;
        }

        const responsaveisSet = new Set(splits.map(s => s.responsavel).filter(Boolean));
        if (responsaveisSet.size !== splits.filter(s => s.responsavel).length) {
          toast.error("Não pode haver responsáveis repetidos");
          return;
        }

        if (splits.some(s => !s.valor || !s.responsavel)) {
          toast.error("Preencha todos os campos da divisão");
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
      refetch();
    } catch (error) {
      toast.error("Erro ao atualizar gasto");
      console.error(error);
    }
  };

  const handleDeleteGasto = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja excluir este gasto?")) return;

    try {
      await deleteGasto.mutateAsync(id);
      toast.success("Gasto excluído com sucesso!");
      refetch();
    } catch (error) {
      toast.error("Erro ao excluir gasto");
      console.error(error);
    }
  };

  const getCategoriaColor = (categoria: string) => {
    const colors: Record<string, string> = {
      Alimentacao: "bg-chart-1/20 text-chart-1",
      Transporte: "bg-chart-2/20 text-chart-2",
      Entretenimento: "bg-chart-3/20 text-chart-3",
      Compras: "bg-chart-4/20 text-chart-4",
      Assinaturas: "bg-chart-5/20 text-chart-5",
      Saude: "bg-chart-1/20 text-chart-1",
      Educacao: "bg-chart-2/20 text-chart-2",
      Outros: "bg-chart-3/20 text-chart-3",
    };
    return colors[categoria] || "bg-muted text-muted-foreground";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gastos</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie todos os seus gastos
          </p>
        </div>
        <LoadingSkeleton count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gastos</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie todos os seus gastos
          </p>
        </div>
        <ErrorAlert error={error as Error} onRetry={() => refetch()} />
      </div>
    );
  }

  if (!gastos || gastos.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gastos</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie todos os seus gastos
          </p>
        </div>
        <EmptyState
          title="Nenhum gasto encontrado"
          description="Quando você adicionar gastos, eles aparecerão aqui"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gastos</h1>
        <p className="text-muted-foreground">
          Visualize e gerencie todos os seus gastos
        </p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar estabelecimento..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select 
              value={categoriaFilter} 
              onValueChange={(val) => setCategoriaFilter(val ?? "all")}
            >
              <SelectTrigger className="w-full md:w-[180px]">
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
            <Select
              value={responsavelFilter}
              onValueChange={(val) => setResponsavelFilter(val ?? "all")}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Responsavel">
                  {responsavelFilter === "all" ? "Todos Responsaveis" : responsavelFilter}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Responsaveis</SelectItem>
                {responsaveis.map((resp) => (
                  <SelectItem key={resp.id} value={resp.nome}>
                    {resp.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("data")}
                  >
                    <div className="flex items-center gap-1">
                      Data
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("estabelecimento")}
                  >
                    <div className="flex items-center gap-1">
                      Estabelecimento
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-right"
                    onClick={() => handleSort("valor")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Valor
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Responsavel</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGastos.map((gasto) => (
                  <TableRow
                    key={gasto.id}
                    className="border-border cursor-pointer hover:bg-muted/50"
                    onClick={() => openEditModal(gasto)}
                  >
                    <TableCell className="text-muted-foreground">
                      {formatDate(gasto.data)}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {gasto.estabelecimento}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-foreground">
                      {formatCurrency(gasto.valor)}
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
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(gasto);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => handleDeleteGasto(e, gasto.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
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
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-foreground">Editar Gasto</DialogTitle>
              {editingGasto?.divisoes && editingGasto.divisoes.length > 0 ? (
                <Button variant="outline" size="sm" onClick={handleUndoSplit} disabled={updateGasto.isPending}>
                  <Undo2 className="h-4 w-4 mr-2" />
                  Desfazer divisão
                </Button>
              ) : !isSplitMode && (
                <Button variant="outline" size="sm" onClick={() => {
                  setIsSplitMode(true);
                  setOriginalValor(editingGasto?.valor || 0);
                  setSplits([
                    { id: `split-0`, valor: editingGasto?.valor || "", responsavel: editedResponsavel },
                    { id: `temp-${Date.now()}`, valor: "", responsavel: "" }
                  ]);
                }}>
                  <SplitSquareHorizontal className="h-4 w-4 mr-2" />
                  Dividir valor
                </Button>
              )}
            </div>
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
                    <p className="text-sm font-medium text-foreground mb-2">Divisões</p>
                    {splits.map((split, index) => (
                      <div key={split.id} className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Valor"
                          className="w-32"
                          value={split.valor}
                          onChange={(e) => handleSplitChange(index, 'valor', e.target.value)}
                        />
                        <Select
                          value={split.responsavel}
                          onValueChange={(val) => handleSplitChange(index, 'responsavel', val ?? "")}
                        >
                          <SelectTrigger className="flex-1">
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
                        {splits.length > 2 && (
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => handleRemoveSplit(index)}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" className="w-full mt-2 border border-dashed" onClick={handleAddSplit}>
                      <Plus className="h-4 w-4 mr-2" /> Adicionar divisão
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Valor</label>
                  <Input
                    type="number"
                    value={editedValor}
                    onChange={(e) => setEditedValor(e.target.value ? Number(e.target.value) : "")}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Categoria
                </label>
                <Select
                  value={editedCategoria}
                  onValueChange={(val) => setEditedCategoria(val ?? "")}
                >
                  <SelectTrigger>
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
                  <label className="text-sm font-medium text-foreground">
                    Responsavel
                  </label>
                  <Select
                    value={editedResponsavel}
                    onValueChange={(val) => setEditedResponsavel(val ?? "")}
                  >
                    <SelectTrigger>
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
                <label className="text-sm font-medium text-foreground">
                  Observacao
                </label>
                <Input
                  placeholder="Adicione uma observacao..."
                  value={editedObservacao}
                  onChange={(e) => setEditedObservacao(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGasto(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateGasto.isPending}
            >
              {updateGasto.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
