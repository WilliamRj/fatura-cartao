"use client";

import * as React from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { formatCurrency, formatDateTime, type Fatura } from "@/lib/data";
import { useFaturas, useDeleteFatura } from "@/lib/hooks/useFaturas";
import { LoadingSkeleton } from "@/components/loading";
import { ErrorAlert } from "@/components/error";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { STORAGE, TABLES } from "@/lib/api/endpoints";

const MAX_PDF_SIZE = 20 * 1024 * 1024;

interface DeleteImpact {
  gastos: number;
  parcelamentos: number | null;
  isLoading: boolean;
}

type ImportStatus =
  | "queued"
  | "uploading"
  | "processing"
  | "success"
  | "error";

interface ImportItem {
  id: string;
  file: File;
  status: ImportStatus;
  error?: string;
  requestId?: string;
}

const IMPORT_STATUS_LABELS: Record<ImportStatus, string> = {
  queued: "Aguardando",
  uploading: "Enviando PDF",
  processing: "Processando pela IA",
  success: "Importada",
  error: "Falhou",
};

export function FaturasClient() {
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
  const deleteFatura = useDeleteFatura();
  const queryClient = useQueryClient();

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

  const handleProcess = async () => {
    const pendingItems = importItems.filter(
      (item) => item.status === "queued" || item.status === "error",
    );
    if (pendingItems.length === 0) return;
    setIsProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Usuário não autenticado");
        setIsProcessing(false);
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const item of pendingItems) {
        const { file } = item;
        const pdfPath = `${session.user.id}/${crypto.randomUUID()}.pdf`;
        let importCompleted = false;
        const requestId = crypto.randomUUID();

        try {
          updateImportItem(item.id, {
            status: "uploading",
            error: undefined,
            requestId: undefined,
          });

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

          const response = await fetch("/api/process-fatura", {
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
            }),
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({
              error:
                "A importação foi interrompida antes de receber uma resposta válida.",
            }));
            const details = Array.isArray(errData.detalhes)
              ? errData.detalhes
                  .map(
                    (detail: { campo?: string; mensagem?: string }) =>
                      `${detail.campo}: ${detail.mensagem}`,
                  )
                  .join("; ")
              : "";
            throw new Error(
              [errData.error || "Erro ao processar fatura", details]
                .filter(Boolean)
                .join(" "),
            );
          }

          importCompleted = true;
          successCount += 1;
          updateImportItem(item.id, {
            status: "success",
            requestId,
          });
        } catch (error: unknown) {
          errorCount += 1;
          const message =
            error instanceof Error
              ? error.message
              : "Ocorreu um erro inesperado.";
          updateImportItem(item.id, {
            status: "error",
            error: message,
            requestId,
          });
        } finally {
          if (!importCompleted) {
            await supabase.storage.from(STORAGE.FATURAS).remove([pdfPath]);
          }
        }
      }

      if (successCount > 0) {
        toast.success(
          successCount === 1
            ? "1 fatura importada com sucesso."
            : `${successCount} faturas importadas com sucesso.`,
        );
        await refetch();
        queryClient.invalidateQueries({ queryKey: ["gastos"] });
        queryClient.invalidateQueries({ queryKey: ["parcelamentos"] });
        queryClient.invalidateQueries({ queryKey: ["estatisticas"] });
      }

      if (errorCount > 0) {
        toast.error(
          errorCount === 1
            ? "1 arquivo não foi importado. Confira o motivo abaixo."
            : `${errorCount} arquivos não foram importados. Confira os motivos abaixo.`,
        );
      }
    } catch (error: unknown) {
      console.error(error);
      toast.error(
        "Não foi possível iniciar a importação. Verifique sua conexão e tente novamente.",
      );
    } finally {
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
      gastos: fatura.quantidadeLançamentos,
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
        gastos: fatura.quantidadeLançamentos,
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
    deleteImpact?.gastos ?? faturaToDelete?.quantidadeLançamentos ?? 0;
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
            <input {...getInputProps()} />
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
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-foreground">
                Arquivos selecionados:
              </p>
              {importItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg bg-muted p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      {item.status === "success" ? (
                        <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                      ) : item.status === "error" ? (
                        <CircleX className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                      ) : item.status === "uploading" ||
                        item.status === "processing" ? (
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
                        </p>
                        {item.status === "processing" && item.requestId && (
                          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                            ID: {item.requestId}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setImportItems((items) =>
                          items.filter((current) => current.id !== item.id),
                        )
                      }
                      disabled={
                        item.status === "uploading" ||
                        item.status === "processing"
                      }
                      aria-label={`Remover arquivo ${item.file.name} da seleção`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  {item.error && (
                    <div className="mt-3 rounded-md border border-destructive/20 bg-destructive/5 p-3">
                      <p className="text-sm text-destructive">{item.error}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Nenhum dado deste arquivo foi salvo. Você pode tentar
                        novamente.
                      </p>
                      {item.requestId && (
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          ID da requisição: {item.requestId}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <Button 
                className="w-full mt-4" 
                onClick={handleProcess}
                disabled={
                  isProcessing ||
                  !importItems.some(
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
                  importItems.some((item) => item.status === "error")
                    ? "Tentar novamente"
                    : "Processar faturas"
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                O processamento com IA pode levar alguns minutos. Mantenha esta
                página aberta até cada arquivo exibir o resultado.
              </p>
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
                      {fatura.quantidadeLançamentos}
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
