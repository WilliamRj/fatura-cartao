# 🧑‍💻 Guia de desenvolvimento

> Rotina prática para desenvolver com segurança no Cartão Inteligente.

## ⚡ Início rápido

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## ✅ Pré-requisitos

- Node.js compatível com Next.js 16.
- npm.
- Projeto Supabase configurado.
- Credencial Google Gemini.
- Usuário incluído em `authorized_users`.

> [!NOTE]
> O repositório também possui `pnpm-lock.yaml`. A escolha de um único gerenciador permanece no roadmap.

## 🔐 Ambiente local

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
```

Regras:

- Nunca exponha chaves privadas com `NEXT_PUBLIC_`.
- Não versione `.env.local`.
- Use projetos/chaves deliberadamente escolhidos para cada ambiente.

## 🐳 Supabase local

O Supabase local permite aplicar migrations e executar testes de RLS sem tocar
primeiro nos dados de Preview ou Production.

### Pré-requisitos

- Docker Desktop para Windows com WSL 2.
- Docker Desktop aberto durante o uso.
- Node.js 20 ou superior.

Confirme:

```powershell
docker version
node --version
```

> [!IMPORTANT]
> O Supabase CLI usa containers Docker. Não exponha as portas locais
> publicamente e nunca compartilhe senha do banco, access token ou secret key.

### Instalar e inicializar o CLI

Na raiz do projeto:

```powershell
npm install --save-dev supabase
npx supabase init
```

O comando `init` cria `supabase/config.toml`. A instalação global com
`npm install -g supabase` não é suportada oficialmente.

### Vincular ao projeto remoto

Este passo é opcional e serve para consultar o schema ou enviar migrations:

```powershell
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
```

O `project-ref` aparece na URL do painel:

```text
https://supabase.com/dashboard/project/SEU_PROJECT_REF
```

Para baixar o schema remoto:

```powershell
npx supabase db pull
```

> [!WARNING]
> Revise os arquivos gerados por `db pull` antes de confirmar alterações. O
> projeto já possui migrations e um pull sem revisão pode duplicar contratos.

### Subir os serviços locais

```powershell
npx supabase start
```

Endereços padrão:

| Serviço | Endereço |
|---|---|
| API | `http://127.0.0.1:54321` |
| PostgreSQL | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Studio | `http://127.0.0.1:54323` |
| Mailpit | `http://127.0.0.1:54324` |

Consulte URLs e chaves locais:

```powershell
npx supabase status
```

### Conectar o app local

