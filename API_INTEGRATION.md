# Integracao Supabase e APIs

Este documento descreve os contratos exigidos pelo codigo atual. Antes de executar SQL em producao, compare com o schema real no Supabase e use migrations/backup.

## Servicos usados

- Supabase Auth para login Google.
- Supabase PostgreSQL para persistencia.
- Supabase RLS para isolamento por usuario.
- Google Gemini para extracao de faturas PDF.
- Vercel para executar o app e o route handler.

O app nao possui uma API REST propria para CRUD comum. Os hooks em `lib/hooks/` acessam Supabase diretamente. A excecao principal e `POST /api/process-fatura`.

## Variaveis

Usadas pelo codigo:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
```

Nao usada pelo codigo atual:

```env
SUPABASE_SERVICE_ROLE_KEY=
```

Nao exponha segredos com prefixo `NEXT_PUBLIC_`.

## Modelo minimo esperado

O SQL abaixo e uma referencia alinhada aos campos usados no frontend. Ele nao substitui uma migration versionada.

### Faturas

```sql
create table if not exists public.faturas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mes_referencia text not null,
  valor_total numeric(12,2) not null,
  quantidade_lancamentos integer not null default 0,
  data_importacao timestamptz not null default now(),
  arquivo_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_faturas_user_data
  on public.faturas(user_id, data_importacao desc);
```

### Gastos

```sql
create table if not exists public.gastos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fatura_id uuid references public.faturas(id) on delete cascade,
  data date not null,
  estabelecimento text not null,
  valor numeric(12,2) not null,
  categoria text not null,
  responsavel text not null,
  parcela text,
  observacao text,
  divisoes jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gastos_user_fatura
  on public.gastos(user_id, fatura_id);

create index if not exists idx_gastos_data
  on public.gastos(data desc);
```

Formato esperado de `divisoes`:

```json
[
  { "valor": 50.00, "responsavel": "Pessoa A" },
  { "valor": 50.00, "responsavel": "Pessoa B" }
]
```

### Responsaveis

```sql
create table if not exists public.responsaveis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  cor text,
  created_at timestamptz not null default now(),
  unique (user_id, nome)
);

create index if not exists idx_responsaveis_user
  on public.responsaveis(user_id);
```

O codigo usa `cor = 'pessoal'` para identificar o responsavel principal.

### Usuarios autorizados

`components/auth-provider.tsx` exige a tabela:

```sql
create table if not exists public.authorized_users (
  email text primary key,
  created_at timestamptz not null default now()
);
```

Defina cuidadosamente quem pode consultar essa tabela. O usuario autenticado precisa confirmar apenas se o proprio email esta autorizado, sem enumerar outros emails.

### Parcelamentos

O codigo atual deriva parcelamentos de `gastos.parcela`; nao le a tabela `parcelamentos`.

`TABLES.PARCELAMENTOS` ainda existe e `useDeleteFatura` tenta apagar registros por `fatura_id`. Existem duas opcoes:

1. Remover a tabela/constante/delete se ela for legado.
2. Tornar `parcelamentos` uma entidade real e atualizar leitura/escrita.

Nao crie uma nova tabela apenas porque documentos antigos a listavam.

## RLS

Ative RLS nas tabelas com dados por usuario.

Migration pronta no repositorio:

```text
supabase/migrations/20260611_user_data_isolation.sql
```

Ela recria as policies de `faturas`, `gastos`, `responsaveis` e, se existir, `parcelamentos`, garantindo que `auth.uid()` seja igual a `user_id`. Tambem limita `authorized_users` ao proprio email autenticado.

Antes de executar em producao, confirme que todos os registros existentes possuem o `user_id` correto. Policies antigas sao removidas porque policies permissivas do PostgreSQL sao combinadas com `OR`.

Exemplo para `gastos`:

```sql
alter table public.gastos enable row level security;

create policy "select own gastos"
on public.gastos for select
using (auth.uid() = user_id);

create policy "insert own gastos"
on public.gastos for insert
with check (auth.uid() = user_id);

create policy "update own gastos"
on public.gastos for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "delete own gastos"
on public.gastos for delete
using (auth.uid() = user_id);
```

Repita o modelo para `faturas` e `responsaveis`. Teste com dois usuarios diferentes.

Nao confie em filtros `.eq('user_id', ...)` do frontend como mecanismo de seguranca. A barreira e a RLS.

## OAuth Google

O login e iniciado em `app/login/page.tsx`.

Configure:

- Google OAuth provider no Supabase.
- Site URL no Supabase.
- Redirect URLs de localhost, Preview e Production.
- Dominio/autorizacoes no Google Cloud Console.

Callback usado:

```text
http://localhost:3000/auth/callback
https://<dominio-vercel>/auth/callback
```

Depois do callback, `AuthProvider` verifica `authorized_users`.

## Route handlers

### `GET /auth/callback`

Arquivo: `app/auth/callback/route.ts`.

- Le `code` da query string.
- Chama `exchangeCodeForSession`.
- Redireciona para a origem.

### `POST /logout`

Arquivo: `app/logout/route.ts`.

A UI atual nao usa essa rota; chama logout pelo cliente. Avaliar remocao ou adocao consistente.

### `POST /api/process-fatura`

Requisicao:

- header `Authorization: Bearer <access_token>`;
- body `multipart/form-data`;
- campo `file` com PDF.

Fluxo:

1. valida token;
2. envia PDF ao Gemini;
3. interpreta JSON;
4. insere `faturas`;
5. define responsavel inicial;
6. insere `gastos`.

Resposta de sucesso:

```json
{
  "success": true,
  "fatura": {}
}
```

Status tratados:

- `400`: arquivo ausente;
- `401`: token ausente/invalido;
- `429`: cota da IA;
- `503`: indisponibilidade da IA;
- `500`: configuracao, parse ou persistencia.

Pendencias importantes:

- validar resposta Gemini com Zod;
- validar MIME/tamanho;
- transacao para fatura + gastos;
- idempotencia/hash;
- storage persistente;
- observabilidade;
- avaliar job assincrono por causa dos limites da Vercel.

## Storage

O codigo atual nao faz upload para Supabase Storage e nao preenche `arquivo_url`.

Storage e uma evolucao, nao uma funcionalidade concluida. Ao implementar:

- prefira bucket privado;
- use caminho por `user_id`;
- aplique policies;
- gere signed URLs;
- armazene hash e metadados;
- defina retencao/exclusao junto da fatura.

## Hooks e tabelas

| Hook | Fonte atual |
|---|---|
| `useFaturas` | tabela `faturas` |
| `useGastos` | tabela `gastos` |
| `useEstatisticas` | calculo client-side sobre gastos |
| `useParcelamentos` | tabela `gastos`, filtrando `parcela` |
| `useResponsaveis` | tabela `responsaveis` |

## Verificacao manual

1. Login de email autorizado.
2. Login de email nao autorizado.
3. Isolamento entre dois usuarios.
4. Criacao/remocao de responsavel.
5. Definicao de responsavel principal.
6. Importacao de PDF.
7. Edicao e divisao de gasto.
8. Exclusao de fatura e dados relacionados.
9. Preview/Production na Vercel.

## Candidatos a limpeza

- `SUPABASE_SERVICE_ROLE_KEY` em `.env.example`, enquanto nao houver uso real.
- tabela/constantes de `parcelamentos`, se confirmadas como legado.
- constantes `STORAGE` em `lib/api/endpoints.ts`, enquanto storage nao estiver implementado.
- rota `/logout`, se o logout continuar exclusivamente client-side.
