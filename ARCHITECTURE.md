# 🏗️ Arquitetura do Cartão Inteligente

> Mapa técnico do estado atual, revisado em **12 de junho de 2026**.

## 🧭 Visão geral

```text
Browser
├── Next.js App Router
├── ThemeProvider
├── React Query
├── AuthProvider
├── FaturaProvider
├── Supabase browser client
└── Experiências client por rota
        │
        ├── Supabase Auth / PostgreSQL / Storage
        └── POST /api/process-fatura
                ├── valida sessão e PDF
                ├── consulta Gemini
                ├── valida com Zod
                └── persiste via RPC

Deploy: Vercel
```

## 🧱 Camadas

| Camada | Responsabilidade | Locais principais |
|---|---|---|
| Rotas | Metadata, layout e entrada server-side | `app/` |
| Experiência | Estado e interações do usuário | `components/pages/` |
| UI | Primitivos reutilizáveis | `components/ui/` |
| Estado global | Sessão, fatura atual e tema | `components/*provider.tsx` |
| Dados | Queries, mutações e cache | `lib/hooks/` |
| Domínio | Modelos camelCase usados pela UI | `lib/domain/` |
| Contratos | DTOs snake_case, mappers, tabelas e query keys | `lib/api/` |
| Backend | Processamento, ambiente e logs | `app/api/`, `lib/server/` |
| Persistência | Auth, PostgreSQL, RLS e Storage | Supabase |

## 🗺️ Rotas

| Rota | Tipo | Responsabilidade |
|---|---|---|
| `/` | Página | Dashboard |
| `/login` | Página | Login Google |
| `/faturas` | Página | Importar e gerenciar faturas |
| `/gastos` | Página | Filtrar, editar e dividir gastos |
| `/parcelamentos` | Página | Acompanhar parcelas e responsáveis |
| `/relatorios` | Página | Gráficos e exportação PDF |
| `/configuracoes` | Página | Gerenciar responsáveis |
| `/auth/callback` | Route handler | Trocar código OAuth por sessão |
| `/logout` | Route handler legado | Logout server-side não usado pela UI |
| `/api/health` | Route handler | Validar ambiente |
| `/api/process-fatura` | Route handler | Processar PDF com Gemini |

> [!NOTE]
> As páginas de rota são Server Components. Interações ficam em `components/pages/*-client.tsx`.

## 🌐 Composição global

`app/layout.tsx` renderiza `RootLayoutClient`, que organiza:

1. `ThemeProvider`
2. `QueryClientProvider`
3. `AuthProvider`
4. `FaturaProvider`
5. `TooltipProvider`
6. `AppSidebar`
7. `Toaster`

O slot `children` mantém as páginas server-side fora do grafo client sempre que possível.

## 🔐 Autenticação e autorização

### Login

```text
LoginClient
  → supabase.auth.signInWithOAuth()
  → Google / Supabase
  → /auth/callback
  → exchangeCodeForSession()
  → aplicação
```

### Gate adicional

`AuthProvider`:

1. recupera a sessão;
2. consulta `authorized_users` pelo email atual;
3. encerra a sessão se o email não estiver autorizado;
4. disponibiliza o usuário ao restante da aplicação.

### Isolamento

| Camada | Proteção |
|---|---|
| Aplicação | Queries e mutações incluem `user_id` |
| Cache | Query keys incluem o ID do usuário |
| Sessão | Logout e troca de conta limpam o cache |
| Banco | RLS exige `auth.uid() = user_id` |
| Storage | Caminhos e policies são separados por usuário |

Migrations:

```text
supabase/migrations/20260611_user_data_isolation.sql
supabase/migrations/20260612_supabase_security_hardening.sql
```

O endurecimento adiciona RLS forçada, privilégios mínimos, RPCs restritas e
integridade composta entre o ID da fatura e seu proprietário.

## 🔄 Estado e dados

### React Query

Hooks principais:

- `useFaturas`
- `useGastos`
- `useEstatisticas`
- `useParcelamentos`
- `useResponsaveis`

Configuração global:

| Opção | Valor |
|---|---:|
| `staleTime` | 5 minutos |
| `gcTime` | 10 minutos |

As chaves são construídas exclusivamente pelas factories de
`lib/api/queryKeys.ts`. A hierarquia separa recurso, tipo de consulta, usuário
e fatura, permitindo invalidar somente o cache relacionado à mutação.

Estatísticas não possuem uma query própria: `useEstatisticas` usa `useMemo`
sobre os gastos já armazenados pelo React Query. Parcelamentos possuem cache
próprio de leitura, mas são invalidados junto com gastos porque são uma visão
derivada deles.

### Fatura atual

`FaturaProvider` guarda o ID selecionado e deriva a fatura válida da lista atual. Dashboard, gastos, parcelamentos e relatórios usam esse contexto.

