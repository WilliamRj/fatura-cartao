# Arquitetura atual

Este documento descreve o estado observado no codigo em 2026-06-11. Ele nao presume recursos que ainda nao foram implementados no Supabase ou na Vercel.

## Visao geral

```text
Browser
  |
  |-- Next.js App Router / Client Components
  |     |-- AuthProvider
  |     |-- FaturaProvider
  |     |-- React Query
  |     |-- Supabase browser client
  |
  |-- POST /api/process-fatura
        |-- valida token Supabase
        |-- envia PDF ao Gemini
        |-- salva fatura e gastos no Supabase

Servicos externos
  |-- Supabase Auth
  |-- Supabase PostgreSQL + RLS
  |-- Google OAuth
  |-- Google Gemini
  |-- Vercel
```

## Stack

- Next.js `16.2.7`, App Router.
- React `19.2.4`.
- TypeScript 5 em modo `strict`.
- Tailwind CSS 4.
- Base UI e componentes shadcn-style.
- React Query 5.
- Supabase JS 2.
- Google Gemini via `@google/generative-ai`.
- Recharts.
- jsPDF e jspdf-autotable.
- Vercel como plataforma de deploy.

Por instrucao de `AGENTS.md`, alteracoes relacionadas ao Next.js devem consultar primeiro os guias em `node_modules/next/dist/docs/`.

## Rotas

| Rota | Arquivo | Responsabilidade |
|---|---|---|
| `/` | `app/page.tsx` | Dashboard |
| `/login` | `app/login/page.tsx` | Login Google |
| `/faturas` | `app/faturas/page.tsx` | Importar, listar e excluir faturas |
| `/gastos` | `app/gastos/page.tsx` | Filtrar e editar gastos |
| `/parcelamentos` | `app/parcelamentos/page.tsx` | Exibir parcelas derivadas dos gastos |
| `/relatorios` | `app/relatorios/page.tsx` | Graficos e exportacao PDF |
| `/configuracoes` | `app/configuracoes/page.tsx` | Gerenciar responsaveis |
| `/auth/callback` | `app/auth/callback/route.ts` | Trocar codigo OAuth por sessao |
| `/logout` | `app/logout/route.ts` | Rota POST de logout |
| `/api/process-fatura` | `app/api/process-fatura/route.ts` | Processar PDF com Gemini |

Observacoes:

- O botao de logout atual usa `supabase.auth.signOut()` no cliente; a rota `/logout` nao e usada pela UI.
- O botao de visualizar fatura existe, mas ainda nao tem comportamento.
- O antigo `vercel.json` com rewrite global para `/` foi removido; o App Router controla rotas e assets diretamente.

## Composicao global

`app/layout.tsx` e Server Component e renderiza `RootLayoutClient`.

`components/root-layout-client.tsx` registra:

1. `QueryClientProvider`
2. `AuthProvider`
3. `FaturaProvider`
4. `ThemeProvider`
5. `TooltipProvider`
6. `AppSidebar`
7. `Toaster`

Como o wrapper global e Client Component, grande parte da aplicacao depende de hidratacao no cliente. A reducao desse limite esta registrada em `FUTURAS_MELHORIAS.md`.

## Autenticacao e autorizacao

### Login

1. `app/login/page.tsx` chama `supabase.auth.signInWithOAuth`.
2. O Google/Supabase redireciona para `/auth/callback`.
3. `app/auth/callback/route.ts` chama `exchangeCodeForSession`.
4. O usuario e redirecionado para a origem do app.

### Autorizacao adicional

`components/auth-provider.tsx`:

1. Obtem a sessao atual.
2. Consulta `authorized_users` pelo email.
3. Se o email nao existir, encerra a sessao.
4. Se autorizado, disponibiliza `user` pelo contexto.

Essa tabela deve possuir RLS/politicas adequadas. Ela nao aparecia na documentacao antiga, mas e obrigatoria para o fluxo atual.

## Estado e dados

### React Query

Os hooks em `lib/hooks/` consultam Supabase diretamente:

- `useFaturas`
- `useGastos`
- `useEstatisticas`
- `useParcelamentos`
- `useResponsaveis`

Todas as query keys incluem o ID do usuario autenticado, e o cache e limpo no logout/troca de sessao. As consultas e mutacoes tambem aplicam filtro explicito por `user_id`.

O `QueryClient` global usa:

- `staleTime`: 5 minutos.
- `gcTime`: 10 minutos.

### Fatura atual

`components/fatura-provider.tsx` carrega todas as faturas e mantem uma fatura selecionada globalmente. Dashboard, gastos, parcelamentos e relatorios usam esse contexto.

### Parcelamentos

Apesar de existir `TABLES.PARCELAMENTOS`, a tela atual nao consulta essa tabela. `lib/hooks/useParcelamentos.ts` seleciona gastos com `parcela` e deriva:

- parcela atual;
- total de parcelas;
- valor total estimado;
- parte de cada responsavel.

A tabela `parcelamentos` nao e lida pelo app e deve ser considerada legado/pendencia ate o modelo ser decidido. Se existir, a migration de exclusao configura cascade por `fatura_id`.

### Divisao de gastos

O campo `gastos.divisoes` e esperado como array JSON:

```ts
type Divisao = {
  valor: number;
  responsavel: string;
};
```

Quando presente, ele substitui `responsavel` nos calculos por pessoa.

## Processamento de fatura

Fluxo em `app/api/process-fatura/route.ts`:

1. Recebe `Authorization: Bearer <token>`.
2. Cria cliente Supabase usando URL e anon key.
3. Valida o usuario com `auth.getUser()`.
4. Recebe um `File` por `FormData`.
5. Registra o instante de inicio da importacao.
6. Valida MIME, assinatura `%PDF-` e limite de 20 MB.
7. Calcula SHA-256 e bloqueia PDFs ja importados pelo usuario.
8. Converte PDF para base64.
9. Envia prompt + PDF ao modelo Gemini configurado no arquivo.
10. Faz `JSON.parse` e valida/normaliza a resposta com Zod.
11. Busca o responsavel principal.
12. Envia o PDF ao bucket privado `faturas`.
13. Insere fatura, instante inicial, caminho, hash do PDF e gastos pela RPC transacional.
14. Remove o objeto do Storage se a RPC falhar.

Limitacoes atuais:

- O processamento ocorre dentro de uma unica requisicao serverless.

## Modelo de dados observado

### `faturas`

Campos usados:

- `id`
- `user_id`
- `mes_referencia`
- `valor_total`
- `quantidade_lancamentos`
- `data_importacao`
- `arquivo_url`, contendo o caminho privado do PDF no Supabase Storage
- `arquivo_hash`, contendo o SHA-256 usado para impedir importacao duplicada por usuario

### `gastos`

Campos usados:

- `id`
- `user_id`
- `fatura_id`
- `data`
- `estabelecimento`
- `valor`
- `categoria`
- `responsavel`
- `parcela`
- `observacao`
- `divisoes`

### `responsaveis`

Campos usados:

- `id`
- `user_id`
- `nome`
- `cor`

O valor especial `cor = 'pessoal'` identifica o responsavel principal. Portanto, `cor` atualmente mistura papel de negocio e apresentacao visual.

### `authorized_users`

Campo usado:

- `email`

### `parcelamentos`

A leitura da aplicacao nao usa essa tabela atualmente. Confirmar no Supabase se ela ainda existe e se deve ser removida.

## Exportacao PDF

`lib/utils/pdfExport.ts` carrega `jspdf` e `jspdf-autotable` dinamicamente para evitar problemas com APIs do browser durante SSR.

O relatorio pode ser:

- completo;
- filtrado por responsavel;
- ajustado pelas divisoes de gastos.

## Deploy Vercel

Variaveis necessarias no codigo atual:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
```

Cuidados:

- configurar Development, Preview e Production;
- configurar callback OAuth para cada dominio usado;
- observar timeout, memoria e payload de `/api/process-fatura`;
- nao usar filesystem temporario como storage persistente;
- correlacionar logs da Vercel, browser e Supabase.

## Isolamento por usuario

Cada fatura, gasto e responsavel pertence ao `auth.uid()` que realizou a operacao.

A protecao usa duas camadas:

1. Aplicacao: consultas, criacoes, atualizacoes e exclusoes incluem `user_id`.
2. Banco: RLS impede acesso cruzado mesmo em chamadas Supabase manipuladas manualmente.

Migration: `supabase/migrations/20260611_user_data_isolation.sql`.

## Exclusao de faturas

`useDeleteFatura` chama a RPC `delete_fatura_atomically`.

- A RPC bloqueia e valida a fatura pelo usuario autenticado.
- A exclusao da fatura e dos gastos ocorre na mesma transacao.
- `gastos.fatura_id` usa `ON DELETE CASCADE`.
- Uma tabela legada `parcelamentos`, se existir, tambem recebe cascade.
- A RPC retorna o caminho do PDF e as quantidades removidas.
- Depois do commit, o cliente remove o objeto do Supabase Storage e avisa se essa limpeza externa falhar.

Migration: `supabase/migrations/20260612_atomic_invoice_deletion.sql`.

## Qualidade atual

Em 2026-06-11:

- `npx tsc --noEmit` passa.
- `npm run lint` falha com 8 erros e 17 warnings.
- Nao ha framework/script de testes configurado.
- Nao ha MSW, React Testing Library, Cypress ou Playwright instalados.

O backlog detalhado esta em `FUTURAS_MELHORIAS.md`.
