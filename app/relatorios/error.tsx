"use client";

import * as React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function RelatoriosError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  React.useEffect(() => {
    console.error("Erro na tela de relatórios:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="max-w-md space-y-4 rounded-xl border border-destructive/30 bg-card p-6 text-center">
        <AlertTriangle className="mx-auto size-8 text-destructive" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Não foi possível exibir os relatórios
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tente carregar novamente. Se o erro ocorreu ao exportar, a página
            continuará disponível após a recuperação.
          </p>
        </div>
        <Button onClick={() => unstable_retry()}>
          <RotateCcw />
          Tentar novamente
        </Button>
      </div>
    </div>
  );
}
