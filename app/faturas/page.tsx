"use client";

import * as React from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  Calendar,
  Receipt,
  Clock,
  Trash2,
  Loader2,
  Eye,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/data";
import { useFaturas, useDeleteFatura } from "@/lib/hooks/useFaturas";
import { LoadingSkeleton } from "@/components/loading";
import { ErrorAlert } from "@/components/error";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function FaturasPage() {
  const [uploadedFiles, setUploadedFiles] = React.useState<File[]>([]);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const { data: faturas, isLoading, error, refetch } = useFaturas();
  const deleteFatura = useDeleteFatura();
  const queryClient = useQueryClient();

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    setUploadedFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    multiple: true,
  });

  const handleProcess = async () => {
    if (uploadedFiles.length === 0) return;
    setIsProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Usuário não autenticado");
        setIsProcessing(false);
        return;
      }

      for (const file of uploadedFiles) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/process-fatura", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Erro ao processar fatura");
        }
      }

      toast.success("Faturas processadas com sucesso!");
      setUploadedFiles([]);
      refetch();
      // Invalidate other queries like gastos to update dashboard
      queryClient.invalidateQueries({ queryKey: ['gastos'] });
      queryClient.invalidateQueries({ queryKey: ['parcelamentos'] });
      queryClient.invalidateQueries({ queryKey: ['estatisticas'] });

    } catch (error: unknown) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Ocorreu um erro inesperado";
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Faturas</h1>
          <p className="text-muted-foreground">
            Importe e gerencie suas faturas de cartão de crédito
          </p>
        </div>
        <LoadingSkeleton count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Faturas</h1>
          <p className="text-muted-foreground">
            Importe e gerencie suas faturas de cartão de crédito
          </p>
        </div>
        <ErrorAlert error={error as Error} onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Faturas</h1>
        <p className="text-muted-foreground">
          Importe e gerencie suas faturas de cartão de crédito
        </p>
      </div>

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

          {uploadedFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-foreground">
                Arquivos selecionados:
              </p>
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="text-sm text-foreground">{file.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setUploadedFiles((prev) =>
                        prev.filter((_, i) => i !== index)
                      )
                    }
                    disabled={isProcessing}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button 
                className="w-full mt-4" 
                onClick={handleProcess}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Processar Faturas"
                )}
              </Button>
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
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        if (confirm("Tem certeza que deseja excluir esta fatura?")) {
                          deleteFatura.mutate(fatura.id);
                        }
                      }}
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
    </div>
  );
}
