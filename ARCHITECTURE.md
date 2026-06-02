# Architecture - Cartão Inteligente

## 📋 Overview

**Cartão Inteligente** é uma aplicação web moderna para gerenciamento de faturas de cartão de crédito, construída com Next.js 15, TypeScript e integrada com Supabase para autenticação e persistência de dados.

### Stack Tecnológico

**Frontend:**
- **Next.js 15** - React framework com App Router
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Design system moderno (cores oklch)
- **shadcn/ui** - Componentes UI reutilizáveis
- **Recharts** - Gráficos e visualizações
- **React Query** - Gerenciamento de cache e estado de dados

**Backend:**
- **Supabase** - Backend como serviço (PostgreSQL + Auth + Storage)
- **OAuth2** - Autenticação com Google

**DevOps:**
- **Next.js API Routes** - Middleware e callbacks de autenticação
- **Environment Variables** - Configuração por ambiente

---

## 🏗️ Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Application                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │   Pages (App)    │  │   Components     │                │
│  ├──────────────────┤  ├──────────────────┤                │
│  │ • Dashboard      │  │ • UI Primitives  │                │
│  │ • Gastos         │  │ • Forms          │                │
│  │ • Faturas        │  │ • Charts         │                │
│  │ • Parcelamentos  │  │ • Loading/Error  │                │
│  │ • Relatórios     │  │ • Auth Provider  │                │
│  │ • Configurações  │  │ • Sidebar        │                │
│  │ • Login          │  │ • Theme          │                │
│  └──────────────────┘  └──────────────────┘                │
│           │                     │                          │
│           └─────────┬───────────┘                          │
│                     │                                      │
│           ┌─────────▼──────────┐                           │
│           │   Hooks & Services │                           │
│           ├────────────────────┤                           │
│           │ • useGastos        │                           │
│           │ • useFaturas       │                           │
│           │ • useParcelamentos │                           │
│           │ • useConfiguracoes │                           │
│           │ • useAuth          │                           │
│           └─────────┬──────────┘                           │
│                     │                                      │
│           ┌─────────▼──────────┐                           │
│           │  API Client Layer  │                           │
│           ├────────────────────┤                           │
│           │ • React Query      │                           │
│           │ • Supabase Client  │                           │
│           └─────────┬──────────┘                           │
│                     │                                      │
│           ┌─────────▼──────────┐                           │
│           │   API Routes       │                           │
│           ├────────────────────┤                           │
│           │ • /auth/callback   │                           │
│           │ • /logout          │                           │
│           └─────────┬──────────┘                           │
└─────────────────────┼──────────────────────────────────────┘
                      │
┌─────────────────────▼──────────────────────────────────────┐
│                    Supabase Backend                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────┐  ┌──────────────────┐      │
│  │ PostgreSQL   │  │   Auth   │  │  Storage (PDFs)  │      │
│  │              │  │ (Google  │  │                  │      │
│  │ • gastos     │  │  OAuth2) │  │ • Fatura PDFs    │      │
│  │ • faturas    │  │          │  │ • Uploads        │      │
│  │ • parcel.    │  │          │  │                  │      │
│  │ • responsav. │  │          │  │                  │      │
│  └──────────────┘  └──────────┘  └──────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📂 Estrutura de Diretórios

```
cartao-inteligente/
├── app/
│   ├── layout.tsx                 # Root layout com providers
│   ├── page.tsx                   # Dashboard
│   ├── globals.css                # Global styles
│   ├── login/
│   │   └── page.tsx              # Login page (Google OAuth)
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts          # OAuth callback handler
│   ├── logout/
│   │   └── route.ts              # Logout handler
│   ├── gastos/
│   │   └── page.tsx              # Expenses page
│   ├── faturas/
│   │   └── page.tsx              # Invoices page
│   ├── parcelamentos/
│   │   └── page.tsx              # Installments page
│   ├── relatorios/
│   │   └── page.tsx              # Reports page
│   └── configuracoes/
│       └── page.tsx              # Settings page
│
├── components/
│   ├── ui/                        # shadcn/ui components
│   ├── root-layout-client.tsx     # Client-side layout wrapper
│   ├── auth-provider.tsx          # Auth state management
│   ├── app-sidebar.tsx            # Navigation sidebar
│   ├── dashboard-content.tsx      # Dashboard component
│   ├── theme-provider.tsx         # Theme management
│   ├── loading.tsx                # Loading UI components
│   ├── error.tsx                  # Error UI components
│   └── theme-provider.tsx         # Next-themes wrapper
│
├── lib/
│   ├── data.ts                    # Types, mock data, utilities
│   ├── utils.ts                   # Utility functions (cn)
│   ├── supabase/
│   │   └── client.ts              # Supabase client initialization
│   ├── api/
│   │   ├── types.ts               # API request/response types
│   │   └── endpoints.ts           # API endpoints constants
│   ├── hooks/
│   │   ├── useGastos.ts           # Expenses data fetching
│   │   ├── useFaturas.ts          # Invoices data fetching
│   │   ├── useParcelamentos.ts    # Installments data fetching
│   │   └── useConfiguracoes.ts    # Settings data fetching
│   └── mocks/
│       ├── data.ts                # Mock data for testing
│       ├── handlers.ts            # MSW handlers
│       └── server.ts              # MSW server setup
│
├── public/                        # Static assets
│
├── .env.example                   # Environment template
├── .env.local                     # Local environment (git-ignored)
├── next.config.ts                 # Next.js configuration
├── tailwind.config.ts             # Tailwind configuration
├── tsconfig.json                  # TypeScript configuration
├── eslint.config.mjs              # ESLint configuration
├── postcss.config.mjs             # PostCSS configuration
├── package.json                   # Dependencies
└── README.md                      # Project documentation
```

