"use client";

import * as React from "react";
import {
  Ban,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  LogOut,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

import type { AccessProfile } from "@/lib/access-control";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

interface AccessStatusClientProps {
  profile: AccessProfile;
  onRefresh: () => Promise<void>;
  onRenew: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onWithdraw: () => Promise<void>;
}

const statusContent = {
  pending: {
    icon: Clock3,
    title: "Solicitação em análise",
    description:
      "Recebemos seu pedido de acesso. Um administrador avaliará a solicitação e você poderá consultar a situação mais tarde.",
  },
  rejected: {
    icon: ShieldAlert,
    title: "Acesso não liberado",
    description:
      "Sua solicitação não foi aprovada neste momento. Você pode enviar um novo pedido para retornar à análise.",
  },
  suspended: {
    icon: Ban,
    title: "Acesso suspenso",
    description:
      "Seu acesso ao sistema foi suspenso por um administrador. Entre em contato com o responsável pelo sistema para mais informações.",
  },
  withdrawn: {
    icon: RotateCcw,
    title: "Solicitação retirada",
    description:
      "Você retirou seu pedido de acesso. Quando desejar, poderá enviar uma nova solicitação para análise.",
  },
} as const;

type AccessAction = "refresh" | "renew" | "withdraw" | "signout";

export function AccessStatusClient({
  profile,
  onRefresh,
  onRenew,
  onSignOut,
  onWithdraw,
}: AccessStatusClientProps) {
  const [action, setAction] = React.useState<AccessAction | null>(null);
  const content =
    statusContent[profile.status as keyof typeof statusContent] ??
    statusContent.pending;
  const StatusIcon = content.icon;

  const runAction = async (
    currentAction: AccessAction,
    callback: () => Promise<void>,
    successMessage?: string,
  ) => {
    try {
      setAction(currentAction);
      await callback();
      if (successMessage) {
        toast.success(successMessage);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir esta ação.",
      );
    } finally {
      setAction(null);
    }
  };

  const isPending = action !== null;

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center border-b border-border/80 px-5 sm:px-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary">
              <CreditCard className="size-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <p className="font-semibold text-foreground">Cartão Inteligente</p>
              <p className="text-xs text-muted-foreground">Controle de acesso</p>
            </div>
          </div>
          <ThemeToggle className="border border-border/70 bg-background shadow-sm hover:bg-muted" />
        </div>
      </header>

      <section className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <Card className="w-full max-w-lg gap-0 overflow-hidden py-0 shadow-xl shadow-foreground/5">
          <CardHeader className="items-center gap-3 border-b border-border/70 px-6 py-8 text-center sm:px-8">
            <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <StatusIcon className="size-6" />
            </div>
            <CardTitle className="text-xl">{content.title}</CardTitle>
            <CardDescription className="max-w-md leading-relaxed">
              {content.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 px-6 py-7 sm:px-8">
            <div className="rounded-lg border border-border bg-muted/35 p-4">
              <p className="text-sm font-medium text-foreground">
                {profile.displayName || "Conta Google"}
              </p>
              <p className="break-all text-sm text-muted-foreground">
                {profile.email}
              </p>
              {profile.decisionReason && (
                <div className="mt-3 border-t border-border pt-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Motivo informado
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {profile.decisionReason}
                  </p>
                </div>
              )}
            </div>

            {profile.status === "pending" && (
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                <p>
                  Não é necessário enviar outro pedido. Use “Verificar situação”
                  quando voltar.
                </p>
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              {(profile.status === "rejected" ||
                profile.status === "withdrawn") && (
                <Button
                  disabled={isPending}
                  onClick={() =>
                    void runAction(
                      "renew",
                      onRenew,
                      "Nova solicitação enviada para análise.",
                    )
                  }
                >
                  {action === "renew" ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <RotateCcw />
                  )}
                  Solicitar nova análise
                </Button>
              )}

              {profile.status === "pending" && (
                <Button
                  disabled={isPending}
                  onClick={() => void runAction("refresh", onRefresh)}
                >
                  {action === "refresh" ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <RefreshCw />
                  )}
                  Verificar situação
                </Button>
              )}

              {profile.status === "pending" && (
                <Button
                  disabled={isPending}
                  variant="outline"
                  onClick={() =>
                    void runAction(
                      "withdraw",
                      onWithdraw,
                      "Solicitação retirada.",
                    )
                  }
                >
                  Retirar solicitação
                </Button>
              )}

              <Button
                className={
                  profile.status === "suspended" ? "sm:col-span-2" : undefined
                }
                disabled={isPending}
                variant="outline"
                onClick={() => void runAction("signout", onSignOut)}
              >
                {action === "signout" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <LogOut />
                )}
                Usar outra conta
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
