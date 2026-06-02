"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  CreditCard,
  Calendar,
  TrendingUp,
} from "lucide-react"
import { parcelamentosMock } from "@/lib/mock-data"

export default function ParcelamentosPage() {
  const totalMensal = parcelamentosMock.reduce((acc, p) => acc + p.valorParcela, 0)

  const getCategoriaColor = (categoria: string) => {
    const colors: Record<string, string> = {
      Compras: "bg-chart-3/20 text-chart-3",
      Lazer: "bg-chart-5/20 text-chart-5",
      Outros: "bg-muted text-muted-foreground",
    }
    return colors[categoria] || colors.Outros
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Parcelamentos</h1>
        <p className="text-muted-foreground">Acompanhe seus parcelamentos ativos</p>
      </div>

      {/* Resumo */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Mensal
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">
              R$ {totalMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Somado de todas as parcelas</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Parcelamentos Ativos
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">
              {parcelamentosMock.length}
            </div>
            <p className="text-xs text-muted-foreground">Compras parceladas</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Proximos a Terminar
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">
              {parcelamentosMock.filter(p => p.totalParcelas - p.parcelaAtual <= 3).length}
            </div>
            <p className="text-xs text-muted-foreground">Restam 3 parcelas ou menos</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Parcelamentos */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {parcelamentosMock.map((parcelamento) => {
          const percentual = (parcelamento.parcelaAtual / parcelamento.totalParcelas) * 100
          const valorTotal = parcelamento.valorParcela * parcelamento.totalParcelas
          const valorPago = parcelamento.valorParcela * parcelamento.parcelaAtual
          const valorRestante = valorTotal - valorPago

          return (
            <Card key={parcelamento.id} className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base text-card-foreground">{parcelamento.nome}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className={getCategoriaColor(parcelamento.categoria)}>
                        {parcelamento.categoria}
                      </Badge>
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-card-foreground">
                      R$ {parcelamento.valorParcela.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">por mes</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Progresso</span>
                    <span className="text-sm font-medium text-card-foreground">
                      {parcelamento.parcelaAtual} de {parcelamento.totalParcelas}
                    </span>
                  </div>
                  <Progress value={percentual} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {percentual.toFixed(0)}% concluido
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Valor Total</p>
                    <p className="text-sm font-medium text-card-foreground">
                      R$ {valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valor Restante</p>
                    <p className="text-sm font-medium text-card-foreground">
                      R$ {valorRestante.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {parcelamentosMock.length === 0 && (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm font-medium text-card-foreground">Nenhum parcelamento ativo</p>
            <p className="text-xs text-muted-foreground">Seus parcelamentos aparecerao aqui</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
