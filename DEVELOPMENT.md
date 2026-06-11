# Guia de desenvolvimento

Este guia reflete os arquivos e scripts existentes em 2026-06-11.

## Pre-requisitos

- Node.js compativel com Next.js 16.
- npm, que e o gerenciador usado nos comandos abaixo.
- Projeto Supabase configurado.
- Credencial Gemini.

O repositorio tambem possui `pnpm-lock.yaml`. Escolher um unico gerenciador e remover o lockfile excedente esta registrado como melhoria futura.

## Setup local

```bash
npm install
```

Crie `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
```

Inicie:

```bash
npm run dev
```

Acesse `http://localhost:3000`.

## Comandos disponiveis

```bash
npm run dev
npm run build
npm run start
npm run lint
npx tsc --noEmit
```

Nao existe `npm test`, `npm run typecheck` ou `npm run format` no `package.json` atual.

## Regra especial do Next.js

Este projeto usa Next.js `16.2.7`, com mudancas que podem diferir de conhecimento anterior.

Antes de alterar APIs, convencoes ou estrutura do Next:

1. Leia `AGENTS.md`.
2. Consulte o guia relevante em `node_modules/next/dist/docs/`.
3. Respeite avisos de deprecacao.

## Organizacao

```text
app/             paginas e route handlers
components/      componentes de negocio e UI
components/ui/   primitives Base UI/shadcn-style
lib/hooks/       consultas e mutacoes React Query
lib/api/         tipos e constantes de dados
lib/supabase/    cliente Supabase browser
lib/utils/       exportacao PDF
```

Nao existem atualmente:

- `lib/mocks/`;
- MSW;
- suite de testes;
- `tailwind.config.ts`.

Tailwind 4 e configurado principalmente em `app/globals.css` e `postcss.config.mjs`.

## Padroes atuais

### Paginas interativas

As paginas que usam estado, eventos ou hooks possuem `"use client"`.

Nao adicione essa diretiva automaticamente a toda pagina. Consulte o guia local de Server/Client Components e mantenha Client Components tao pequenos quanto a interatividade permitir.

### Dados remotos

Use React Query e o cliente em `lib/supabase/client.ts`.

Ao criar um hook:

- defina tipos em `lib/api/types.ts` ou no dominio adequado;
- use as tabelas de `lib/api/endpoints.ts`;
- trate `{ error }` retornado pelo Supabase;
- invalide query keys relacionadas depois de mutacoes;
- confirme que RLS protege o usuario.

### Fatura selecionada

Dashboard, gastos, parcelamentos e relatorios devem respeitar `useFaturaContext()`.

Consultas por fatura usam atualmente:

```ts
useGastos(faturaAtual?.id || null)
useParcelamentos(faturaAtual?.id || null)
```

### Componentes UI

- Reutilize `components/ui`.
- Use icones Lucide.
- Botoes apenas com icone precisam de `aria-label`.
- Formularios precisam de `label` associada.
- Use variaveis de tema, como `bg-background`, `text-foreground` e `border-border`.
- Teste tema claro e escuro.

### Erros

- Trate erros esperados e mostre feedback com Sonner ou `ErrorAlert`.
- Em `catch`, prefira `unknown` em vez de `any`.
- Nao mostre detalhes internos do Supabase ao usuario.
- Para route handlers, use status HTTP coerente.

### Dados da IA

Qualquer dado retornado pelo Gemini deve ser tratado como entrada nao confiavel.

Antes de salvar:

- validar schema;
- validar datas e numeros;
- limitar categorias;
- normalizar strings;
- garantir operacao atomica ou compensacao em caso de falha.

## Adicionando uma pagina

1. Crie `app/<rota>/page.tsx`.
2. Decida quais partes podem ser Server Components.
3. Extraia componentes interativos quando necessario.
4. Adicione a rota em `components/app-sidebar.tsx`.
5. Adicione estados de loading, erro e vazio.
6. Teste desktop, mobile, tema claro e escuro.

## Adicionando uma tabela/campo Supabase

1. Atualize o banco e RLS.
2. Atualize `lib/api/types.ts`.
3. Atualize `lib/api/endpoints.ts` quando aplicavel.
4. Crie mapper/hook.
5. Verifique isolamento entre usuarios.
6. Atualize `API_INTEGRATION.md`.

## Verificacao antes de concluir

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Estado conhecido: o typecheck passa, mas o lint ainda falha. Consulte `FUTURAS_MELHORIAS.md`.

## Vercel

Ao alterar auth, env vars, uploads ou route handlers:

- verifique um Preview Deploy;
- confira os logs da function;
- teste callback OAuth;
- confirme que `GEMINI_API_KEY` nao usa prefixo `NEXT_PUBLIC_`;
- nao dependa de arquivos temporarios da function;
- confira limites da rota de processamento de PDF.

## Convencoes

- Arquivos/componentes: siga o padrao existente.
- Componentes React e tipos: `PascalCase`.
- Funcoes e variaveis: `camelCase`.
- Imports internos: alias `@/`.
- Commits sugeridos: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.

## Documentos relacionados

- `ARCHITECTURE.md`
- `API_INTEGRATION.md`
- `BACKEND_INTEGRATION_CHECKLIST.md`
- `FUTURAS_MELHORIAS.md`
