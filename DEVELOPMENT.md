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

## 🛠️ Comandos

| Comando | Finalidade |
|---|---|
| `npm run dev` | Desenvolvimento |
| `npm run lint` | Regras estáticas |
| `npm run typecheck` | Tipos |
| `npm run build` | Build de produção |
| `npm run check` | Lint + tipos + build |
| `npm run start` | Executar o build |

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
| `lib/api/` | Tipos, tabelas e query keys |
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
- [ ] Use contratos de `lib/api`.
- [ ] Trate `{ error }` do Supabase.
- [ ] Inclua o usuário na query key.
- [ ] Filtre explicitamente por `user_id`.
- [ ] Invalide apenas as queries relacionadas.
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
3. Atualize os tipos.
4. Atualize hooks e mappers.
5. Teste com dois usuários.
6. Atualize `API_INTEGRATION.md`.

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
