"use client";

import * as React from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Upload,
  FileText,
  Calendar,
  Receipt,
  Clock,
  Trash2,
  Loader2,
  Eye,
  TriangleAlert,
  CircleCheck,
  CircleX,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/data";
import type { Fatura } from "@/lib/domain/models";
import { useFaturas, useDeleteFatura } from "@/lib/hooks/useFaturas";
import { useImportJobs } from "@/lib/hooks/useImportJobs";
import { LoadingSkeleton } from "@/components/loading";
import { ErrorAlert } from "@/components/error";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { STORAGE, TABLES } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/queryKeys";
import { useAuth } from "@/components/auth-provider";
import { MAX_PDF_SIZE, validatePdfFile } from "@/lib/files/pdf";

interface DeleteImpact {
  gastos: number;
  parcelamentos: number | null;
  isLoading: boolean;
}

type ImportStatus =
  | "queued"
  | "validating"
  | "checking"
  | "uploading"
  | "processing"
  | "success"
  | "duplicate"
  | "error";

interface ImportItem {
  id: string;
  file: File;
  status: ImportStatus;
  error?: string;
  requestId?: string;
  hash?: string;
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
  serverStage?: string;
  progress?: number;
}

const IMPORT_STATUS_LABELS: Record<ImportStatus, string> = {
  queued: "Aguardando",
  validating: "Validando PDF",
  checking: "Verificando duplicidade",
  uploading: "Enviando PDF",
  processing: "Processando em segundo plano",
  success: "Importada",
  duplicate: "Já importada",
  error: "Falhou",
};

const IMPORT_STATUS_PROGRESS: Record<ImportStatus, number> = {
  queued: 0,
  validating: 10,
  checking: 20,
  uploading: 35,
  processing: 65,
  success: 100,
  duplicate: 100,
  error: 100,
};

const PERSISTED_JOB_STATUS_LABELS = {
  queued: "Na fila",
  processing: "Processando",
  success: "Importada",
  duplicate: "Duplicada",
  error: "Falhou",
} as const;

function formatDuration(durationMs?: number) {
  if (durationMs === undefined) {
    return null;
  }

  if (durationMs < 1_000) {
    return `${durationMs} ms`;
  }

  const seconds = Math.round(durationMs / 100) / 10;
  return `${seconds.toLocaleString("pt-BR")} s`;
}

function isActiveImportStatus(status: ImportStatus) {
  return ["validating", "checking", "uploading", "processing"].includes(status);
}

function getCurrentTimestamp() {
  return Date.now();
}

