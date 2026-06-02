# Development Guide - Cartão Inteligente

## 🚀 Quick Start

### Pré-requisitos

- Node.js 18+ ([download](https://nodejs.org))
- npm ou yarn
- Git
- Conta Supabase ([criar aqui](https://supabase.com))

### Instalação Local

```bash
# 1. Clone o repositório
git clone <repo-url>
cd cartao-inteligente

# 2. Instale as dependências
npm install

# 3. Configure variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais Supabase

# 4. Rode o servidor de desenvolvimento
npm run dev

# 5. Abra http://localhost:3000
```

---

## 📂 Estrutura do Projeto

```
cartao-inteligente/
├── app/                    # Next.js pages (App Router)
├── components/             # React components
├── lib/                    # Utilities, types, hooks
├── public/                 # Static files
└── [config files]          # tsconfig, next.config, etc
```

### Principais Diretórios

**`/app`** - Páginas Next.js
- `page.tsx` = arquivo de página
- `layout.tsx` = layout compartilhado
- `route.ts` = API route

**`/components`**
- `ui/` = shadcn/ui components
- Outros = componentes customizados

**`/lib`**
- `supabase/` = cliente Supabase
- `api/` = tipos e endpoints
- `hooks/` = React hooks para data fetching
- `mocks/` = dados mockados para testes

---

## 🛠️ Desenvolvimento Diário

### Adicionar Nova Página

**1. Criar arquivo de página:**

```typescript
// app/minhas-vendas/page.tsx
"use client";

export default function MinhasVendasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Minhas Vendas</h1>
      </div>
      {/* Conteúdo */}
    </div>
  );
}
```

**2. Adicionar rota na sidebar** (`components/app-sidebar.tsx`):

```typescript
const menuItems = [
  // ...
  { href: "/minhas-vendas", label: "Minhas Vendas", icon: TrendingUp },
];
```

**3. Se precisar dados:**
   - Criar hook em `/lib/hooks/use-minhas-vendas.ts`
   - Usar em componente

### Criar um Hook de Data Fetching

**Pattern:**

```typescript
// lib/hooks/useMeusDados.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { TABLES, QUERY_KEYS } from "@/lib/api/endpoints";

export function useMeusDados() {
  return useQuery({
    queryKey: QUERY_KEYS.MEU_DADOS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.MEUS_DADOS)
        .select("*");

      if (error) throw error;
      return data;
    },
  });
}

// No componente:
export default function Component() {
  const { data, isLoading, error } = useMeusDados();

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorAlert error={error} />;

  return (
    <div>
      {data?.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}
```

### Criar um Componente

**Pattern com shadcn/ui:**

```typescript
// components/meu-componente.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MeuComponenteProps {
  titulo: string;
  descricao?: string;
}

export function MeuComponente({ titulo, descricao }: MeuComponenteProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        {descricao && <p>{descricao}</p>}
        <Button>Ação</Button>
      </CardContent>
    </Card>
  );
}
```

### Adicionar Validação de Formulário

```typescript
// Com zod + react-hook-form
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  nome: z.string().min(1, "Nome obrigatório"),
  email: z.string().email("Email inválido"),
  valor: z.number().min(0, "Valor deve ser positivo"),
});

type FormData = z.infer<typeof schema>;

export function MeuForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormData) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input {...register("nome")} />
      {errors.nome && <span>{errors.nome.message}</span>}
      {/* ... */}
    </form>
  );
}
```

---

## 🎨 Estilo e Design

### Usando Tailwind CSS

```typescript
// Classes úteis
<div className="space-y-4">              {/* Gap vertical */}
<div className="grid gap-4 md:grid-cols-2">  {/* Grid responsivo */}
<div className="text-muted-foreground">  {/* Cor secundária */}
<button className="rounded-lg px-4 py-2"> {/* Padding e border-radius */}
```

### Theme - Claro/Escuro

Automático com `next-themes`. Use classes:

```typescript
// Light mode (default)
<div className="bg-white text-black">

// Dark mode
<div className="dark:bg-slate-950 dark:text-white">

// Ou use CSS variables
<div className="bg-background text-foreground">
```

---

## 📊 Gráficos com Recharts

```typescript
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const data = [
  { name: "Jan", value: 100 },
  { name: "Fev", value: 200 },
];

export function MeuGrafico() {
  return (
    <BarChart width={400} height={300} data={data}>
      <CartesianGrid />
      <XAxis dataKey="name" />
      <YAxis />
      <Bar dataKey="value" fill="#0ea5e9" />
    </BarChart>
  );
}
```

---

## 🧪 Testing

### Testar com Mock Data

```typescript
// lib/mocks/handlers.ts - Mock Service Worker
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/gastos", () => {
    return HttpResponse.json([
      { id: "1", estabelecimento: "Teste", valor: 100 },
    ]);
  }),
];
```

### Rodar Testes

```bash
npm test
```

---

## 🐛 Debugging

### Console Browser

```typescript
// Use console.log para debug
console.log("Dados:", data);
console.error("Erro:", error);
```

### React DevTools

- Instale extensão do Chrome
- Inspect componentes, props, state
- Profiler para performance

### Supabase Studio

- Veja dados em tempo real
- Execute queries SQL
- Monitor logs

---

## 🚀 Build e Deploy

### Build Local

```bash
npm run build
npm start
```

### Deploy no Vercel

```bash
# Se estiver conectado ao repo GitHub
# Push para main e Vercel auto-deploya

# Ou manual:
npm install -g vercel
vercel
```

### Variáveis de Ambiente em Produção

- Vá para Vercel Dashboard → Settings → Environment Variables
- Adicione:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

---

## 📚 Convenções e Padrões

### Naming

- Arquivos: `kebab-case` (ex: `my-component.tsx`)
- Variáveis/Funções: `camelCase` (ex: `getUserData()`)
- Tipos/Interfaces: `PascalCase` (ex: `UserData`)
- Classes CSS: `kebab-case` (ex: `my-class`)

### Imports

```typescript
// Sempre usar path aliases
import { Button } from "@/components/ui/button";
import { useGastos } from "@/lib/hooks/useGastos";

// Não:
import { Button } from "../../../components/ui/button";
```

### Componentes

- Sempre adicionar `"use client"` se usar hooks
- Usar TypeScript para props
- Documentar com comentários se complexo

### Git Commits

```bash
# Format: type(scope): message
git commit -m "feat(gastos): add edit modal"
git commit -m "fix(dashboard): correct chart colors"
git commit -m "docs(readme): update setup instructions"

# Types: feat, fix, docs, style, refactor, test, chore
```

---

## 🚨 Troubleshooting

### "Cannot find module '@/...'"

- Verifique se o arquivo existe
- Verifique o path alias em `tsconfig.json`
- Restart dev server

### "RLS policy not found"

- Verifique se está logado
- Check Supabase RLS policies
- Tente com service_role_key

### "Hydration mismatch"

- Adicione `"use client"` em componentes com hooks
- Use `useEffect` para dados que só existem no cliente

### Dev server travado

```bash
# Kill processo
lsof -ti:3000 | xargs kill -9

# Limpar cache
rm -rf .next node_modules/.cache

# Restart
npm run dev
```

---

## 📚 Links Úteis

- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [Tailwind Docs](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Supabase Docs](https://supabase.com/docs)
- [React Query](https://tanstack.com/query/latest)

---

## 💡 Tips

1. **Sempre commit frequente** - Pequenos commits são mais fáceis de reverter
2. **Teste em ambos os temas** - Light mode + Dark mode
3. **Mobile first** - Teste em mobile desde o início
4. **Performance** - Use React DevTools Profiler para identificar renders lentos
5. **Acessibilidade** - Não ignore warnings de acessibilidade

---

## 📞 Need Help?

- Cheque [ARCHITECTURE.md](./ARCHITECTURE.md) para visão geral
- Cheque [API_INTEGRATION.md](./API_INTEGRATION.md) para detalhes de backend
- Abra issue no GitHub
- Pergunte no Discord
