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
ACCESS_EMAIL_ENABLED=false
RESEND_API_KEY=
ACCESS_EMAIL_FROM=
```

- As duas variáveis `NEXT_PUBLIC_*` são públicas por definição.
- `GEMINI_API_KEY` é privada.
- O envio de emails administrativos permanece desabilitado enquanto
  `ACCESS_EMAIL_ENABLED=false`, mesmo que as credenciais estejam preenchidas.
- Para habilitar no futuro, configure `ACCESS_EMAIL_ENABLED=true`,
  `RESEND_API_KEY` e um remetente verificado em `ACCESS_EMAIL_FROM`.
- Com o envio desabilitado, a decisão de acesso continua funcionando e o
  evento de auditoria registra o email como `skipped`.
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
  responsavel_id uuid not null,
  responsavel_nome_snapshot text not null,
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
  { "valor": 50.00, "responsavel_id": "<uuid>", "responsavel_nome_snapshot": "Pessoa A" },
  { "valor": 50.00, "responsavel_id": "<uuid>", "responsavel_nome_snapshot": "Pessoa B" }
]
```

### `responsaveis`

```sql
create table if not exists public.responsaveis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  cor text,
  is_owner boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, nome)
);
```

`is_owner = true` identifica o titular da conta. A migration cria índices para
garantir um único titular e impedir nomes repetidos sem diferenciar
maiúsculas/minúsculas.

RPCs:

- `ensure_owner_responsavel()`: cria o titular automaticamente após o acesso ser aprovado.
- `rename_responsavel(id, nome)`: renomeia o cadastro sem alterar snapshots históricos.
- `archive_or_delete_responsavel(id)`: arquiva quando existe histórico ou exclui quando não existe.

### `authorized_users`

```sql
create table if not exists public.authorized_users (
  email text primary key,
  created_at timestamptz not null default now()
);
```

O usuário autenticado deve conseguir verificar apenas o próprio email, sem enumerar a lista.

> Tabela legada mantida como compatibilidade. O estado oficial passa a ser
> armazenado em `app_users`.

### Controle de acesso

```text
app_users
  perfil Google + access_status + datas, motivo e expiração opcional

system_admins
  usuários Master definidos somente por SQL

access_audit_log
  histórico de decisões, expiração e resultado do email
```

RPCs:

- `get_my_access_state()`: registra ou consulta a própria solicitação.
- `renew_my_access_request()`: reabre uma solicitação recusada ou retirada.
- `withdraw_my_access_request()`: retira uma solicitação pendente.
- `admin_list_access_requests(status)`: lista usuários para o Master.
- `admin_set_access_status(user_id, status, reason, access_expires_at)`: decide e registra expiração opcional.
- `admin_get_access_audit(user_id)`: consulta o histórico administrativo.
- `admin_export_access_audit()`: retorna todo o histórico para exportação CSV.

Route handlers:

- `POST /api/admin/access/decision`: executa a decisão e, somente quando
  `ACCESS_EMAIL_ENABLED=true`, envia o email via Resend.
- `GET /api/admin/access/audit-export`: gera o CSV administrativo para Masters.

As RPCs administrativas verificam `system_admins` no banco. Ocultar o card no
frontend não é considerado uma barreira de segurança.

### Parcelamentos

A tela deriva parcelamentos de `gastos.parcela`. Essa é a decisão oficial do
modelo atual.

- Não existe DTO `ParcelamentoRow`.
- Não existe `TABLES.PARCELAMENTOS` no contrato da aplicação.
- `mapGastoRowToParcelamento` transforma gastos parcelados na visão exibida.
- Uma tabela física antiga, se existir no Supabase, é apenas legado até sua
  remoção ser auditada.

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

Antes do upload, o cliente calcula SHA-256 e consulta `faturas.arquivo_hash`
sob RLS. A API recebe `fileHash`, recalcula o digest do conteúdo armazenado e
rejeita divergências. Todas as respostas incluem `requestId`, `stage` e
`durationMs` para observabilidade do lote.

### `import_jobs`

Fila persistente por usuário com `request_id`, metadados do PDF, status,
progresso, estágio, erro, duração e `fatura_id`. O endpoint
`POST /api/import-jobs` registra o job e responde `202`; o processamento segue
em `after()`. A interface faz polling enquanto houver jobs `queued` ou
`processing`.

Migration: `20260612_persistent_invoice_import_jobs.sql`.

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

## 🔄 DTOs e mappers

| Camada | Convenção | Exemplo |
|---|---|---|
| Supabase | snake_case + sufixo `Row` | `FaturaRow.valor_total` |
| Mapper | conversão explícita | `mapFaturaRow` |
| Domínio | camelCase | `Fatura.valorTotal` |

Modelos da aplicação ficam em `lib/domain/models.ts`. Componentes não devem
consumir diretamente linhas do Supabase.

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
- [x] Remover o contrato `TABLES.PARCELAMENTOS` e manter visão derivada.
- [ ] Criar testes de integração para RLS.
- [x] Persistir jobs e processá-los após a resposta com `after()`.
- [ ] Adotar worker independente quando uma função Vercel deixar de ser suficiente.