export function FaturasClient() {
  const uploadDescriptionId = React.useId();
  const { user } = useAuth();
  const processingRef = React.useRef(false);
  const [importItems, setImportItems] = React.useState<ImportItem[]>([]);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [viewingFaturaId, setViewingFaturaId] = React.useState<string | null>(
    null,
  );
  const [faturaToDelete, setFaturaToDelete] = React.useState<Fatura | null>(
    null,
  );
  const [deleteImpact, setDeleteImpact] = React.useState<DeleteImpact | null>(
    null,
  );
  const { data: faturas, isLoading, error, refetch } = useFaturas();
  const { data: persistedJobs = [] } = useImportJobs();
  const deleteFatura = useDeleteFatura();
  const queryClient = useQueryClient();
  const reconciledJobIds = React.useRef(new Set<string>());
  const displayedImportItems = React.useMemo(
    () =>
      importItems.map((item) => {
        const job = persistedJobs.find(
          (persistedJob) => persistedJob.requestId === item.requestId,
        );
        if (!job) {
          return item;
        }

        return {
          ...item,
          status:
            job.status === "queued"
              ? ("processing" as const)
              : job.status,
          progress: job.progress,
          error: job.error,
          durationMs: job.durationMs,
          serverStage: job.stage,
          completedAt: job.completedAt
            ? new Date(job.completedAt).getTime()
            : item.completedAt,
        };
      }),
    [importItems, persistedJobs],
  );
  const importSummary = React.useMemo(() => {
    const completed = displayedImportItems.filter((item) =>
      ["success", "duplicate", "error"].includes(item.status),
    ).length;
    const success = displayedImportItems.filter(
      (item) => item.status === "success",
    ).length;
    const failed = displayedImportItems.filter(
      (item) => item.status === "error",
    ).length;
    const duplicates = displayedImportItems.filter(
      (item) => item.status === "duplicate",
    ).length;
    const progress =
      displayedImportItems.length === 0
        ? 0
        : displayedImportItems.reduce(
            (total, item) =>
              total + (item.progress ?? IMPORT_STATUS_PROGRESS[item.status]),
            0,
          ) / displayedImportItems.length;

    return { completed, success, failed, duplicates, progress };
  }, [displayedImportItems]);

  React.useEffect(() => {
    const newlyCompleted = persistedJobs.filter(
      (job) =>
        job.status === "success" && !reconciledJobIds.current.has(job.id),
    );
    if (newlyCompleted.length === 0 || !user) {
      return;
    }

    newlyCompleted.forEach((job) => reconciledJobIds.current.add(job.id));
    void Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.faturas.list(user.id),
        exact: true,
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.gastos.list(user.id),
        exact: true,
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.parcelamentos.list(user.id),
        exact: true,
      }),
    ]);
  }, [persistedJobs, queryClient, user]);

  React.useEffect(() => {
    if (!isProcessing) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isProcessing]);

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    setImportItems((previousItems) => [
      ...previousItems,
      ...acceptedFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        status: "queued" as const,
      })),
    ]);
  }, []);

  const updateImportItem = React.useCallback(
    (id: string, updates: Partial<Omit<ImportItem, "id" | "file">>) => {
      setImportItems((items) =>
        items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
      );
    },
    [],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected: () => {
      toast.error("Selecione apenas arquivos PDF de até 20 MB.");
    },
    accept: {
      "application/pdf": [".pdf"],
    },
    maxSize: MAX_PDF_SIZE,
    multiple: true,
    disabled: isProcessing,
  });

  const handleViewFatura = async (
    faturaId: string,
    arquivoUrl?: string,
  ) => {
    if (!arquivoUrl) {
      toast.error("Esta fatura não possui um PDF armazenado.");
      return;
    }

    const pdfWindow = window.open("about:blank", "_blank");
    if (!pdfWindow) {
      toast.error("Permita pop-ups para visualizar o PDF da fatura.");
      return;
    }

    pdfWindow.opener = null;
    pdfWindow.document.title = "Carregando fatura...";
    setViewingFaturaId(faturaId);

    try {
      const { data, error: signedUrlError } = await supabase.storage
        .from(STORAGE.FATURAS)
        .createSignedUrl(arquivoUrl, 60);

      if (signedUrlError) {
        throw signedUrlError;
      }

      pdfWindow.location.replace(data.signedUrl);
    } catch (error: unknown) {
      pdfWindow.close();
      console.error(error);
      toast.error("Não foi possível abrir o PDF da fatura.");
    } finally {
      setViewingFaturaId(null);
    }
  };

  const handleProcess = async (selectedItemIds?: string[]) => {
    if (processingRef.current) {
      return;
    }

    const pendingItems = importItems.filter((item) => {
      if (selectedItemIds) {
        return selectedItemIds.includes(item.id);
      }

      const displayedItem = displayedImportItems.find(
        (candidate) => candidate.id === item.id,
      );
      return (
        displayedItem?.status === "queued" || displayedItem?.status === "error"
      );
    });
    if (pendingItems.length === 0) return;
    processingRef.current = true;
    setIsProcessing(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Usuário não autenticado");
        return;
      }

      let queuedCount = 0;
      let errorCount = 0;
      let duplicateCount = 0;
      const seenHashes = new Map(
        importItems
          .filter(
            (item) =>
              item.hash &&
              item.status === "success" &&
              !pendingItems.some((pendingItem) => pendingItem.id === item.id),
          )
          .map((item) => [item.hash!, item.id]),
      );

      for (const item of pendingItems) {
        const { file } = item;
        let pdfPath: string | undefined;
        let importCompleted = false;
        const requestId = crypto.randomUUID();
        const startedAt = getCurrentTimestamp();
        try {
          updateImportItem(item.id, {
            status: "validating",
            error: undefined,
            requestId: undefined,
            startedAt,
            completedAt: undefined,
            durationMs: undefined,
            serverStage: undefined,
          });

          const { hash } = await validatePdfFile(file);
          updateImportItem(item.id, { status: "checking", hash });

          const duplicateBatchItemId = seenHashes.get(hash);
          if (duplicateBatchItemId && duplicateBatchItemId !== item.id) {
            duplicateCount += 1;
            updateImportItem(item.id, {
              status: "duplicate",
              error: "Este mesmo PDF já está presente neste lote.",
              completedAt: getCurrentTimestamp(),
              durationMs: getCurrentTimestamp() - startedAt,
            });
            continue;
          }

          const { data: existingFatura, error: duplicateCheckError } =
            await supabase
              .from(TABLES.FATURAS)
              .select("id, mes_referencia")
              .eq("user_id", session.user.id)
              .eq("arquivo_hash", hash)
              .maybeSingle();

          if (duplicateCheckError) {
            throw new Error(
              "Não foi possível verificar se este PDF já foi importado.",
            );
          }

          if (existingFatura) {
            duplicateCount += 1;
            updateImportItem(item.id, {
              status: "duplicate",
              error: `Este PDF já foi importado como a fatura de ${existingFatura.mes_referencia}.`,
              completedAt: getCurrentTimestamp(),
              durationMs: getCurrentTimestamp() - startedAt,
            });
            continue;
          }

          pdfPath = `${session.user.id}/${crypto.randomUUID()}.pdf`;
          updateImportItem(item.id, { status: "uploading" });

          const { error: uploadError } = await supabase.storage
            .from(STORAGE.FATURAS)
            .upload(pdfPath, file, {
              cacheControl: "3600",
              contentType: "application/pdf",
              upsert: false,
            });

          if (uploadError) {
            throw new Error("Não foi possível enviar o PDF para processamento.");
          }

          updateImportItem(item.id, { status: "processing", requestId });

          const response = await fetch("/api/import-jobs", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
              "X-Request-Id": requestId,
            },
            body: JSON.stringify({
              pdfPath,
              fileName: file.name,
              fileSize: file.size,
              fileHash: hash,
              requestId,
            }),
          });

          const responseData = (await response.json().catch(() => ({
            error:
              "A importação não pôde ser registrada pelo servidor.",
          }))) as {
            error?: string;
            job?: {
              id: string;
              request_id: string;
              progress: number;
            };
          };

          if (!response.ok) {
            throw new Error(
              responseData.error || "Não foi possível enfileirar a fatura.",
            );
          }

          importCompleted = true;
          queuedCount += 1;
          seenHashes.set(hash, item.id);
          updateImportItem(item.id, {
            status: "processing",
            requestId,
            progress: responseData.job?.progress ?? 5,
            serverStage: "queued",
          });
          void queryClient.invalidateQueries({
            queryKey: queryKeys.importJobs.list(session.user.id),
            exact: true,
          });
        } catch (error: unknown) {
          errorCount += 1;
          updateImportItem(item.id, {
            status: "error",
            error:
              error instanceof Error
                ? error.message
                : "Ocorreu um erro inesperado.",
            requestId,
            completedAt: getCurrentTimestamp(),
            durationMs: getCurrentTimestamp() - startedAt,
          });
        } finally {
          if (!importCompleted && pdfPath) {
            await supabase.storage.from(STORAGE.FATURAS).remove([pdfPath]);
          }
        }
      }

      if (queuedCount > 0) {
        toast.success(
          queuedCount === 1
            ? "1 fatura enviada para processamento."
            : `${queuedCount} faturas enviadas para processamento.`,
        );
      }

      if (errorCount > 0) {
        toast.error(
          errorCount === 1
            ? "1 arquivo não foi importado. Confira o motivo abaixo."
            : `${errorCount} arquivos não foram importados. Confira os motivos abaixo.`,
        );
      }

      if (duplicateCount > 0) {
        toast.info(
          duplicateCount === 1
            ? "1 PDF duplicado foi ignorado."
            : `${duplicateCount} PDFs duplicados foram ignorados.`,
        );
      }
    } catch (error: unknown) {
      console.error(error);
      toast.error(
        "Não foi possível iniciar a importação. Verifique sua conexão e tente novamente.",
      );
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  };

  const handleDeleteFatura = () => {
    if (!faturaToDelete) {
      return;
    }

    const deletedMonth = faturaToDelete.mesReferencia;
    deleteFatura.mutate(faturaToDelete.id, {
      onSuccess: (result) => {
        setFaturaToDelete(null);
        setDeleteImpact(null);

        if (result.storageCleanupFailed) {
          toast.warning(
            `Fatura de ${deletedMonth} excluída, mas o PDF não pôde ser removido do armazenamento.`,
          );
          return;
        }

        toast.success(
          `Fatura de ${deletedMonth} e ${result.gastos_removidos} lançamentos excluídos.`,
        );
      },
      onError: (deleteError: Error) => {
        console.error(deleteError);
        toast.error("Não foi possível excluir a fatura. Tente novamente.");
      },
    });
  };

  const handleRequestDelete = async (fatura: Fatura) => {
    setFaturaToDelete(fatura);
    setDeleteImpact({
      gastos: fatura.quantidadeLancamentos,
      parcelamentos: null,
      isLoading: true,
    });

    const { data, error: impactError } = await supabase
      .from(TABLES.GASTOS)
      .select("parcela")
      .eq("fatura_id", fatura.id);

    if (impactError) {
      console.error("Não foi possível calcular o impacto da exclusão:", impactError);
      setDeleteImpact({
        gastos: fatura.quantidadeLancamentos,
        parcelamentos: null,
        isLoading: false,
      });
      return;
    }

    const parcelamentos = data.filter(({ parcela }) => {
      if (!parcela) {
        return false;
      }

      const [atual, total, ...extraParts] = parcela.split("/").map(Number);
      return (
        extraParts.length === 0 &&
        Number.isInteger(atual) &&
        Number.isInteger(total)
      );
    }).length;

    setDeleteImpact({
      gastos: data.length,
      parcelamentos,
      isLoading: false,
    });
  };

  const displayedDeleteExpenses =
    deleteImpact?.gastos ?? faturaToDelete?.quantidadeLancamentos ?? 0;
  const displayedDeleteInstallments = deleteImpact?.parcelamentos;

  if (isLoading) {
    return <LoadingSkeleton count={3} />;
  }

  if (error) {
    return <ErrorAlert error={error as Error} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border card-hover">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Fatura
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors duration-200
              ${
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              }
            `}
          >
            <input
              {...getInputProps({
                "aria-label": "Selecionar faturas em PDF para importação",
                "aria-describedby": uploadDescriptionId,
              })}
            />
            <p id={uploadDescriptionId} className="sr-only">
              Selecione um ou mais arquivos PDF para iniciar a importação.
            </p>
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              {isDragActive ? (
                <p className="text-foreground font-medium">
                  Solte o arquivo aqui...
                </p>
              ) : (
                <>
                  <div>
                    <p className="text-foreground font-medium">
                      Arraste e solte seu PDF aqui
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      ou clique para selecionar
                    </p>
                  </div>
                  <Button variant="outline" className="mt-2" disabled={isProcessing}>
                    <Upload className="h-4 w-4 mr-2" />
                    Selecionar Arquivo
                  </Button>
                </>
              )}
            </div>
          </div>

          {importItems.length > 0 && (
            <div className="mt-5 space-y-3">
              <div className="space-y-2 border-y border-border py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Lote de importação
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {importSummary.completed} de {importItems.length} concluídos
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {importSummary.success} importados
                    </Badge>
                    {importSummary.duplicates > 0 && (
                      <Badge variant="outline">
                        {importSummary.duplicates} duplicados
                      </Badge>
                    )}
                    {importSummary.failed > 0 && (
                      <Badge variant="destructive">
                        {importSummary.failed} falharam
                      </Badge>
                    )}
                  </div>
                </div>
                <Progress
                  value={importSummary.progress}
                  aria-label="Progresso total da importação"
                  className="h-2"
                />
              </div>
              {displayedImportItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-md border border-border bg-muted/35 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      {item.status === "success" ? (
                        <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                      ) : item.status === "duplicate" ? (
                        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                      ) : item.status === "error" ? (
                        <CircleX className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                      ) : isActiveImportStatus(item.status) ? (
                        <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-primary" />
                      ) : (
                        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {item.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {IMPORT_STATUS_LABELS[item.status]}
                          {formatDuration(item.durationMs)
                            ? ` · ${formatDuration(item.durationMs)}`
                            : ""}
                        </p>
                        <Progress
                          value={
                            item.progress ?? IMPORT_STATUS_PROGRESS[item.status]
                          }
                          aria-label={`Progresso de ${item.file.name}`}
                          className="mt-2 h-1.5 w-full max-w-xs"
                        />
                        {item.requestId && (
                          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                            ID: {item.requestId}
                          </p>
                        )}
                        {item.serverStage && item.status === "error" && (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Etapa: {item.serverStage}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {item.status === "error" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => void handleProcess([item.id])}
                          disabled={isProcessing}
                          aria-label={`Tentar importar ${item.file.name} novamente`}
                          title="Tentar novamente"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setImportItems((items) =>
                            items.filter((current) => current.id !== item.id),
                          )
                        }
                        disabled={
                          isProcessing || isActiveImportStatus(item.status)
                        }
                        aria-label={`Remover arquivo ${item.file.name} da seleção`}
                        title="Remover arquivo"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {item.error && (
                    <div
                      className={`mt-3 rounded-md border p-3 ${
                        item.status === "duplicate"
                          ? "border-border bg-background/50"
                          : "border-destructive/20 bg-destructive/5"
                      }`}
                    >
                      <p
                        className={`text-sm ${
                          item.status === "duplicate"
                            ? "text-foreground"
                            : "text-destructive"
                        }`}
                      >
                        {item.error}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.status === "duplicate"
                          ? "Nenhum processamento adicional foi executado."
                          : "Nenhum dado deste arquivo foi salvo. Você pode tentar novamente."}
                      </p>
                    </div>
                  )}
                </div>
              ))}
              <Button
                className="mt-4 w-full"
                onClick={() => void handleProcess()}
                disabled={
                  isProcessing ||
                  !displayedImportItems.some(
                    (item) =>
                      item.status === "queued" || item.status === "error",
                  )
                }
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  displayedImportItems.some((item) => item.status === "error")
                    ? "Processar pendentes e falhas"
                    : "Processar faturas"
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Após o envio para a fila, você pode navegar pelo app ou fechar
                esta janela. O resultado ficará salvo nesta lista.
              </p>
            </div>
          )}

          {persistedJobs.length > 0 && (
            <div className="mt-6 border-t border-border pt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Importações recentes
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Acompanhamento persistente do servidor
                  </p>
                </div>
                {persistedJobs.some(
                  (job) =>
                    job.status === "queued" || job.status === "processing",
                ) && (
                  <Badge variant="secondary">
                    <Loader2 className="animate-spin" />
                    Em andamento
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                {persistedJobs.map((job) => (
                  <div
                    key={job.id}
                    className="rounded-md border border-border bg-muted/25 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {job.fileName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {PERSISTED_JOB_STATUS_LABELS[job.status]}
                          {formatDuration(job.durationMs)
                            ? ` · ${formatDuration(job.durationMs)}`
                            : ""}
                        </p>
                      </div>
                      <Badge
                        variant={
                          job.status === "error"
                            ? "destructive"
                            : job.status === "success"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {PERSISTED_JOB_STATUS_LABELS[job.status]}
                      </Badge>
                    </div>
                    <Progress
                      value={job.progress}
                      aria-label={`Progresso persistido de ${job.fileName}`}
                      className="mt-2 h-1.5"
                    />
                    {job.error && (
                      <p className="mt-2 text-xs text-destructive">
                        {job.error}
                      </p>
                    )}
                    <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                      ID: {job.requestId}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Faturas Importadas
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(faturas || []).map((fatura) => (
            <Card
              key={fatura.id}
              className="bg-card border-border hover:border-primary/50 transition-colors"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        void handleViewFatura(fatura.id, fatura.arquivoUrl)
                      }
                      disabled={
                        !fatura.arquivoUrl || viewingFaturaId === fatura.id
                      }
                      aria-label={
                        fatura.arquivoUrl
                          ? `Visualizar PDF da fatura ${fatura.mesReferencia}`
                          : `PDF indisponível para ${fatura.mesReferencia}`
                      }
                      title={
                        fatura.arquivoUrl
                          ? "Visualizar PDF"
                          : "PDF não armazenado"
                      }
                    >
                      {viewingFaturaId === fatura.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => void handleRequestDelete(fatura)}
                      aria-label={`Excluir fatura ${fatura.mesReferencia}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <h3 className="font-semibold text-foreground mb-1">
                  {fatura.mesReferencia}
                </h3>

                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      Valor Total
                    </span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(fatura.valorTotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Lançamentos
                    </span>
                    <Badge variant="secondary">
                      {fatura.quantidadeLancamentos}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Importado em
                    </span>
                    <span className="text-sm text-foreground">
                      {formatDateTime(fatura.dataImportacao)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog
        open={faturaToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleteFatura.isPending) {
            setFaturaToDelete(null);
            setDeleteImpact(null);
          }
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={!deleteFatura.isPending}
        >
          <DialogHeader className="gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <TriangleAlert className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <DialogTitle>
                Excluir fatura de {faturaToDelete?.mesReferencia}?
              </DialogTitle>
              <DialogDescription>
                Esta ação é permanente e não poderá ser desfeita.
              </DialogDescription>
            </div>
          </DialogHeader>

          {faturaToDelete && (
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-foreground">
                    {faturaToDelete.mesReferencia}
                    </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      {displayedDeleteExpenses}{" "}
                      {displayedDeleteExpenses === 1
                        ? "lançamento"
                        : "lançamentos"}
                    </span>
                    <span className="flex items-center gap-1">
                      {deleteImpact?.isLoading ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Calculando parcelamentos...
                        </>
                      ) : displayedDeleteInstallments == null ? (
                        "Parcelamentos vinculados"
                      ) : (
                        <>
                          {displayedDeleteInstallments}{" "}
                          {displayedDeleteInstallments === 1
                            ? "parcelamento"
                            : "parcelamentos"}
                        </>
                      )}
                    </span>
                  </div>
                </div>
                <p className="font-semibold text-foreground">
                  {formatCurrency(faturaToDelete.valorTotal)}
                </p>
              </div>
            </div>
          )}

          <p className="text-sm leading-relaxed text-muted-foreground">
            Todos os lançamentos vinculados e o PDF original armazenado também
            serão removidos.
          </p>

          <DialogFooter>
            <DialogClose
              render={
                <Button
                  variant="outline"
                  disabled={deleteFatura.isPending}
                />
              }
            >
              Cancelar
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDeleteFatura}
              disabled={deleteFatura.isPending || deleteImpact?.isLoading}
            >
              {deleteFatura.isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 />
                  Excluir fatura
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