### Parcelamentos

Parcelamentos não são lidos de uma tabela própria. `useParcelamentos` seleciona gastos com `parcela` e deriva:

- parcela atual e total;
- valor mensal e total;
- parcelas restantes;
- responsável;
- divisões por pessoa.

Parcelamentos são oficialmente uma visão derivada. O contrato
`TABLES.PARCELAMENTOS` foi removido da aplicação. Se uma tabela física antiga
ainda existir no Supabase, ela é considerada legado de banco e pode ser
removida após auditoria dos dados.

### Divisões

```ts
type Divisao = {
  valor: number;
  responsavel: string;
};
```

Quando `gastos.divisoes` existe, os cálculos por responsável usam as partes do array, não o campo único `responsavel`.

## 📄 Fluxo de importação

```text
Selecionar PDF
  → validar tamanho, MIME e assinatura
  → calcular SHA-256 e verificar duplicidade
  → upload direto ao Storage
  → enviar caminho à API
  → validar token, caminho, tamanho, assinatura e hash
  → recalcular SHA-256
  → bloquear duplicidade
  → chamar Gemini
  → validar resposta com Zod
  → importar por RPC transacional
  → invalidar queries
```

Detalhes:

1. O upload usa `<user_id>/<uuid>.pdf`.
2. O limite é 20 MB.
3. A API baixa o arquivo usando a sessão do usuário.
4. O Gemini possui timeout de 240 segundos.
5. A rota possui `maxDuration` de 300 segundos.
6. Falhas removem o objeto recém-enviado.
7. Logs incluem `requestId`, etapa, status e duração.

O navegador executa lotes sequencialmente e mantém um job observável por
arquivo, com estado, progresso, duração, erro e `requestId`. A API devolve o
estágio final e a duração para correlação com os logs.

O modelo ainda não é uma fila persistente: fechar a página interrompe a
orquestração do lote. A migração para tabela de jobs e worker independente deve
ocorrer quando o volume ou a duração se aproximarem dos limites da Vercel.

## 🗃️ Modelo de dados

### Fronteira de nomes

```text
Supabase Row (snake_case)
  → lib/api/mappers.ts
  → Domain Model (camelCase)
  → componentes e regras de negócio
```

- `lib/api/types.ts`: `FaturaRow`, `GastoRow`, `ResponsavelRow`.
- `lib/domain/models.ts`: `Fatura`, `Gasto`, `Responsavel`, `Parcelamento`.
- `lib/data.ts`: formatadores e catálogo de categorias.

### `faturas`

`id`, `user_id`, `mes_referencia`, `valor_total`, `quantidade_lancamentos`, `data_importacao`, `arquivo_url`, `arquivo_hash`.

### `gastos`

`id`, `user_id`, `fatura_id`, `data`, `estabelecimento`, `valor`, `categoria`, `responsavel`, `parcela`, `observacao`, `divisoes`.

### `responsaveis`

`id`, `user_id`, `nome`, `cor`.

> O valor `cor = 'pessoal'` identifica o responsável principal. Isso mistura apresentação e regra de negócio e permanece como dívida técnica.

### `authorized_users`

`email`.

### `parcelamentos`

A aplicação não lê essa tabela e adotou oficialmente a visão derivada de
`gastos.parcela`. Se a tabela física legada ainda existir no Supabase, sua
auditoria e remoção permanecem como tarefa operacional do banco.

## 🗑️ Exclusão de fatura

`useDeleteFatura` chama `delete_fatura_atomically`:

1. valida propriedade com `auth.uid()`;
2. bloqueia a fatura;
3. conta registros relacionados;
4. exclui fatura e gastos na mesma transação;
5. retorna caminho e quantidades removidas;
6. o cliente limpa o PDF no Storage após o commit.

Uma falha no Storage pode deixar um arquivo órfão, mas não uma fatura parcialmente excluída.

## 📊 Exportação PDF

`lib/utils/pdfExport.ts` gera:

- relatório completo;
- relatório por responsável;
- resumo de divisões;
- parcelamentos;
- valores originais e atribuídos.

O download é feito por Blob no navegador.

## ☁️ Produção

Variáveis:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
```

Cuidados:

- Preview e Production precisam de configuração deliberada.
- OAuth deve conhecer cada domínio.
- PDFs persistentes ficam no Storage.
- Logs de browser, Vercel e Supabase devem ser correlacionados.
- RLS precisa ser testada com duas contas.

## ✅ Qualidade atual

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run build`
- [x] Importação validada e transacional
- [x] Exclusão transacional
- [ ] Testes automatizados
- [ ] RLS validada no ambiente de produção

Próximas decisões estão em [FUTURAS_MELHORIAS.md](./FUTURAS_MELHORIAS.md).
