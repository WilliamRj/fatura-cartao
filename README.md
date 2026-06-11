# Cartao Inteligente

Aplicacao web para gerenciar faturas de cartao de credito, importar PDFs de fatura, classificar gastos, dividir despesas por responsavel, acompanhar parcelamentos e gerar relatorios.

## Stack atual

- Next.js `16.2.7` com App Router
- React `19.2.4`
- TypeScript 5
- Tailwind CSS 4
- Base UI/shadcn-style components em `components/ui`
- Supabase Auth + PostgreSQL via `@supabase/supabase-js`
- React Query 5
- Google Gemini para processamento de PDF em `app/api/process-fatura/route.ts`
- Recharts para graficos
- jsPDF + jspdf-autotable para exportacao PDF
- Vercel para deploy

## Funcionalidades implementadas

- Login com Google via Supabase Auth.
- Gate de autorizacao por tabela `authorized_users`.
- Dados isolados por login com filtros `user_id`, cache por usuario e RLS no Supabase.
- Dashboard com total da fatura, gastos pessoais, terceiros, compras e parcelamentos.
- Seletor global de fatura no sidebar/header.
- Importacao de faturas PDF em `app/faturas/page.tsx`, processadas por `/api/process-fatura`.
- Listagem de faturas e exclusao de fatura.
- Tabela de gastos com busca, filtros, ordenacao, edicao de categoria/responsavel/observacao e divisao de valor.
- Parcelamentos derivados dos gastos com campo `parcela`.
- Relatorios por mes, categoria e responsavel.
- Exportacao PDF de relatorio completo ou por responsavel.
- Configuracao de responsaveis e responsavel principal.
- Tema claro/escuro.

## Estrutura do projeto

```text
app/
  api/process-fatura/route.ts      # Processa PDF com Gemini e salva no Supabase
  auth/callback/route.ts           # Callback OAuth do Supabase
  logout/route.ts                  # Logout POST
  page.tsx                         # Dashboard
  faturas/page.tsx                 # Importacao/lista de faturas
  gastos/page.tsx                  # Tabela e edicao de gastos
  parcelamentos/page.tsx           # Parcelamentos derivados de gastos
  relatorios/page.tsx              # Graficos e exportacao PDF
  configuracoes/page.tsx           # Responsaveis
components/
  root-layout-client.tsx           # Providers globais
  auth-provider.tsx                # Sessao e autorizacao
  fatura-provider.tsx              # Fatura atual
  app-sidebar.tsx                  # Navegacao e seletor de fatura
  dashboard-content.tsx            # Dashboard
  ui/                              # Componentes de UI
lib/
  api/endpoints.ts                 # Tabelas e query keys
  api/types.ts                     # Tipos vindos do Supabase
  hooks/                           # Hooks React Query
  supabase/client.ts               # Cliente Supabase browser
  utils/pdfExport.ts               # Exportacao PDF
  data.ts                          # Tipos de dominio, mocks e formatadores
```

## Configuracao local

1. Instale dependencias:

```bash
npm install
```

2. Crie `.env.local` com base em `.env.example`.

Variaveis usadas pelo codigo atual:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
```

Observacao: `SUPABASE_SERVICE_ROLE_KEY` aparece em alguns documentos antigos, mas o codigo atual nao a utiliza. So adicione se uma futura rota server-side realmente precisar dela.

3. Rode o app:

```bash
npm run dev
```

4. Acesse `http://localhost:3000`.

## Scripts atuais

```bash
npm run dev      # servidor de desenvolvimento
npm run build    # build de producao
npm run start    # servir build
npm run lint     # eslint
npx tsc --noEmit # typecheck manual
```

Nao existe script `npm test` configurado atualmente.

## Deploy na Vercel

Configure no projeto da Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`

Tambem configure URLs de OAuth no Google Cloud Console e no Supabase para o dominio da Vercel, incluindo `/auth/callback`.

Antes do deploy com multiplos usuarios, execute no Supabase:

```text
supabase/migrations/20260611_user_data_isolation.sql
```

Pontos de atencao em producao:

- `/api/process-fatura` roda como funcao serverless; PDFs grandes ou IA lenta podem atingir timeout/payload.
- PDFs enviados para a function nao ficam persistidos automaticamente.
- Para auditoria ou reprocessamento, salve PDF/hash em Supabase Storage, Vercel Blob ou outro storage.
- RLS no Supabase e obrigatorio, pois o app fica acessivel remotamente.

## Documentacao

- [ARCHITECTURE.md](./ARCHITECTURE.md): arquitetura atual e fluxo de dados.
- [API_INTEGRATION.md](./API_INTEGRATION.md): schema Supabase e integracao.
- [DEVELOPMENT.md](./DEVELOPMENT.md): guia de desenvolvimento.
- [BACKEND_INTEGRATION_CHECKLIST.md](./BACKEND_INTEGRATION_CHECKLIST.md): checklist operacional de Supabase/Vercel.
- [FUTURAS_MELHORIAS.md](./FUTURAS_MELHORIAS.md): backlog tecnico e de UI.
- [CLAUDE.md](./CLAUDE.md): guia legado para assistentes; pode ser removido se ninguem usar Claude.

## Estado conhecido

Em 2026-06-11:

- `npx tsc --noEmit` passa.
- `npm run lint` falha com erros/warnings documentados em [FUTURAS_MELHORIAS.md](./FUTURAS_MELHORIAS.md).
