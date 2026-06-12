# 🤖 Guia para Claude e outros assistentes

> Documento opcional de compatibilidade. A fonte obrigatória de instruções é `AGENTS.md`.

## 🚨 Primeira regra

Este projeto usa Next.js `16.2.7` com mudanças incompatíveis com versões anteriores.

1. Leia `AGENTS.md`.
2. Consulte `node_modules/next/dist/docs/`.
3. Não assuma APIs, convenções ou estrutura do Next.js.

## 🧭 Contexto rápido

| Área | Estado |
|---|---|
| Frontend | Next.js 16 + React 19 + TypeScript |
| Dados | Supabase Auth, PostgreSQL, RLS e Storage |
| Estado remoto | React Query |
| IA | Google Gemini |
| Deploy | Vercel |
| Qualidade | Lint, typecheck e build aprovados |
| Testes | Suíte automatizada ainda pendente |

## 📚 Ordem de leitura

1. [AGENTS.md](./AGENTS.md)
2. [README.md](./README.md)
3. [ARCHITECTURE.md](./ARCHITECTURE.md)
4. [DEVELOPMENT.md](./DEVELOPMENT.md)
5. [API_INTEGRATION.md](./API_INTEGRATION.md)
6. [FUTURAS_MELHORIAS.md](./FUTURAS_MELHORIAS.md)

## ✅ Regras essenciais

- [ ] Preservar RLS e isolamento por `user_id`.
- [ ] Nunca expor `GEMINI_API_KEY`.
- [ ] Tratar dados da IA como entrada não confiável.
- [ ] Reutilizar `components/ui`.
- [ ] Respeitar a fatura selecionada pelo `FaturaProvider`.
- [ ] Manter páginas como Server Components quando possível.
- [ ] Não inventar tabelas ou recursos ausentes.
- [ ] Atualizar documentação junto com contratos.
- [ ] Rodar `npm run check` ao concluir.

## 📌 Estado conhecido

- PDFs são persistidos no bucket privado `faturas`.
- Importações usam validação Zod e RPC transacional.
- Parcelamentos são derivados de `gastos.parcela`.
- Divisões ficam em `gastos.divisoes`.
- A migration de isolamento por usuário existe e precisa ser validada em produção.
- Não existe suíte automatizada de testes.

## 🗑️ Sobre este arquivo

Pode ser removido se nenhuma ferramenta depender especificamente de `CLAUDE.md`. Ele deve permanecer curto e não duplicar a arquitetura completa.
