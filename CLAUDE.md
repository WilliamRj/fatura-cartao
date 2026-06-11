# Guia para Claude e outros assistentes

## Status

Este arquivo e um guia opcional para ferramentas que procuram especificamente `CLAUDE.md`.

A fonte obrigatoria de instrucoes para agentes neste repositorio e `AGENTS.md`. Em especial, qualquer alteracao de Next.js deve consultar os guias locais em `node_modules/next/dist/docs/`.

## Contexto atual

- Next.js `16.2.7`.
- React `19.2.4`.
- TypeScript 5.
- Supabase Auth/PostgreSQL.
- React Query.
- Google Gemini para processar faturas PDF.
- Vercel para deploy.

## Leitura recomendada

1. `AGENTS.md`
2. `README.md`
3. `ARCHITECTURE.md`
4. `DEVELOPMENT.md`
5. `API_INTEGRATION.md`
6. `FUTURAS_MELHORIAS.md`

## Regras essenciais

- Nao assumir APIs do Next.js sem consultar `node_modules/next/dist/docs/`.
- Nao expor `GEMINI_API_KEY` ou outras chaves privadas.
- Tratar dados do Gemini como entrada nao confiavel.
- Preservar RLS e isolamento por usuario.
- Reutilizar componentes em `components/ui`.
- Respeitar a fatura selecionada em `FaturaProvider`.
- Nao documentar Storage, testes ou tabela de parcelamentos como concluidos sem confirmar no codigo.
- Rodar `npm run lint` e `npx tsc --noEmit` ao concluir alteracoes.

## Estado conhecido

- Typecheck passa.
- Lint ainda falha; detalhes em `FUTURAS_MELHORIAS.md`.
- Nao existe suite automatizada de testes.
- Storage de PDFs ainda nao esta implementado.
- Parcelamentos sao derivados de `gastos.parcela`.

## Sugestao de exclusao

Este arquivo pode ser removido se Claude nao for utilizado no projeto. Ele e deliberadamente curto para nao duplicar as regras e a arquitetura mantidas nos outros documentos.
