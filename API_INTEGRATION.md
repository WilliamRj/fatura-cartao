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
  arquivo_hash text,
  created_at timestamptz not null default now()
);

create index if not exists idx_faturas_user_data
  on public.faturas(user_id, data_importacao desc);
```

`data_importacao` registra o inicio da requisicao de importacao como um instante
UTC (`timestamptz`). A interface apresenta esse instante no fuso
`America/Sao_Paulo`.

A migration `20260612_invoice_import_timestamp.sql` tambem converte schemas
legados onde a coluna era `date`. Nesses registros antigos, apenas o dia pode
ser preservado, pois a hora original nunca foi armazenada.

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

`TABLES.PARCELAMENTOS` ainda existe, mas `useDeleteFatura` nao acessa essa tabela diretamente. Existem duas opcoes:

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

O wrapper server-side fica em `app/login/page.tsx`; o login e iniciado pelo componente
`components/pages/login-client.tsx`.

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
- body JSON com `pdfPath`, `fileName` e `fileSize`;
- o PDF ja deve estar no bucket privado `faturas`, enviado diretamente pelo cliente.

Fluxo:

1. valida token;
2. valida caminho, tamanho, assinatura e limite de 20 MB do PDF;
3. calcula o SHA-256 e verifica se o usuario ja importou o mesmo arquivo;
4. envia PDF ao Gemini com timeout de 240 segundos;
5. interpreta e valida a resposta com Zod;
6. grava `faturas`, `arquivo_url`, `arquivo_hash` e `gastos` pela RPC transacional;
7. remove o objeto enviado se qualquer etapa falhar.

Resposta de sucesso:

```json
{
  "success": true,
  "fatura": {}
}
```

Status tratados:

- `400`: arquivo ausente;
- `400`: arquivo invalido ou maior que 20 MB;
- `401`: token ausente/invalido;
- `409`: PDF ja importado pelo mesmo usuario;
- `422`: resposta da IA invalida;
- `429`: cota da IA;
- `503`: indisponibilidade da IA;
- `504`: processamento da IA excedeu 240 segundos;
- `500`: configuracao, storage ou persistencia.

Pendencias importantes:

- observabilidade;
- avaliar job assincrono se faturas reais continuarem excedendo quatro minutos.

## Storage

O PDF original e armazenado no bucket privado `faturas`.

- O caminho segue `<user_id>/<uuid>.pdf` e e salvo em `faturas.arquivo_url`.
- Policies de `storage.objects` restringem leitura, upload e exclusao ao proprio usuario.
- A tela gera URL assinada com validade curta para visualizar o arquivo.
- A exclusao da fatura tenta remover tambem o objeto do Storage.
- A rota remove o arquivo recem-enviado se a RPC de importacao falhar.
- O SHA-256 fica em `faturas.arquivo_hash`, com indice unico por usuario.
- A consulta previa evita consumir cota da IA para arquivos repetidos; o indice unico protege contra requisicoes simultaneas.
- Bucket, policies, coluna e RPC atualizada estao em `supabase/migrations/20260611_invoice_pdf_storage.sql`.
- Hash, constraint, indice e RPC atualizada estao em `supabase/migrations/20260612_invoice_pdf_hash.sql`.

## Exclusao de faturas

A exclusao usa a RPC `delete_fatura_atomically`:

1. valida `auth.uid()` e a propriedade da fatura;
2. bloqueia a linha da fatura durante a operacao;
3. conta os registros relacionados;
4. exclui a fatura, com cascade para `gastos` e para `parcelamentos` quando essa tabela legada existir;
5. retorna `arquivo_url`, `gastos_removidos` e `parcelamentos_removidos`;
6. o cliente remove o PDF do Storage depois do commit.

O banco permanece atomico. Como Supabase Storage e externo a transacao PostgreSQL, uma falha ao remover o PDF gera aviso especifico e pode deixar apenas um arquivo orfao, nunca uma fatura parcialmente excluida.

Migration: `supabase/migrations/20260612_atomic_invoice_deletion.sql`.

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
- constantes `STORAGE` em `lib/api/endpoints.ts`, usadas pelo upload, visualizacao e exclusao dos PDFs.
- rota `/logout`, se o logout continuar exclusivamente client-side.
