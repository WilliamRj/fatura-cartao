# Cartão Inteligente - Development Guidelines

## 📚 Documentação

Todos os desenvolvedores devem ler estes docs em ordem:

1. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Visão geral de arquitetura e como tudo se conecta
2. **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Setup local e como desenvolver novas features
3. **[API_INTEGRATION.md](./API_INTEGRATION.md)** - Detalhes de integração com Supabase
4. **[BACKEND_INTEGRATION_CHECKLIST.md](./BACKEND_INTEGRATION_CHECKLIST.md)** - Checklist completo para deploy

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Styling**: Tailwind CSS 4 (cores oklch)
- **Components**: shadcn/ui (personalizados para este projeto)
- **Data Fetching**: React Query + Supabase Client
- **Auth**: Supabase Auth (OAuth2 Google)
- **Validation**: Zod + react-hook-form
- **Notifications**: Sonner (toasts)
- **Charts**: Recharts

## 🔑 Key Decisions

### Autenticação: OAuth2 Google
- **Por quê**: Seguro, fácil para usuários, gerenciado por Supabase
- **Setup**: Veja [API_INTEGRATION.md](./API_INTEGRATION.md#passo-2-habilitar-google-oauth)

### Backend: Supabase
- **Por quê**: PostgreSQL gerenciado + Auth + Storage integrados
- **Vantagens**: Sem servidor backend customizado, RLS para segurança
- **Banco**: PostgreSQL com 4 tabelas principais (gastos, faturas, parcelamentos, responsaveis)

### State Management: React Query + Local State
- **Global**: React Query cache para dados remotos
- **Local**: useState para UI state (filtros, modals, etc)
- **Auth**: Context API (AuthProvider)
- **Por quê**: Simples, escalável, bom suporte

### Validação: Zod + react-hook-form
- **Por quê**: Type-safe, reusable, funciona bem com React
- **Pattern**: Definir schema zod, usar com react-hook-form

## 📂 Project Structure

```
/app           → Next.js pages (App Router)
/components    → React components
  /ui          → shadcn/ui components
/lib           → Utilities, types, hooks
  /supabase    → Supabase client
  /api         → Types & endpoints constants
  /hooks       → React hooks for data
  /mocks       → Mock data for testing
```

## 🔄 Data Flow

1. **Pages** fazem import de **Hooks**
2. **Hooks** usam **React Query** + **Supabase Client**
3. **Supabase** retorna dados com **RLS** validation
4. **Components** renderizam dados com **loading/error states**

## 🎯 Development Patterns

### Novo Hook para Data Fetching

```typescript
export function useMeusDados() {
  return useQuery({
    queryKey: QUERY_KEYS.MEUS_DADOS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tabela')
        .select('*');
      if (error) throw error;
      return data;
    }
  });
}
```

### Formulário com Validação

```typescript
const schema = zod.object({
  nome: zod.string().min(1, 'Obrigatório')
});

const { register, handleSubmit } = useForm({
  resolver: zodResolver(schema)
});
```

### Página com Loading/Error

```typescript
export default function Page() {
  const { data, isLoading, error } = useGastos();

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorAlert error={error} />;

  return <div>{/* Conteúdo */}</div>;
}
```

## ⚙️ Environment Setup

Copie `.env.example` para `.env.local` e preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=seu_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_aqui
```

## 🚀 Quick Commands

```bash
npm install              # Install dependencies
npm run dev             # Start dev server
npm run build           # Build for production
npm run lint            # Run ESLint
npx tsc --noEmit       # Type check
npm test               # Run tests
```

## ✅ Before Committing

- [ ] `npm run lint` passa sem erros
- [ ] `npx tsc --noEmit` passa sem erros
- [ ] Testou em mobile e desktop
- [ ] Testou light mode e dark mode
- [ ] Commit message segue padrão: `type(scope): message`

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| "Cannot find module" | `npm install`, restart dev server |
| "RLS violation" | Verifique policies no Supabase |
| "OAuth error" | Verifique .env e Google Console config |
| "Hydration mismatch" | Adicione "use client" no componente |

## 📞 When to Use What

- **useState**: UI state (modals, filters, form inputs)
- **React Query**: Remote data (gastos, faturas, etc)
- **Context**: Global auth state (user, sign out)
- **localStorage**: Client-only preferences (nunca dados sensíveis)

## 🚫 Never Do

- ❌ Commit `.env.local` ou variáveis sensíveis
- ❌ Usar `axios` se já temos `supabase` client
- ❌ Mudar theme colors sem coordenar design
- ❌ Remover ou alterar políticas RLS sem motivo
- ❌ Deixar `console.log` ou `console.error` em produção

## 📚 Learning Resources

- [Next.js 15 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [React Query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Zod](https://zod.dev)

## 🎓 Recommended Reading Order

1. [ARCHITECTURE.md](./ARCHITECTURE.md) - 10 min
2. [DEVELOPMENT.md](./DEVELOPMENT.md) - 15 min
3. [API_INTEGRATION.md](./API_INTEGRATION.md) - 20 min
4. Este arquivo (CLAUDE.md) - 10 min

Total: ~55 min para estar pronto para desenvolver

---

@AGENTS.md