Atualize `.env.local` com os valores exibidos pelo status:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=CHAVE_PUBLICAVEL_LOCAL
GEMINI_API_KEY=SUA_CHAVE_GEMINI
```

Reinicie `npm run dev` após alterar as variáveis.

### Aplicar migrations do zero

```powershell
npx supabase db reset
```

Esse comando recria o banco local e reaplica as migrations. Ele é destrutivo
somente para os dados da instância local.

### Testar isolamento entre usuários

O teste abaixo exige duas contas em `auth.users`:

```text
supabase/tests/user_data_isolation.sql
```

Ele cria fixtures dentro de uma transação e termina com `ROLLBACK`, sem manter
os dados temporários. Um seed local com duas contas ainda precisa ser criado
antes de automatizar esse teste.

### Encerrar os serviços

```powershell
npx supabase stop
```

### Checklist do setup

- [ ] Docker Desktop instalado e aberto.
- [ ] `docker version` funciona.
- [ ] Node.js 20 ou superior.
- [ ] Supabase CLI instalado no projeto.
- [ ] `supabase/config.toml` criado.
- [ ] Stack local iniciada.
- [ ] `.env.local` aponta para a API local.
- [ ] Migrations aplicadas com `db reset`.
- [ ] Duas contas locais disponíveis para testar RLS.

## 🛠️ Comandos

| Comando | Finalidade |
|---|---|
| `npm run dev` | Desenvolvimento |
| `npm run lint` | Regras estáticas |
| `npm run typecheck` | Tipos |
| `npm run build` | Build de produção |
| `npm run check` | Lint + tipos + build |
| `npm run start` | Executar o build |
| `npx supabase start` | Iniciar Supabase local |
| `npx supabase status` | Mostrar URLs e chaves locais |
| `npx supabase db reset` | Recriar banco local e aplicar migrations |
| `npx supabase stop` | Encerrar Supabase local |

Ainda não existem scripts `test` e `format`.

## ⚠️ Regra especial do Next.js

Este projeto usa Next.js `16.2.7`, com APIs e convenções que podem diferir de versões anteriores.

Antes de alterar código relacionado ao framework:

1. Leia `AGENTS.md`.
2. Consulte o guia relevante em `node_modules/next/dist/docs/`.
3. Verifique avisos de depreciação.
4. Preserve a separação entre Server e Client Components.

## 🗂️ Organização

| Pasta | Responsabilidade |
|---|---|
| `app/` | Rotas, metadata e route handlers |
| `components/pages/` | Interatividade específica de cada rota |
| `components/ui/` | Primitivos reutilizáveis |
| `lib/hooks/` | Queries e mutações |
| `lib/api/` | DTOs snake_case, mappers, tabelas e query keys |
| `lib/domain/` | Modelos camelCase da aplicação |
| `lib/env/` | Validação de ambiente |
| `lib/server/` | Infraestrutura server-side |
| `lib/supabase/` | Cliente Supabase |
| `supabase/migrations/` | Mudanças versionadas no banco |

## 🧩 Padrões do projeto

### Server e Client Components

- Rotas em `app/**/page.tsx` devem permanecer Server Components quando possível.
- Estado, eventos, hooks e APIs do navegador ficam em componentes `"use client"`.
- Não adicione `"use client"` a uma página inteira sem necessidade.

### Dados remotos

Ao criar ou alterar um hook:

- [ ] Use React Query.
- [ ] Use DTOs e mappers de `lib/api`.
- [ ] Retorne modelos de `lib/domain`.
- [ ] Trate `{ error }` do Supabase.
- [ ] Use uma factory de `lib/api/queryKeys.ts`.
- [ ] Inclua o usuário e o escopo da fatura na query key.
- [ ] Filtre explicitamente por `user_id`.
- [ ] Invalide apenas as queries relacionadas.
- [ ] Use `useMemo` para projeções síncronas de dados já carregados.
- [ ] Confirme que a RLS protege a mesma operação.

### Fatura selecionada

Dashboard, gastos, parcelamentos e relatórios usam `useFaturaContext()`.

```ts
useGastos(faturaAtual?.id || null)
useParcelamentos(faturaAtual?.id || null)
```

### Interface

- Reutilize `components/ui`.
- Use ícones Lucide.
- Botões somente com ícone precisam de `aria-label`.
- Formulários precisam de labels associadas.
- Use tokens como `bg-background`, `text-foreground` e `border-border`.
- Teste tema claro, escuro, desktop e mobile.

### Erros

- Use `unknown` nos blocos `catch`.
- Mostre feedback com Sonner ou `ErrorAlert`.
- Não exponha detalhes internos do Supabase.
- Route handlers devem usar status HTTP coerentes.
- Logs server-side devem incluir contexto sem registrar segredos.

### Dados da IA

Considere toda resposta do Gemini como entrada não confiável:

- valide com schema;
- normalize datas, moedas e categorias;
- limite strings e listas;
- persista por operação atômica;
- remova uploads quando o processo falhar.

## ➕ Adicionando recursos

### Nova página

1. Crie `app/<rota>/page.tsx`.
2. Mantenha conteúdo estático no servidor.
3. Extraia a experiência interativa para `components/pages/`.
4. Adicione a rota à navegação.
5. Implemente loading, erro e estado vazio.
6. Teste responsividade e os dois temas.

### Nova tabela ou campo

1. Crie uma migration versionada.
2. Defina RLS e índices.
3. Atualize o DTO `*Row` em `lib/api/types.ts`.
4. Atualize o mapper e o modelo de domínio quando necessário.
5. Teste com dois usuários.
6. Atualize `API_INTEGRATION.md`.

Jobs de importação dependem da migration
`20260612_persistent_invoice_import_jobs.sql`. Em desenvolvimento local, o
runtime precisa oferecer suporte a `after()`; na Vercel, o Next.js usa
`waitUntil` automaticamente.

## 🧪 Antes de concluir

```bash
npm run check
```

Checklist:

- [ ] Fluxo principal testado manualmente.
- [ ] Console sem erros relevantes.
- [ ] Tema claro e escuro verificados.
- [ ] Mobile e desktop verificados.
- [ ] Documentação atualizada.
- [ ] Preview da Vercel validado quando necessário.

## 📝 Convenções

- Componentes e tipos: `PascalCase`.
- Funções e variáveis: `camelCase`.
- Imports internos: alias `@/`.
- Commits sugeridos: `feat:`, `fix:`, `docs:`, `refactor:`, `test:` e `chore:`.

## 🔗 Próximas leituras

- [Arquitetura](./ARCHITECTURE.md)
- [Integração Supabase e APIs](./API_INTEGRATION.md)
- [Checklist de backend](./BACKEND_INTEGRATION_CHECKLIST.md)
- [Roadmap](./FUTURAS_MELHORIAS.md)
