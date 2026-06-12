"use client"

import * as React from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Plus,
  Trash2,
  User,
  Users,
  Star,
} from "lucide-react"
import { useResponsaveis, useCreateResponsavel, useDeleteResponsavel, useSetResponsavelPrincipal } from "@/lib/hooks/useResponsaveis"
import { LoadingSkeleton } from "@/components/loading"
import { ErrorAlert } from "@/components/error"
import { cn } from "@/lib/utils"

export function ConfiguracoesClient() {
  const { data: responsaveisData = [], isLoading, error, refetch } = useResponsaveis()
  const createResponsavel = useCreateResponsavel()
  const deleteResponsavel = useDeleteResponsavel()
  const setResponsavelPrincipal = useSetResponsavelPrincipal()

  const [novoResponsavel, setNovoResponsavel] = React.useState("")

  const handleAddResponsavel = async () => {
    if (novoResponsavel.trim()) {
      const exists = responsaveisData.some((r) => r.nome.toLowerCase() === novoResponsavel.trim().toLowerCase())
      if (!exists) {
        try {
          await createResponsavel.mutateAsync({ nome: novoResponsavel.trim() })
          setNovoResponsavel("")
          refetch()
          toast.success("Responsável adicionado com sucesso!")
        } catch (error: unknown) {
          console.error("Erro ao criar responsável", error)
          const message = error instanceof Error ? error.message : "Erro desconhecido"
          toast.error(`Erro ao criar responsável: ${message}`)
        }
      } else {
        toast.warning("Responsável já existe!")
      }
    }
  }

  const handleRemoveResponsavel = async (id: string) => {
    try {
      await deleteResponsavel.mutateAsync(id)
      refetch()
      toast.success("Responsável removido com sucesso!")
    } catch (error) {
      console.error("Erro ao remover responsável", error)
      toast.error("Erro ao remover responsável")
    }
  }

  const handleSetPrincipal = async (id: string) => {
    try {
      await setResponsavelPrincipal.mutateAsync(id)
      refetch()
      toast.success("Responsável principal definido com sucesso!")
    } catch (error) {
      console.error("Erro ao definir responsável principal", error)
      toast.error("Erro ao definir responsável principal")
    }
  }

  if (isLoading) {
    return <LoadingSkeleton count={3} />
  }

  if (error) {
    return <ErrorAlert error={error as Error} onRetry={() => refetch()} />
  }

  return (
    <div className="space-y-6">
      {/* Responsaveis */}
      <Card className="bg-card border-border card-hover">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-card-foreground">Responsáveis</CardTitle>
              <CardDescription>Gerencie as pessoas que podem ser atribuídas aos gastos</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Adicionar novo */}
          <div className="flex gap-2">
            <Input
              placeholder="Nome do responsável..."
              value={novoResponsavel}
              onChange={(e) => setNovoResponsavel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddResponsavel()}
              disabled={createResponsavel.isPending}
            />
            <Button onClick={handleAddResponsavel} disabled={createResponsavel.isPending}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>

          {/* Lista */}
          <div className="space-y-2">
            {responsaveisData.map((responsavel) => (
              <div
                key={responsavel.id}
                className="flex items-center justify-between rounded-lg border border-border bg-background p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-medium text-card-foreground">{responsavel.nome}</span>
                  {responsavel.cor === 'pessoal' && (
                    <Badge variant="outline" className="ml-2 bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                      Principal
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10"
                    onClick={() => handleSetPrincipal(responsavel.id)}
                    disabled={setResponsavelPrincipal.isPending || responsavel.cor === 'pessoal'}
                    aria-label={
                      responsavel.cor === 'pessoal'
                        ? `${responsavel.nome} já é o responsável principal`
                        : `Definir ${responsavel.nome} como responsável principal`
                    }
                    title="Definir como principal"
                  >
                    <Star className={cn("h-4 w-4", responsavel.cor === 'pessoal' ? "fill-yellow-500 text-yellow-500" : "")} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemoveResponsavel(responsavel.id)}
                    disabled={deleteResponsavel.isPending}
                    aria-label={`Remover responsável ${responsavel.nome}`}
                    title="Remover responsável"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {responsaveisData.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum responsável cadastrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informações do Sistema */}
      <Card className="bg-card border-border card-hover">
        <CardHeader>
          <CardTitle className="text-card-foreground">Sobre o Sistema</CardTitle>
          <CardDescription>Informações sobre o Cartão Inteligente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Versão</p>
              <p className="font-medium text-card-foreground">1.0.0</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant="secondary" className="bg-success/20 text-success">
                Ativo
              </Badge>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground mb-2">Integrações Futuras</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">FastAPI</Badge>
              <Badge variant="outline">Supabase</Badge>
              <Badge variant="outline">Upload de PDFs</Badge>
              <Badge variant="outline">Extração Automática</Badge>
              <Badge variant="outline">Inteligência Artificial</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