---

## 🔄 Data Flow

### 1. **Autenticação (OAuth2 Google)**

```
User clicks "Login" → Google Login Page → OAuth Callback → 
Supabase Session Created → AuthProvider Updates State → 
Redirect to Dashboard
```

### 2. **Fetching de Dados**

```
Component Renders → useGastos Hook → React Query Cache Check →
If Stale → Supabase Query → Cache Updated → Component Re-renders
```

### 3. **Mutação de Dados (Criar/Atualizar)**

```
User Fills Form → Validation (Zod) → useMutation Called →
Supabase Update → Toast Notification → React Query Invalidation →
Cache Refreshed → Component Updates
```

### 4. **Upload de Arquivo**

```
User Selects PDF → File Validation → Supabase Storage Upload →
Create Fatura Record → Database Sync → List Updated
```

---

## 🧩 Padrões de Componentes

### 1. **Páginas (Client Components)**

Todas as páginas são "use client" com estado local:

```typescript
"use client";

export default function GastosPage() {
  const { data, isLoading, error } = useGastos();

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorAlert error={error} />;

  return (
    <div>
      {/* Page content */}
    </div>
  );
}
```

### 2. **Hooks de Dados**

Padrão React Query + Supabase:

```typescript
export function useGastos() {
  return useQuery({
    queryKey: QUERY_KEYS.GASTOS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gastos')
        .select('*')
        .order('data', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
```

### 3. **Componentes de Formulário**

Validação com Zod + react-hook-form:

```typescript
const schema = zod.object({
  categoria: zod.string().min(1),
  responsavel: zod.string().min(1),
});

const { register, handleSubmit } = useForm({ resolver: zodResolver(schema) });
```

---

## 🔐 Estado de Autenticação

**AuthProvider** gerencia o estado global de autenticação:

```typescript
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}
```

**Fluxo:**
1. Na montagem, verifica se há sessão ativa
2. Escuta mudanças de autenticação do Supabase
3. Se não autenticado, renderiza LoginPage
4. Se autenticado, renderiza aplicação

---

## 📊 State Management

**Local Component State:**
- Filtros, busca, paginação
- Diálogos e modais
- Formulários

**React Query Cache:**
- Dados de gastos, faturas, parcelamentos
- Invalidação automática após mutações
- Stale time: 5 minutos

**Global Auth State:**
- Usuário atual
- Status de loading
- Token de sessão (gerenciado por Supabase)

---

## 🔌 Integração com Supabase

### Tabelas Necessárias

```sql
-- gastos (despesas)
-- faturas (notas fiscais)
-- parcelamentos (compras parceladas)
-- responsaveis (usuários)
```

### Row Level Security (RLS)

Todas as tabelas devem ter políticas RLS:
- Usuários só veem seus próprios dados
- Service role key pode gerenciar tudo

### Storage

- Bucket: `faturas` para PDFs de faturas
- Pasta por usuário: `/user_id/`

---

## ⚙️ Configuração de Ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
NEXT_PUBLIC_APP_NAME=Cartão Inteligente
NEXT_PUBLIC_VERSION=1.0.0
```

---

## 🎯 Fluxo de Desenvolvimento

### Adicionar Nova Página

1. Criar `/app/[feature]/page.tsx`
2. Criar hook em `/lib/hooks/use[Feature].ts`
3. Implementar componente com loading/error states
4. Adicionar route na sidebar

### Adicionar Nova API Call

1. Estender hook em `/lib/hooks/`
2. Adicionar tipo em `/lib/api/types.ts`
3. Usar mutation para criar/atualizar
4. Invalidar cache após sucesso

---

## 📈 Performance

- **React Query Caching**: 5 min stale time
- **Code Splitting**: Automático com Next.js
- **Image Optimization**: Usar next/image quando possível
- **Lazy Loading**: Modais e gráficos

---

## 🧪 Testing

- **Unit**: Hooks com Mock Service Worker (MSW)
- **Integration**: Páginas com React Testing Library
- **E2E**: Cypress ou Playwright (futuro)

Mock data disponível em `/lib/mocks/` para testes.

---

## 🚀 Deployment

- **Hosting**: Vercel (otimizado para Next.js)
- **Database**: Supabase (PostgreSQL gerenciado)
- **Storage**: Supabase Storage para PDFs
- **CI/CD**: GitHub Actions (recomendado)

---

## 📚 Recursos Adicionais

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [React Query Docs](https://tanstack.com/query/latest)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
