# 🔌 Supabase e APIs

> Contratos de dados, segurança, Storage e route handlers usados pelo código atual.

> [!WARNING]
> Antes de executar SQL em produção, compare com o schema real, revise as migrations e garanta backup ou estratégia de rollback.

## 🧭 Mapa de integração

| Serviço | Uso |
|---|---|
| Supabase Auth | Login Google e sessão |
| Supabase PostgreSQL | Faturas, gastos, responsáveis e autorização |
| Supabase RLS | Isolamento por usuário |
| Supabase Storage | PDFs privados |
| Google Gemini | Extração de dados do PDF |
| Vercel | App e route handlers |

O CRUD comum é feito pelos hooks em `lib/hooks/`. A principal API própria é `POST /api/process-fatura`.

## 🔐 Variáveis

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
```

- As duas variáveis `NEXT_PUBLIC_*` são públicas por definição.
- `GEMINI_API_KEY` é privada.
- O código atual não usa `SUPABASE_SERVICE_ROLE_KEY`.

## 🗃️ Schema mínimo

### `faturas`

```sql
create table if not exists public.faturas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mes_referencia text not null,
  valor_total numeric(12,2) not null,
  quantidade_lancamentos integer not null default 0,
  data_importacao timestamptz not null default now(),
  arquivo_url text,
  arquivo_hash text,
  created_at timestamptz not null default now()
);

create index if not exists idx_faturas_user_data
  on public.faturas(user_id, data_importacao desc);
```

`data_importacao` representa o início da importação em UTC. A interface converte para `America/Sao_Paulo`.

### `gastos`

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
```

Formato de `divisoes`:

```json
[
  { "valor": 50.00, "responsavel": "Pessoa A" },
  { "valor": 50.00, "responsavel": "Pessoa B" }
]
```

### `responsaveis`

```sql
create table if not exists public.responsaveis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  cor text,
  created_at timestamptz not null default now(),
  unique (user_id, nome)
);
```

`cor = 'pessoal'` identifica o responsável principal.

### `authorized_users`

```sql
create table if not exists public.authorized_users (
  email text primary key,
  created_at timestamptz not null default now()
);
```

O usuário autenticado deve conseguir verificar apenas o próprio email, sem enumerar a lista.

### Parcelamentos

A tela deriva parcelamentos de `gastos.parcela`. Não crie uma tabela nova apenas por existir uma constante legada.

Decisão pendente:

- remover o contrato legado; ou
- transformar parcelamentos em entidade real com leitura e escrita próprias.

## 🛡️ RLS

Migration:

```text
supabase/migrations/20260611_user_data_isolation.sql
supabase/migrations/20260612_supabase_security_hardening.sql
```

Ela:

- habilita RLS;
- recria policies próprias;
- exige `auth.uid() = user_id`;
- protege relações entre gasto e fatura;
- limita `authorized_users` ao email da sessão.
- ativa `FORCE ROW LEVEL SECURITY`;
- remove privilégios do papel `anon`;
- limita `authenticated` às operações usadas pelo app;
- restringe RPCs a usuários autenticados;
- adiciona integridade composta entre `fatura_id` e `user_id`;
- valida que o caminho do PDF pertence à pasta do dono.

Exemplo:

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

> [!IMPORTANT]
> Filtros `.eq("user_id", ...)` melhoram previsibilidade, mas não são a barreira de segurança. A barreira obrigatória é a RLS.

Antes da migration:

- [ ] Todos os registros possuem o dono correto.
- [ ] Policies antigas foram revisadas.
- [ ] O ambiente correto foi selecionado.

Depois da migration:

- [ ] Usuário A não lê dados de B.
- [ ] Usuário A não altera dados de B.
- [ ] Usuário A não exclui dados de B.
- [ ] Troca de conta não reaproveita cache.

Teste transacional:

```text
supabase/tests/user_data_isolation.sql
```

O teste escolhe duas contas existentes, cria fixtures temporárias, simula o
papel `authenticated`, verifica SELECT/INSERT/UPDATE/DELETE cruzados e termina
com `ROLLBACK`.

## 🔑 OAuth Google

Configure:

- Google provider no Supabase;
- Site URL;
- Redirect URLs local, Preview e Production;
- origens autorizadas no Google Cloud.

```text
http://localhost:3000/auth/callback
https://<dominio>/auth/callback
```

Após o callback, `AuthProvider` valida `authorized_users`.

## 🌐 Route handlers

### `GET /api/health`

- valida o ambiente;
- retorna HTTP `200` ou `503`;
- não expõe valores secretos.

### `GET /auth/callback`

- lê `code`;
- chama `exchangeCodeForSession`;
- redireciona para o app.

### `POST /logout`

Existe no projeto, mas a UI usa `supabase.auth.signOut()` diretamente. Avaliar remoção ou adoção consistente.

### `POST /api/process-fatura`

**Entrada**

```json
{
  "pdfPath": "<user_id>/<uuid>.pdf",
  "fileName": "fatura.pdf",
  "fileSize": 123456
}
```

Header:

```text
Authorization: Bearer <access_token>
```

**Fluxo**

1. valida token;
2. valida caminho e propriedade;
3. valida tamanho e assinatura `%PDF-`;
4. calcula SHA-256;
5. bloqueia duplicidade;
6. chama Gemini;
7. valida a resposta com Zod;
8. salva por RPC transacional;
9. remove o upload em caso de falha.

**Status**

| HTTP | Situação |
|---:|---|
| `400` | Entrada ou PDF inválido |
| `401` | Sessão ausente ou inválida |
| `409` | Arquivo duplicado |
| `422` | Resposta da IA inválida |
| `429` | Cota da IA |
| `503` | IA indisponível |
| `504` | Timeout |
| `500` | Configuração, Storage ou persistência |

## 📦 Storage

Bucket privado: `faturas`.

- caminho `<user_id>/<uuid>.pdf`;
- policies por usuário;
- URL assinada para visualização;
- remoção após exclusão da fatura;
- compensação quando a importação falha;
- hash único por usuário.

Migrations:

```text
20260611_invoice_pdf_storage.sql
20260612_invoice_pdf_hash.sql
```

## 🗑️ Exclusão atômica

RPC: `delete_fatura_atomically`.

1. valida `auth.uid()`;
2. bloqueia a linha;
3. conta dependências;
4. exclui com cascade;
5. retorna caminho e contagens;
6. o cliente remove o PDF após o commit.

Migration:

```text
supabase/migrations/20260612_atomic_invoice_deletion.sql
```

## 🪝 Hooks e fontes

| Hook | Fonte |
|---|---|
| `useFaturas` | `faturas` |
| `useGastos` | `gastos` |
| `useEstatisticas` | cálculo client-side |
| `useParcelamentos` | `gastos` com `parcela` |
| `useResponsaveis` | `responsaveis` |

## ✅ Verificação manual

- [ ] Login autorizado.
- [ ] Login não autorizado.
- [ ] Isolamento com dois usuários.
- [ ] CRUD de responsável.
- [ ] Importação e bloqueio de duplicidade.
- [ ] Edição e divisão de gasto.
- [ ] Filtro de parcelamentos por responsável.
- [ ] Exclusão de fatura e PDF.
- [ ] Preview e Production.

## 🧹 Decisões pendentes

- [ ] Remover ou adotar a rota `/logout`.
- [ ] Definir o destino do contrato `TABLES.PARCELAMENTOS`.
- [ ] Criar testes de integração para RLS.
- [ ] Avaliar job assíncrono para importações longas.
