"use client";

import * as React from "react";
import {
  Pencil,
  Plus,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import type { Responsavel } from "@/lib/domain/models";
import {
  useCreateResponsavel,
  useDeleteResponsavel,
  useRenameResponsavel,
  useResponsaveis,
} from "@/lib/hooks/useResponsaveis";
import { AdminAccessCard } from "@/components/admin-access-card";
import { useAuth } from "@/components/auth-provider";
import { ErrorAlert } from "@/components/error";
import { LoadingSkeleton } from "@/components/loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function ConfiguracoesClient() {
  const { isAdmin } = useAuth();
  const {
    data: responsaveis = [],
    isLoading,
    error,
    refetch,
  } = useResponsaveis();
  const createResponsavel = useCreateResponsavel();
  const deleteResponsavel = useDeleteResponsavel();
  const renameResponsavel = useRenameResponsavel();

  const [newName, setNewName] = React.useState("");
  const [newNameError, setNewNameError] = React.useState("");
  const [editingResponsavel, setEditingResponsavel] =
    React.useState<Responsavel | null>(null);
  const [editingName, setEditingName] = React.useState("");
  const [editingError, setEditingError] = React.useState("");
  const newNameId = React.useId();

  const hasDuplicateName = (name: string, ignoredId?: string) =>
    responsaveis.some(
      (responsavel) =>
        responsavel.id !== ignoredId &&
        responsavel.nome.toLocaleLowerCase("pt-BR") ===
          name.toLocaleLowerCase("pt-BR"),
    );

  const handleAddResponsavel = async () => {
    const name = newName.trim();
    if (!name) {
      setNewNameError("Informe o nome do responsável.");
      return;
    }
    if (hasDuplicateName(name)) {
      setNewNameError("Já existe um responsável com esse nome.");
      return;
    }

    try {
      setNewNameError("");
      await createResponsavel.mutateAsync({ nome: name });
      setNewName("");
      toast.success("Responsável adicionado.");
    } catch (creationError) {
      const message =
        creationError instanceof Error
          ? creationError.message
          : "Não foi possível adicionar o responsável.";
      setNewNameError(message);
      toast.error(message);
    }
  };

  const handleRemoveResponsavel = async (responsavel: Responsavel) => {
    if (responsavel.isOwner) return;

    try {
      await deleteResponsavel.mutateAsync(responsavel.id);
      toast.success("Responsável removido.");
    } catch (deletionError) {
      toast.error(
        deletionError instanceof Error
          ? deletionError.message
          : "Não foi possível remover o responsável.",
      );
    }
  };

  const handleRenameResponsavel = async () => {
    if (!editingResponsavel) return;
    const name = editingName.trim();

    if (!name) {
      setEditingError("Informe o nome do responsável.");
      return;
    }
    if (hasDuplicateName(name, editingResponsavel.id)) {
      setEditingError("Já existe um responsável com esse nome.");
      return;
    }

    try {
      setEditingError("");
      await renameResponsavel.mutateAsync({
        id: editingResponsavel.id,
        nome: name,
      });
      setEditingResponsavel(null);
      toast.success("Nome atualizado em todos os lançamentos.");
    } catch (renameError) {
      const message =
        renameError instanceof Error
          ? renameError.message
          : "Não foi possível alterar o nome.";
      setEditingError(message);
      toast.error(message);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton count={3} />;
  }

  if (error) {
    return <ErrorAlert error={error as Error} onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-6">
      {isAdmin && <AdminAccessCard />}

      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="size-5" />
            </div>
            <div>
              <CardTitle>Responsáveis</CardTitle>
              <CardDescription className="mt-1">
                Gerencie as pessoas atribuídas aos gastos. O titular da conta é
                sempre o responsável principal.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              void handleAddResponsavel();
            }}
          >
            <label className="text-sm font-medium" htmlFor={newNameId}>
              Novo responsável
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                aria-describedby={
                  newNameError
                    ? `${newNameId}-description ${newNameId}-error`
                    : `${newNameId}-description`
                }
                aria-invalid={newNameError ? true : undefined}
                disabled={createResponsavel.isPending}
                id={newNameId}
                maxLength={80}
                onChange={(event) => {
                  setNewName(event.target.value);
                  if (newNameError) setNewNameError("");
                }}
                placeholder="Ex.: Maria"
                value={newName}
              />
              <Button disabled={createResponsavel.isPending} type="submit">
                <Plus />
                {createResponsavel.isPending ? "Adicionando..." : "Adicionar"}
              </Button>
            </div>
            <p
              className="text-xs text-muted-foreground"
              id={`${newNameId}-description`}
            >
              Nomes repetidos não são permitidos, mesmo com letras maiúsculas
              diferentes.
            </p>
            {newNameError && (
              <p
                className="text-sm text-destructive"
                id={`${newNameId}-error`}
                role="alert"
              >
                {newNameError}
              </p>
            )}
          </form>

          <div className="divide-y divide-border rounded-lg border border-border">
            {responsaveis.map((responsavel) => (
              <div
                className="flex items-center justify-between gap-3 p-3"
                key={responsavel.id}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <User className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium text-foreground">
                        {responsavel.nome}
                      </p>
                      {responsavel.isOwner && (
                        <Badge
                          className="border-warning/30 bg-warning/10 text-warning"
                          variant="outline"
                        >
                          Principal
                        </Badge>
                      )}
                    </div>
                    {responsavel.isOwner && (
                      <p className="text-xs text-muted-foreground">
                        Titular vinculado à sua conta
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    aria-label={`Editar nome de ${responsavel.nome}`}
                    onClick={() => {
                      setEditingResponsavel(responsavel);
                      setEditingName(responsavel.nome);
                      setEditingError("");
                    }}
                    size="icon"
                    title="Editar nome"
                    variant="ghost"
                  >
                    <Pencil />
                  </Button>
                  {!responsavel.isOwner && (
                    <Button
                      aria-label={`Remover responsável ${responsavel.nome}`}
                      disabled={deleteResponsavel.isPending}
                      onClick={() => void handleRemoveResponsavel(responsavel)}
                      size="icon"
                      title="Remover responsável"
                      variant="destructive"
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setEditingResponsavel(null);
            setEditingError("");
          }
        }}
        open={!!editingResponsavel}
      >
        <DialogContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleRenameResponsavel();
            }}
          >
            <DialogHeader>
              <DialogTitle>Editar responsável</DialogTitle>
              <DialogDescription>
                O novo nome também será aplicado aos gastos e divisões já
                registrados.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <label
                className="text-sm font-medium"
                htmlFor="edit-responsavel-name"
              >
                Nome
              </label>
              <Input
                aria-describedby={
                  editingError ? "edit-responsavel-error" : undefined
                }
                aria-invalid={editingError ? true : undefined}
                autoFocus
                id="edit-responsavel-name"
                maxLength={80}
                onChange={(event) => {
                  setEditingName(event.target.value);
                  if (editingError) setEditingError("");
                }}
                value={editingName}
              />
              {editingResponsavel?.isOwner && (
                <p className="text-xs text-muted-foreground">
                  Este é o titular da conta e continuará sendo o único
                  responsável principal.
                </p>
              )}
              {editingError && (
                <p
                  className="text-sm text-destructive"
                  id="edit-responsavel-error"
                  role="alert"
                >
                  {editingError}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                onClick={() => setEditingResponsavel(null)}
                type="button"
                variant="outline"
              >
                Cancelar
              </Button>
              <Button disabled={renameResponsavel.isPending} type="submit">
                {renameResponsavel.isPending ? "Salvando..." : "Salvar nome"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Sobre o Sistema</CardTitle>
          <CardDescription>
            Informações sobre o Cartão Inteligente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Versão</p>
              <p className="font-medium">1.0.0</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge className="bg-success/20 text-success" variant="secondary">
                Ativo
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
