# 💳 Cartão Inteligente

> Gestão de faturas, gastos, responsáveis e parcelamentos em um só lugar.

Aplicação web em PT-BR para importar faturas em PDF, organizar despesas, dividir valores entre responsáveis, acompanhar compras parceladas e exportar relatórios claros.

## ✨ O que o app entrega

| Área | Recursos |
|---|---|
| 🔐 Acesso | Login Google, lista de usuários autorizados e isolamento por conta |
| 📄 Faturas | Upload, processamento por IA, visualização e exclusão transacional |
| 🧾 Gastos | Busca, filtros, ordenação, edição, observações e divisões |
| 💰 Parcelamentos | Progresso, filtro por responsável e valores divididos |
| 📊 Relatórios | Visões por período, categoria e responsável, com exportação PDF |
| 🎨 Experiência | Tema claro/escuro, layout responsivo e feedbacks de operação |

## 🧱 Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js `16.2.7`, React `19.2.4`, TypeScript 5 |
| UI | Tailwind CSS 4, Base UI, Lucide e Recharts |
| Estado remoto | TanStack React Query 5 |
| Backend | Supabase Auth, PostgreSQL, RLS e Storage |
| IA | Google Gemini |
| PDF | jsPDF + jspdf-autotable |
| Deploy | Vercel |

## 🚀 Começando

### 1. Instale as dependências

```bash
npm install
```

### 2. Configure o ambiente

Crie `.env.local` com base em `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
```

> [!IMPORTANT]
> `GEMINI_API_KEY` é privada e nunca deve receber o prefixo `NEXT_PUBLIC_`.

### 3. Inicie o projeto

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## 🛠️ Comandos

| Comando | Uso |
|---|---|
| `npm run dev` | Servidor local |
| `npm run build` | Build de produção |
| `npm run start` | Executa o build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Validação TypeScript |
| `npm run check` | Lint + typecheck + build |

> Ainda não existe uma suíte automatizada de testes. Esse trabalho está priorizado no roadmap.

## 🗂️ Estrutura principal

```text
app/
  api/health/                 # Healthcheck do deploy
  api/process-fatura/         # Processamento do PDF
  auth/callback/              # Callback OAuth
  faturas/ gastos/            # Rotas server-side
  parcelamentos/ relatorios/
components/
  pages/                      # Experiências client por rota
  ui/                         # Primitivos de interface
  auth-provider.tsx           # Sessão e autorização
  fatura-provider.tsx         # Fatura selecionada
  app-sidebar.tsx             # Navegação global
lib/
  api/                        # DTOs, mappers, endpoints e query key factories
  domain/                     # Modelos usados pela aplicação
  hooks/                      # React Query + Supabase
  env/                        # Validação de ambiente
  server/                     # Logger server-side
  supabase/                   # Cliente Supabase
  utils/pdfExport.ts          # Exportação de relatório
supabase/migrations/          # Evolução versionada do banco
```

## 🔄 Fluxo de importação

1. O navegador valida assinatura e tamanho, calcula SHA-256 e bloqueia duplicidade.
2. O PDF segue para o bucket privado `faturas`.
3. `/api/process-fatura` valida sessão, caminho, assinatura, tamanho e hash.
4. O Gemini extrai os lançamentos.
5. Zod valida e normaliza a resposta.
6. Uma RPC salva fatura e gastos de forma transacional.
7. Falhas removem o PDF temporário e retornam estágio, duração e `requestId`.

Lotes são enviados sequencialmente para `import_jobs`. Após a confirmação do
servidor, o processamento continua com `after()` mesmo ao navegar pelo app ou
fechar a janela. Ao retornar, a tela recupera progresso e resultado do
Supabase.

## 🔒 Segurança por usuário

Cada fatura, gasto e responsável pertence ao usuário autenticado.

- Queries e mutações incluem `user_id`.
- O cache do React Query é separado por conta.
- Logout e troca de sessão limpam o cache.
- RLS no Supabase bloqueia acesso cruzado.
- PDFs ficam em caminhos privados por usuário.

Migration principal:

```text
supabase/migrations/20260611_user_data_isolation.sql
supabase/migrations/20260612_supabase_security_hardening.sql
```

> [!WARNING]
> Antes de atender múltiplas contas em produção, aplique e valide as migrations no Supabase e teste o isolamento com dois usuários autorizados.

## 🐳 Supabase local

Para aplicar migrations e testar RLS em um ambiente descartável, consulte o
passo a passo em [DEVELOPMENT.md](./DEVELOPMENT.md#-supabase-local).

O setup usa Docker Desktop e o Supabase CLI instalado como dependência de
desenvolvimento do projeto.

## ☁️ Deploy na Vercel

Configure as três variáveis em **Development**, **Preview** e **Production**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`

Após publicar:

```text
GET https://<dominio>/api/health
```

O esperado é HTTP `200` com `status: "ok"`. Configure também o callback OAuth:

```text
https://<dominio>/auth/callback
```

Detalhes operacionais estão em [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md).

## 📚 Documentação

| Documento | Quando consultar |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Entender componentes, dados e fluxos |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Desenvolver e validar alterações |
| [API_INTEGRATION.md](./API_INTEGRATION.md) | Schema, RLS, Storage e APIs |
| [BACKEND_INTEGRATION_CHECKLIST.md](./BACKEND_INTEGRATION_CHECKLIST.md) | Auditar Supabase e produção |
| [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) | Publicar e executar smoke test |
| [FUTURAS_MELHORIAS.md](./FUTURAS_MELHORIAS.md) | Acompanhar roadmap e prioridades |

## ✅ Estado atual

Revisado em **12 de junho de 2026**:

- [x] Lint aprovado.
- [x] TypeScript aprovado.
- [x] Build de produção aprovado.
- [x] PDFs persistidos no Supabase Storage.
- [x] Importação e exclusão transacionais.
- [x] Dados isolados no código e migration RLS disponível.
- [ ] Migrations e isolamento validados no ambiente de produção.
- [ ] Suíte automatizada de testes.
