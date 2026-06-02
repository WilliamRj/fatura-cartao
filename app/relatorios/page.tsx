"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts"
import { gastosPorCategoria, gastosPorResponsavel, evolucaoMensal } from "@/lib/mock-data"

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

const relatorioMensal = [
  { mes: "Agosto", valor: 2450.00 },
  { mes: "Setembro", valor: 2780.00 },
  { mes: "Outubro", valor: 2156.43 },
  { mes: "Novembro", valor: 2890.00 },
  { mes: "Dezembro", valor: 3521.87 },
  { mes: "Janeiro", valor: 2847.94 },
]

export default function RelatoriosPage() {
  const totalGeral = relatorioMensal.reduce((acc, m) => acc + m.valor, 0)
  const mediaGeral = totalGeral / relatorioMensal.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Relatorios</h1>
        <p className="text-muted-foreground">Analise detalhada dos seus gastos</p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total (6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">
              R$ {totalGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Media Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">
              R$ {mediaGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Maior Gasto Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">
              R$ {Math.max(...relatorioMensal.map(m => m.valor)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Dezembro</p>
          </CardContent>
        </Card>
      </div>

      {/* Grafico por Mes */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground">Total Gasto por Mes</CardTitle>
          <CardDescription>Comparativo dos ultimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={relatorioMensal}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis tickFormatter={(value) => `R$ ${value}`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Valor"]}
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--card-foreground))"
                  }}
                />
                <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Grafico por Categoria */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Total por Categoria</CardTitle>
            <CardDescription>Distribuicao dos gastos do mes atual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gastosPorCategoria}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    dataKey="valor"
                    nameKey="categoria"
                    label={({ categoria, valor }) => `${categoria}: R$ ${valor.toFixed(0)}`}
                    labelLine={{ stroke: "hsl(var(--muted-foreground))" }}
                  >
                    {gastosPorCategoria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Valor"]}
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--card-foreground))"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Grafico por Responsavel */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Total por Responsavel</CardTitle>
            <CardDescription>Quem gastou quanto no mes atual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gastosPorResponsavel}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="responsavel" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis tickFormatter={(value) => `R$ ${value}`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Valor"]}
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--card-foreground))"
                    }}
                  />
                  <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                    {gastosPorResponsavel.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
