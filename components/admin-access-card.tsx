"use client";

import * as React from "react";
import {
  Ban,
  Check,
  Clock3,
  Download,
  History,
  Loader2,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

import type {
  AccessStatus,
  AdminAccessUser,
} from "@/lib/access-control";
import { downloadAccessAuditExport } from "@/lib/access-control";
import {
  useAccessAudit,
  useAccessUsers,
  useSetUserAccessStatus,
} from "@/lib/hooks/useAccessControl";
import { formatDateTime } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ErrorAlert, EmptyState } from "@/components/error";

type AdminTab = "pending" | "approved" | "rejected" | "suspended";
type AdminDecision = "approved" | "rejected" | "suspended";

const statusLabels: Record<AccessStatus, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Recusado",
  suspended: "Suspenso",
  withdrawn: "Retirado",
};

const statusClasses: Record<AccessStatus, string> = {
  pending: "border-warning/30 bg-warning/10 text-warning",
  approved: "border-success/30 bg-success/10 text-success",
  rejected: "border-destructive/30 bg-destructive/10 text-destructive",
  suspended: "border-destructive/30 bg-destructive/10 text-destructive",
  withdrawn: "border-border bg-muted text-muted-foreground",
};

function initials(user: AdminAccessUser) {
  const source = user.displayName || user.email;
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function AccessUserRow({
  user,
  onDecision,
  onHistory,
}: {
  user: AdminAccessUser;
  onDecision: (user: AdminAccessUser, decision: AdminDecision) => void;
  onHistory: (user: AdminAccessUser) => void;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-border py-4 last:border-b-0 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar size="lg">
          {user.avatarUrl && (
            <AvatarImage alt="" src={user.avatarUrl} referrerPolicy="no-referrer" />
          )}
          <AvatarFallback>{initials(user)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium text-foreground">
              {user.displayName || "Usuário Google"}
            </p>
            <Badge
              className={statusClasses[user.status]}
              variant="outline"
            >
              {statusLabels[user.status]}
            </Badge>
            {user.isAdmin && (
              <Badge variant="secondary">
                <ShieldCheck />
                Master
              </Badge>
            )}
          </div>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Solicitação: {formatDateTime(user.lastRequestAt)}
            {user.requestCount > 1 && ` · ${user.requestCount} envios`}
          </p>
          {user.accessExpiresAt && (
            <p className="mt-1 text-xs text-muted-foreground">
              Acesso válido até {formatDateTime(user.accessExpiresAt)}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 sm:justify-end">
        <Button
          aria-label={`Ver histórico de ${user.email}`}
          onClick={() => onHistory(user)}
          size="icon"
          title="Ver histórico"
          variant="ghost"
        >
          <History />
        </Button>

        {!user.isAdmin && user.status !== "approved" && (
          <Button
            onClick={() => onDecision(user, "approved")}
            size="sm"
          >
            <UserCheck />
            {user.status === "suspended" ? "Reativar" : "Aprovar"}
          </Button>
        )}

        {!user.isAdmin && user.status === "pending" && (
          <Button
            onClick={() => onDecision(user, "rejected")}
            size="sm"
            variant="outline"
          >
            <UserX />
            Recusar
          </Button>
        )}

        {!user.isAdmin && user.status === "approved" && (
          <Button
            onClick={() => onDecision(user, "suspended")}
            size="sm"
            variant="destructive"
          >
            <Ban />
            Suspender
          </Button>
        )}
      </div>
    </div>
  );
}

export function AdminAccessCard() {
  const { data: users = [], error, isLoading, refetch } = useAccessUsers();
  const setStatus = useSetUserAccessStatus();
  const [search, setSearch] = React.useState("");
  const [decision, setDecision] = React.useState<{
    user: AdminAccessUser;
    status: AdminDecision;
  } | null>(null);
  const [reason, setReason] = React.useState("");
  const [accessExpiresAt, setAccessExpiresAt] = React.useState("");
  const [isExporting, setIsExporting] = React.useState(false);
  const [historyUser, setHistoryUser] =
    React.useState<AdminAccessUser | null>(null);
  const {
    data: audit = [],
    error: auditError,
    isLoading: auditLoading,
  } = useAccessAudit(historyUser?.userId);

  const filteredUsers = React.useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return users;

    return users.filter(
      (user) =>
        user.email.toLocaleLowerCase("pt-BR").includes(term) ||
        user.displayName?.toLocaleLowerCase("pt-BR").includes(term),
    );
  }, [search, users]);

  const usersByTab = (tab: AdminTab) =>
    filteredUsers.filter((user) => {
      if (tab === "rejected") {
        return user.status === "rejected" || user.status === "withdrawn";
      }
      return user.status === tab;
    });

  const count = (tab: AdminTab) =>
    users.filter((user) => {
      if (tab === "rejected") {
        return user.status === "rejected" || user.status === "withdrawn";
      }
      return user.status === tab;
    }).length;

  const handleDecision = async () => {
    if (!decision) return;
    const requiresReason =
      decision.status === "rejected" || decision.status === "suspended";

    if (requiresReason && reason.trim().length < 3) {
      toast.error("Informe um motivo com pelo menos 3 caracteres.");
      return;
    }

    try {
      await setStatus.mutateAsync({
        userId: decision.user.userId,
        status: decision.status,
        reason,
        accessExpiresAt:
          decision.status === "approved" && accessExpiresAt
            ? new Date(accessExpiresAt).toISOString()
            : undefined,
      });
      toast.success(
        decision.status === "approved"
          ? "Acesso aprovado."
          : decision.status === "rejected"
            ? "Solicitação recusada."
            : "Acesso suspenso.",
      );
      setDecision(null);
      setReason("");
      setAccessExpiresAt("");
    } catch (decisionError) {
      toast.error(
        decisionError instanceof Error
          ? decisionError.message
          : "Não foi possível atualizar o acesso.",
      );
    }
  };

  if (error) {
    return (
      <ErrorAlert
        error={error as Error}
        onRetry={() => void refetch()}
        title="Erro ao carregar o painel administrativo"
      />
    );
  }

  return (
    <>
      <Card className="border-primary/20 bg-card">
        <CardHeader className="border-b border-border">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <CardTitle>Administração de acesso</CardTitle>
                <CardDescription className="mt-1">
                  Analise solicitações e gerencie quem pode entrar no sistema.
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary">
              <Clock3 />
              {count("pending")} pendente{count("pending") === 1 ? "" : "s"}
            </Badge>
            <Button
              disabled={isExporting}
              onClick={async () => {
                setIsExporting(true);
                try {
                  await downloadAccessAuditExport();
                  toast.success("Histórico administrativo exportado.");
                } catch (exportError) {
                  toast.error(
                    exportError instanceof Error
                      ? exportError.message
                      : "Não foi possível exportar o histórico.",
                  );
                } finally {
                  setIsExporting(false);
                }
              }}
              variant="outline"
            >
              {isExporting ? <Loader2 className="animate-spin" /> : <Download />}
              Exportar auditoria
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="relative">
            <label className="sr-only" htmlFor="admin-user-search">
              Buscar usuário por nome ou email
            </label>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              id="admin-user-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome ou email..."
              value={search}
            />
          </div>

          <Tabs defaultValue="pending">
            <TabsList className="max-w-full justify-start overflow-x-auto">
              <TabsTrigger value="pending">
                Pendentes <span className="text-xs">({count("pending")})</span>
              </TabsTrigger>
              <TabsTrigger value="approved">
                Aprovados <span className="text-xs">({count("approved")})</span>
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Encerrados <span className="text-xs">({count("rejected")})</span>
              </TabsTrigger>
              <TabsTrigger value="suspended">
                Suspensos <span className="text-xs">({count("suspended")})</span>
              </TabsTrigger>
            </TabsList>

            {(["pending", "approved", "rejected", "suspended"] as AdminTab[]).map(
              (tab) => {
                const tabUsers = usersByTab(tab);
                return (
                  <TabsContent className="mt-3" key={tab} value={tab}>
                    {isLoading ? (
                      <div className="flex items-center justify-center py-10 text-muted-foreground">
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Carregando usuários...
                      </div>
                    ) : tabUsers.length === 0 ? (
                      <EmptyState
                        description={
                          search
                            ? "Nenhum usuário corresponde à busca atual."
                            : "Não há usuários nesta seção."
                        }
                        icon={Check}
                        title="Tudo organizado"
                      />
                    ) : (
                      <div>
                        {tabUsers.map((user) => (
                          <AccessUserRow
                            key={user.userId}
                            onDecision={(selectedUser, status) => {
                              setReason("");
                              setDecision({ user: selectedUser, status });
                            }}
                            onHistory={setHistoryUser}
                            user={user}
                          />
                        ))}
                      </div>
                    )}
                  </TabsContent>
                );
              },
            )}
          </Tabs>
        </CardContent>
      </Card>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setDecision(null);
            setReason("");
            setAccessExpiresAt("");
          }
        }}
        open={!!decision}
      >
        <DialogContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleDecision();
            }}
          >
            <DialogHeader>
              <DialogTitle>
                {decision?.status === "approved"
                  ? "Aprovar acesso"
                  : decision?.status === "rejected"
                    ? "Recusar solicitação"
                    : "Suspender acesso"}
              </DialogTitle>
              <DialogDescription>
                {decision?.user.email}
              </DialogDescription>
            </DialogHeader>

            {decision?.status === "approved" ? (
              <div className="space-y-2 py-4">
                <label
                  className="text-sm font-medium text-foreground"
                  htmlFor="access-expires-at"
                >
                  Expiração do acesso (opcional)
                </label>
                <Input
                  id="access-expires-at"
                  onChange={(event) => setAccessExpiresAt(event.target.value)}
                  type="datetime-local"
                  value={accessExpiresAt}
                />
                <p className="text-xs text-muted-foreground">
                  Deixe em branco para conceder acesso sem prazo.
                </p>
              </div>
            ) : (
              <div className="space-y-2 py-4">
                <label
                  className="text-sm font-medium text-foreground"
                  htmlFor="access-decision-reason"
                >
                  Motivo
                </label>
                <Input
                  autoFocus
                  id="access-decision-reason"
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Informe uma justificativa..."
                  required
                  value={reason}
                />
                <p className="text-xs text-muted-foreground">
                  O usuário poderá visualizar esta mensagem ao entrar.
                </p>
              </div>
            )}

            <DialogFooter className={decision?.status === "approved" ? "mt-4" : undefined}>
              <Button
                onClick={() => setDecision(null)}
                type="button"
                variant="outline"
              >
                Cancelar
              </Button>
              <Button
                disabled={setStatus.isPending}
                type="submit"
                variant={
                  decision?.status === "approved" ? "default" : "destructive"
                }
              >
                {setStatus.isPending && <Loader2 className="animate-spin" />}
                Confirmar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => !open && setHistoryUser(null)}
        open={!!historyUser}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Histórico de acesso</DialogTitle>
            <DialogDescription>{historyUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] space-y-3 overflow-y-auto py-2">
            {auditLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : auditError ? (
              <p className="text-sm text-destructive">
                Não foi possível carregar o histórico.
              </p>
            ) : audit.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum evento registrado.
              </p>
            ) : (
              audit.map((entry) => (
                <div
                  className="border-b border-border pb-3 last:border-b-0"
                  key={entry.id}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-foreground">
                      {statusLabels[
                        entry.newStatus as keyof typeof statusLabels
                      ] ?? entry.action}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </p>
                  </div>
                  {entry.actorEmail && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Por {entry.actorEmail}
                    </p>
                  )}
                  {entry.reason && (
                    <p className="mt-2 text-sm text-foreground">
                      {entry.reason}
                    </p>
                  )}
                  {entry.accessExpiresAt && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Expira em {formatDateTime(entry.accessExpiresAt)}
                    </p>
                  )}
                  {entry.emailStatus && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Email: {entry.emailStatus}
                      {entry.emailError ? ` (${entry.emailError})` : ""}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
