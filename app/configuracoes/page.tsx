"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Plus,
  Trash2,
  User,
  Users,
} from "lucide-react"
import { responsaveis as responsaveisIniciais } from "@/lib/mock-data"

export default function ConfiguracoesPage() {
  const [responsaveis, setResponsaveis] = React.useState(responsaveisIniciais)
  const [novoResponsavel, setNovoResponsavel] = React.useState("")

  const handleAddResponsavel = () => {
    if (novoResponsavel.trim() && !responsaveis.includes(novoResponsavel.trim())) {
      setResponsaveis((prev) => [...prev, novoResponsavel.trim()])
      setNovoResponsavel("")
    }
  }

  const handleRemoveResponsavel = (responsavel: string) => {
    setResponsaveis((prev) => prev.filter((r) => r !== responsavel))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Configuracoes</h1>
        <p className="text-muted-foreground">Gerencie as configuracoes do sistema</p>
      </div>

      {/* Responsaveis */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-card-foreground">Responsaveis</CardTitle>
              <CardDescription>Gerencie as pessoas que podem ser atribuidas aos gastos</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Adicionar novo */}
          <div className="flex gap-2">
            <Input
              placeholder="Nome do responsavel..."
              value={novoResponsavel}
              onChange={(e) => setNovoResponsavel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddResponsavel()}
            />
            <Button onClick={handleAddResponsavel}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>

          {/* Lista */}
          <div className="space-y-2">
            {responsaveis.map((responsavel) => (
              <div
                key={responsavel}
                className="flex items-center justify-between rounded-lg border border-border bg-background p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-medium text-card-foreground">{responsavel}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleRemoveResponsavel(responsavel)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {responsaveis.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum responsavel cadastrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informacoes do Sistema */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground">Sobre o Sistema</CardTitle>
          <CardDescription>Informacoes sobre o Cartao Inteligente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Versao</p>
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
            <p className="text-sm text-muted-foreground mb-2">Integracoes Futuras</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">FastAPI</Badge>
              <Badge variant="outline">Supabase</Badge>
              <Badge variant="outline">Upload de PDFs</Badge>
              <Badge variant="outline">Extracao Automatica</Badge>
              <Badge variant="outline">Inteligencia Artificial</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
