# 🚀 Roadmap de evolução

> **Cartão Inteligente** · Backlog técnico e de produto<br>
> Revisado em **12 de junho de 2026** · Next.js, Supabase, Vercel, React Query, UX e qualidade

Este documento concentra o que já foi entregue, o que está em andamento e o que deve orientar as próximas atualizações. A proposta é continuar detalhado, mas permitir uma leitura rápida por prioridade, status e impacto.

## 📊 Visão geral

| Indicador | Situação |
|---|---|
| Base técnica | Next.js App Router + Supabase + React Query |
| Produção | Vercel, com healthcheck e logs estruturados |
| Qualidade | Lint e TypeScript aprovados |
| Segurança | Isolamento por usuário implementado; validação em produção pendente |
| Importação | PDF persistido, validado por IA e salvo de forma transacional |
| Foco atual | Segurança operacional, modelo de dados, UX mobile e testes |

### Progresso dos 24 itens

| Status | Quantidade | Significado |
|---|---:|---|
| ✅ Concluído | 6 | Implementado e validado no código |
| 🚧 Parcial | 4 | Parte relevante entregue; ainda há pendências |
| 📌 Planejado | 14 | Priorizado para ciclos futuros |

### Legenda

- ✅ **Concluído:** entregue e verificado.
- 🚧 **Parcial:** já possui implementação, mas ainda não atende todo o critério de conclusão.
- 📌 **Planejado:** ainda precisa ser iniciado.
- 🔒 **Depende do ambiente:** exige ação ou validação no Supabase/Vercel.

### Navegação rápida

- [🔥 P0 · Estabilidade imediata](#prioridade-0)
- [🏗️ P1 · Arquitetura e dados](#prioridade-1)
- [✨ P2 · UI, UX e produto](#prioridade-2)
- [🧪 P3 · Qualidade contínua](#prioridade-3)
- [🗺️ Roadmap por sprint](#roadmap)
- [✅ Checklist de PR](#checklist-pr)

## 🧭 Direção do produto

O projeto já possui uma base funcional sólida: autenticação individual, gerenciamento de faturas e gastos, divisões por responsável, parcelamentos, relatórios em PDF, tema claro/escuro e processamento de documentos por IA.

Os próximos ganhos devem se concentrar em quatro frentes:

1. **Confiabilidade:** testes automatizados e operações financeiras consistentes.
2. **Segurança:** RLS validada em produção e isolamento comprovado entre contas.
3. **Experiência:** fluxos mobile, formulários e estados vazios mais claros.
4. **Escala:** importações observáveis, cache previsível e melhor organização dos dados.

### Verificações atuais

- [x] `npm run lint` passa sem erros ou warnings.
- [x] `npm run typecheck` passa sem erros.
- [x] `npm run build` gera o bundle de produção.
- [x] Guias locais do Next.js 16 são consultados antes de alterações estruturais.
- [ ] Smoke test completo executado nos ambientes Preview e Production.

### Contexto Vercel

> [!IMPORTANT]
> Rotas em `app/api/*` executam como funções serverless. Variáveis, timeout, payload, logs e persistência precisam ser tratados como requisitos de produção, não como detalhes de infraestrutura.

- `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` devem existir em Development, Preview e Production.
- PDFs que precisam persistir devem permanecer no Supabase Storage; o filesystem temporário da função não é armazenamento.
- Mudanças em autenticação, callback, API ou upload devem ser testadas no domínio da Vercel.

---

<a id="prioridade-0"></a>

## 🔥 Prioridade 0 · Estabilidade imediata

> Itens que bloqueiam evolução segura ou afetam diretamente produção.

### ✅ 1. Fazer o lint passar

**Concluído em:** 11 de junho de 2026

**Resultado**

- `npm run lint` passa sem erros ou warnings.
- `npx tsc --noEmit` continua passando sem erros.

**O que foi feito**

- Tratamento de erros alterado de `any` para `unknown` em configuracoes e importacao de faturas.
- Imports, constantes e estados sem uso removidos das telas de faturas e gastos.
- `FaturaProvider` passou a armazenar apenas o ID selecionado e derivar a fatura atual da lista, eliminando o `setState` sincrono dentro de `useEffect`.
- Problemas anteriores da rota de processamento, exportacao PDF e relatorios ja estavam corrigidos.

**Manutenção contínua**

- Manter `npm run lint` como verificacao obrigatoria antes de cada deploy.
- Evitar desativar regras de lint para contornar novos erros; corrigir a causa sempre que possivel.

### ✅ 2. Validar rigorosamente a resposta da IA antes de salvar

**Concluído em:** 11 de junho de 2026

**Resultado**

- A resposta do Gemini passa por schema `zod` estrito antes de qualquer escrita.
- Mes de referencia, moeda, datas reais, valores positivos, parcelas, categorias e limites de texto/lista sao validados e normalizados.
- Respostas invalidas retornam HTTP 422 com campos compreensiveis e deixam explicito que nenhum dado foi salvo.
- Fatura e gastos sao inseridos pela RPC transacional `import_fatura_atomically`, impedindo estado parcialmente salvo.
- Migration criada em `supabase/migrations/20260611_atomic_invoice_import.sql`.

**Complementos entregues**

- O PDF original passa a ser salvo no bucket privado `faturas`.
- O caminho e vinculado a `faturas.arquivo_url`.
- O SHA-256 e salvo em `faturas.arquivo_hash` e impede importacao duplicada por usuario.

### ✅ 3. Revisar exclusões relacionadas

**Concluído em:** 12 de junho de 2026

**Resultado**

- `gastos.fatura_id` usa `ON DELETE CASCADE`.
- A tabela legada `parcelamentos`, quando existir com `fatura_id`, tambem recebe cascade.
- `useDeleteFatura` executa apenas a RPC `delete_fatura_atomically`, eliminando deletes client-side parciais.
- A RPC valida o usuario com `auth.uid()`, bloqueia a fatura durante a operacao e remove os dados relacionados em uma unica transacao.
- A confirmacao mostra a quantidade real de lancamentos e parcelamentos derivados que serao removidos.
- A RPC retorna o caminho do PDF e as contagens removidas para feedback ao usuario.
- A limpeza do PDF ocorre depois do commit e exibe aviso especifico se o Storage falhar.
- Migration criada em `supabase/migrations/20260612_atomic_invoice_deletion.sql`.

### ✅ 4. Corrigir acessibilidade dos controles principais

**Concluído em:** 12 de junho de 2026

**Resultado**

- Botoes de icone de tema, logout, sidebar, menu mobile, faturas, gastos, arquivos e responsaveis possuem nome acessivel.
- Links de navegacao informam a pagina atual com `aria-current`.
- Controles de expandir/recolher informam `aria-expanded` e o elemento controlado.
- Seletores principais sem label visivel possuem `aria-label`.
- Ordenacao de gastos usa `<button>` dentro do cabecalho e atualiza `aria-sort`.
- Linhas da tabela deixaram de simular botoes; a edicao usa uma acao explicita e acessivel.
- Confirmacoes nativas foram substituidas por dialogs do design system.
- O botao padrao de fechar dialogs anuncia "Fechar" em portugues.

### 🚧 5. Validar o ambiente de produção na Vercel

**Implementação no código:** concluída em 12 de junho de 2026<br>
**Status operacional:** depende de validação nos ambientes reais

**Entregue no código**

- Variaveis obrigatorias centralizadas e validadas durante a inicializacao do servidor, com erro estruturado em configuracao invalida.
- Healthcheck `GET /api/health` retorna HTTP 200/503 sem expor segredos.
- `.env.example` versionado com Supabase e Gemini.
- `/api/process-fatura` usa runtime Node.js, `maxDuration` de 300 segundos e limite de PDF de 20 MB.
- O PDF e enviado diretamente ao Supabase Storage, evitando o limite de payload de 4,5 MB da Vercel.
- A chamada Gemini possui timeout controlado de 240 segundos e mensagem especifica.
- Logs serverless em JSON incluem `requestId`, usuario, etapa, status e duracao.
- Respostas da importacao retornam `X-Request-Id` para correlacao com os logs da Vercel.
- PDF original e hash SHA-256 persistem no Supabase.
- Configuracao por ambiente e smoke test documentados em `VERCEL_DEPLOYMENT.md`.

**🔒 Validação operacional pendente**

- Confirmar no painel o repositorio, Production Branch e variaveis de Preview/Production.
- Confirmar os limites reais do plano atual da Vercel.
- Executar o smoke test no dominio de Preview e no dominio final de Production.

---

<a id="prioridade-1"></a>

## 🏗️ Prioridade 1 · Arquitetura e dados

> Melhorias que reduzem acoplamento, inconsistência e risco de crescimento.

### ✅ 6. Reduzir o alcance de Client Components

**Concluído em:** 12 de junho de 2026

**Resultado**

- Todas as rotas `app/**/page.tsx` sao Server Components.
- Dashboard, faturas, gastos, parcelamentos, relatorios e configuracoes renderizam cabecalho estatico no servidor.
- Hooks, filtros, dialogs, uploads, tabelas editaveis e graficos ficaram em `components/pages/*-client.tsx`.
- Cada rota possui metadata propria sem precisar hidratar esse conteudo.
- O login interativo foi extraido para `components/pages/login-client.tsx`.
- `AuthProvider` deixou de importar uma pagina de rota, removendo a dependencia circular com o App Router.
- Providers recebem as paginas server-side pelo slot `children`, conforme o padrao documentado pelo Next.js 16.

**Decisão mantida**

- A carga inicial continua via React Query e Supabase no cliente enquanto autenticacao SSR por cookies e RLS
server-side nao forem projetadas. Migrar apenas as consultas criaria duas fontes de sessao.
- Bundle e metricas reais de rede devem ser acompanhados nos deploys Preview/Production.

### 🚧 7. Fortalecer os limites de segurança do Supabase

**Status:** isolamento implementado; validação real entre contas pendente

O app usa `NEXT_PUBLIC_SUPABASE_ANON_KEY`, cliente Supabase no browser e RLS presumida. Isso e comum, mas exige politicas bem testadas.

**Contexto**

- `lib/supabase/client.ts` usa variaveis publicas.
- Hooks acessam tabelas diretamente do cliente em `lib/hooks/*`.
- `app/api/process-fatura/route.ts` cria cliente Supabase com o token do usuario, o que depende de RLS correta.
- `components/auth-provider.tsx` consulta `authorized_users` para permitir acesso.

**Próximas ações**

- Documentar no repo as politicas RLS esperadas por tabela.
- Criar testes manuais/SQL para garantir que usuarios nao acessam dados de outros usuarios.
- Evitar mensagens de erro que exponham detalhes internos de tabelas.
- Considerar mover mutacoes sensiveis para route handlers/server actions com validacao centralizada.
- Como o app esta publico na Vercel, tratar RLS como barreira obrigatoria, nao apenas defesa adicional.

**✅ Implementado no código em 11 de junho de 2026**

- Queries e mutacoes de faturas, gastos, parcelamentos derivados e responsaveis filtram explicitamente por `user_id`.
- Query keys incluem o ID do usuario.
- Cache do React Query e limpo em logout e troca de sessao.
- Migration RLS criada em `supabase/migrations/20260611_user_data_isolation.sql`.

**🔒 Pendente no ambiente**

- Executar e validar a migration no projeto Supabase de producao.
- Testar isolamento com duas contas autorizadas diferentes.

### 📌 8. Unificar modelo de dados e nomes

Ha tipos em `lib/data.ts`, tipos de API em `lib/api/types.ts` e mapeamentos nos hooks. Isso funciona, mas tende a divergir.

Exemplos:

- `ApiGasto` e `Gasto` duplicam varios campos.
- `ApiFatura.quantidade_lancamentos` vira `Fatura.quantidadeLancamentos`.
- `Parcelamento` e derivado de gastos em `lib/hooks/useParcelamentos.ts`, apesar de existir constante `TABLES.PARCELAMENTOS`.

**Próximas ações**

- Criar uma camada clara de DTOs e mappers em `lib/api/mappers.ts`.
- Definir categorias/responsaveis com tipos literais quando possivel.
- Decidir se `parcelamentos` sera entidade propria ou visao derivada de `gastos`.
- Adicionar fixtures de teste para garantir que mappers continuam corretos.

### 📌 9. Melhorar cache e invalidações do React Query

Ha mistura de query keys constantes e arrays literais.

Exemplos:

- `QUERY_KEYS.GASTOS` em `lib/api/endpoints.ts`.
- `['gastos', faturaId]` em `lib/hooks/useGastos.ts:8`.
- `['parcelamentos', faturaId]` em `lib/hooks/useParcelamentos.ts:8`.
- `['estatisticas', gastos]` em `lib/hooks/useGastos.ts:126`.

**Próximas ações**

- Centralizar factories de query keys: `gastos.list(faturaId)`, `estatisticas.byFatura(faturaId)`.
- Evitar usar o array inteiro de gastos como parte da query key de estatisticas; calcular com `useMemo` ou query key por `faturaId`.
- Fazer invalidacoes especificas apos mutacoes para reduzir refetch desnecessario.

### 🚧 10. Tratar importação de múltiplos PDFs como job observável

**Implementação parcial em:** 12 de junho de 2026

`components/pages/faturas-client.tsx` processa arquivos em loop sequencial com estado individual por arquivo.

Na Vercel, esse ponto e ainda mais importante porque o processamento acontece em uma requisicao serverless. Chamadas longas para Gemini, PDFs grandes ou varios arquivos em sequencia podem atingir limites de execucao, memoria ou payload.

**Checklist da evolução**

- [x] Mostrar progresso por arquivo: aguardando, enviando, processando, salvo, erro.
- [x] Permitir remover/reprocessar arquivo que falhou sem repetir todos.
- Validar tamanho maximo e tipo real do arquivo, nao apenas extensao/dropzone.
- Evitar importacao duplicada por hash, mes ou combinacao de `mes_referencia` + usuario.
- Considerar fila server-side se os PDFs forem grandes ou a IA demorar.
- Considerar arquitetura assincrona: upload do PDF para storage, registro de job no banco, processamento posterior e polling/status na UI.
- [x] Definir timeout e mensagem de erro especifica para limite/indisponibilidade da IA.

**Complementos implementados**

- Falhas 422 ficam associadas ao arquivo e informam explicitamente que nenhum dado foi salvo.
- O `requestId` aparece durante o processamento e pode ser correlacionado com os logs da Vercel.
- A saida do Gemini usa modo JSON e mantém Zod como validacao final.
- O schema nativo fica pendente da migracao do SDK legado `@google/generative-ai` para `@google/genai`, exigido pela API atual do Gemini 3.5 para `responseFormat`.
- Valores monetarios brasileiros e internacionais comuns sao normalizados.
- Creditos, estornos e ajustes negativos sao preservados para conciliacao; valores zero e ilegíveis continuam invalidos.
- A soma dos lancamentos e comparada ao total da fatura em centavos antes de qualquer persistencia.

---

<a id="prioridade-2"></a>

## ✨ Prioridade 2 · UI, UX e produto

> Melhorias para tornar o uso recorrente mais simples, claro e agradável.

### 📌 11. Reorganizar o header mobile

No mobile, `components/app-sidebar.tsx:284-293` coloca seletor de fatura, tema, logout e menu no mesmo bloco. O seletor tem largura fixa em `components/app-sidebar.tsx:285`.

**Problemas atuais**

- Quebra em telas estreitas.
- Dificuldade com zoom de acessibilidade.
- Meses longos podem truncar mal.

**Próximas ações**

- Priorizar menu + fatura atual no header.
- Mover tema e logout para o sheet.
- Usar seletor compacto ou abrir selecao de fatura dentro do menu.

### 📌 12. Tornar filtros, labels e formulários mais acessíveis

Exemplos:

- Busca de gastos usa placeholder como label visual em `components/pages/gastos-client.tsx`.
- Campo de novo responsavel fica em `components/pages/configuracoes-client.tsx`.
- Labels do modal de gasto em `components/pages/gastos-client.tsx` ainda devem ser auditadas.

**Próximas ações**

- Usar `label` com `htmlFor` e `id`.
- Quando a label nao deve aparecer, usar `sr-only`.
- Adicionar mensagens de erro por campo no modal de divisao.
- Usar `aria-describedby` para textos auxiliares.

### 📌 13. Melhorar o modal de edição e divisão de gastos

O `DialogContent` padrao usa `sm:max-w-sm` em `components/ui/dialog.tsx:56`, estreito para o fluxo de divisao.

**Próximas ações**

- Permitir largura maior por tela, como `sm:max-w-lg` ou `md:max-w-2xl`.
- Exibir resumo: valor original, soma das divisoes, diferenca restante.
- Transformar linhas de divisao em grid responsivo.
- Bloquear salvar enquanto houver diferenca.
- Sugerir divisao automatica 50/50 ou por responsavel principal/outros.

### 📌 14. Implementar paginação na lista de gastos

A constante sem uso foi removida para manter o lint limpo, mas a tabela ainda exibe todos os itens. A paginação continua relevante para faturas maiores.

**Próximas ações**

- Implementar paginacao client-side inicialmente.
- Em escala maior, paginar no Supabase com `range()`.
- Manter contadores: total filtrado, pagina atual e itens por pagina.
- Exibir botoes Proximo/Anterior com estado desabilitado acessivel.

### ✅ 15. Finalizar a ação de visualizar fatura

**Concluído em:** 11 de junho de 2026

**Resultado**

- PDFs novos sao armazenados no bucket privado `faturas`, em caminho isolado por usuario.
- O botao com icone `Eye` gera URL assinada curta e abre o PDF original em nova aba.
- Faturas antigas sem `arquivo_url` exibem o botao desabilitado.
- A exclusao da fatura tenta remover tambem o arquivo do Storage.

**Evolução futura**

- Implementar detalhe da fatura com resumo, gastos, parcelamentos e auditoria da importacao.

### 📌 16. Melhorar estados vazios e ações contextuais

`EmptyState` aceita `action`, mas varias telas usam apenas texto.

Exemplos:

- Gastos vazios em `components/pages/gastos-client.tsx`.
- Parcelamentos vazios em `components/pages/parcelamentos-client.tsx`.

**Próximas ações**

- Em gastos: CTA para importar fatura ou selecionar outra fatura.
- Em parcelamentos: explicar que depende de lancamentos parcelados e linkar para faturas/gastos.
- Em relatorios: estado vazio quando nao houver dados suficientes para grafico.
- Em configuracoes: CTA para adicionar primeiro responsavel.

### 📌 17. Melhorar gráficos para leitura e acessibilidade

Graficos em `components/dashboard-content.tsx` e `components/pages/relatorios-client.tsx` dependem fortemente de cores.

**Próximas ações**

- Adicionar resumo textual abaixo ou ao lado dos graficos.
- Mostrar valores e percentuais na legenda quando fizer sentido.
- Garantir contraste das cores de `--chart-*` em claro e escuro.
- Evitar que categorias diferentes recebam cores inconsistentes entre Dashboard e Relatorios.
- Adicionar estados vazios especificos para grafico sem dados.

### 📌 18. Ajustar o feedback visual dos cards

`.card-hover` em `app/globals.css:231` eleva cards ao passar o mouse. Isso esta em cards informativos e graficos, podendo sugerir clique.

**Próximas ações**

- Reservar hover com deslocamento para elementos clicaveis.
- Em cards estaticos, usar apenas borda/sombra sutil.
- Padronizar densidade dos cards de metricas para uso financeiro recorrente.

### 📌 19. Revisar textos e consistência visual

**Pontos observados**

- `components/pages/relatorios-client.tsx`: "Por Responsavel" sem acento.
- `app/layout.tsx:13`: "Itau" sem acento.
- `components/pages/login-client.tsx`: revisar continuamente a consistencia visual do login.

**Próximas ações**

- Padronizar portugues: "responsavel", "Itaú", "cartao de credito", "lancamentos", conforme decisao de acentos do projeto.
- Trocar emojis do login por `Loader2` e icone/identidade coerente.
- Criar uma pequena lista de termos oficiais do produto para evitar variacoes.

---

<a id="prioridade-3"></a>

## 🧪 Prioridade 3 · Qualidade contínua

> Investimentos que aumentam confiança em cada alteração e reduzem regressões.

### 📌 20. Adicionar testes unitários para regras financeiras

Areas de maior retorno:

- `formatCurrency`, `formatDate` e `formatDateTime` em `lib/data.ts`.
- Validacao de parcelas `X/Y`.
- Soma de divisoes com tolerancia de centavos em `components/pages/gastos-client.tsx`.
- Calculo de estatisticas por categoria/responsavel em `lib/hooks/useGastos.ts:132-154`.
- Calculo de parcelamentos restantes em `components/pages/parcelamentos-client.tsx`.

### 📌 21. Adicionar testes de integração para fluxos críticos

Fluxos sugeridos:

- Login autorizado vs nao autorizado.
- Importar fatura com sucesso.
- Importar fatura com resposta invalida da IA.
- Editar categoria/responsavel de gasto.
- Dividir gasto e desfazer divisao.
- Excluir fatura e invalidar dashboard.
- Exportar PDF por todos e por responsavel.
- Smoke test no deploy da Vercel para login, carregamento inicial e importacao controlada.

### 📌 22. Preparar observabilidade e auditoria

**Próximas ações**

- Registrar eventos de importacao: usuario, arquivo, hash, duracao, status e erro resumido.
- Evitar `console.error` cru em producao; centralizar logger.
- Adicionar `requestId` em route handlers para depuracao.
- Separar erros esperados de falhas inesperadas, conforme guia local de error handling do Next.
- Correlacionar logs do browser, Vercel Functions e Supabase para depurar problemas que so aparecem no dominio publicado.
- Criar mensagens especificas para falhas comuns em producao: timeout da IA, limite de payload, variavel ausente, sessao expirada e erro de RLS.

### 🚧 23. Revisar dependências e scripts

**Situação atual**

- Existem `package-lock.json` e `pnpm-lock.yaml`; escolher um gerenciador oficial para evitar instalacoes divergentes.
- `test-jspdf.js` na raiz parece script temporario; decidir se vira teste, utilitario documentado ou e removido.
- `package.json` já possui `typecheck` e `check`; ainda não possui `test` ou `format`.

**Próximas ações**

- Padronizar em npm ou pnpm.
- [x] Adicionar `typecheck`: `tsc --noEmit`.
- [x] Adicionar `check`: lint, typecheck e build.
- [ ] Adicionar `test` após escolher o framework.
- [ ] Adicionar `format` após escolher Prettier ou Biome.
- Considerar Prettier ou Biome para formatacao consistente.

### 📌 24. Manter documentação e configuração sincronizadas

**Auditoria realizada em 11 de junho de 2026**

- `README.md`, `ARCHITECTURE.md`, `API_INTEGRATION.md`, `BACKEND_INTEGRATION_CHECKLIST.md` e `DEVELOPMENT.md` foram atualizados para o codigo atual.
- `AGENTS.md` permanece necessario por conter a regra especial do Next.js 16.
- `CLAUDE.md` foi reduzido a um guia de compatibilidade e pode ser removido se Claude nao for usado.
- `FUTURAS_MELHORIAS.md` permanece como backlog e nao deve ser usado como descricao do estado implementado.

**Situação atual**

- `.env.example` já lista apenas as variáveis utilizadas, incluindo `GEMINI_API_KEY`.
- O rewrite global legado de `vercel.json` foi removido em 2026-06-11 para evitar conflito com App Router, chunks e APIs.
- `lib/api/endpoints.ts` ainda declara Storage e tabela `parcelamentos`, embora esses contratos nao estejam plenamente implementados.

**Próximas ações**

- Atualizar documentacao no mesmo PR que alterar schema, env vars, rotas ou funcionalidades.
- Nao marcar recursos planejados como concluidos.
- Preferir links entre documentos a copiar grandes blocos repetidos.
- Revisar referencias de arquivo/linha em `FUTURAS_MELHORIAS.md` quando o codigo mudar significativamente.

---

<a id="roadmap"></a>

## 🗺️ Roadmap por sprint

> A ordem abaixo considera risco, dependências técnicas e valor percebido pelo usuário. Cada sprint pode ser ajustada conforme feedback de produção.

### Sprint 1 · Fundação estável

**Objetivo:** remover bloqueios técnicos e tornar operações financeiras previsíveis.

- [x] Fazer `npm run lint` passar.
- [x] Tipar e validar a resposta da IA com `zod`.
- [x] Corrigir exclusões relacionadas e estados parciais.
- [x] Adicionar nomes acessíveis aos botões de ícone.
- [x] Implementar a visualização segura do PDF original.
- [x] Criar validação centralizada das variáveis de ambiente.
- [ ] Validar variáveis e healthcheck nos ambientes Preview e Production.

**Critério de conclusão:** build aprovado, fatura importada e excluída com sucesso no domínio publicado.

### Sprint 2 · Experiência principal

**Objetivo:** melhorar os fluxos mais usados no dia a dia.

- [ ] Reorganizar o header mobile.
- [ ] Melhorar o modal de edição e divisão.
- [ ] Implementar paginação e contagem na tela de gastos.
- [ ] Adicionar CTAs úteis aos estados vazios.
- [x] Substituir confirmações nativas por dialogs do design system.
- [x] Filtrar parcelamentos por responsável, respeitando divisões.
- [x] Exibir valor original e valor dividido nos cards de parcelamento.

**Critério de conclusão:** importar, revisar, dividir e localizar gastos confortavelmente em desktop e mobile.

### Sprint 3 · Arquitetura e segurança

**Objetivo:** reduzir divergências de dados e comprovar o isolamento entre contas.

- [x] Separar Server e Client Components.
- [ ] Centralizar DTOs, mappers e query keys.
- [ ] Documentar as políticas RLS por tabela.
- [ ] Executar as migrations pendentes no Supabase de produção.
- [ ] Testar isolamento completo com duas contas autorizadas.
- [ ] Definir oficialmente parcelamentos como entidade ou visão derivada.

**Critério de conclusão:** duas contas não conseguem consultar, alterar ou excluir dados uma da outra, inclusive por chamadas diretas ao Supabase.

### Sprint 4 · Testes e confiança

**Objetivo:** proteger regras financeiras e fluxos críticos contra regressões.

- [ ] Escolher o framework de testes.
- [ ] Testar parcelas, moedas, datas, divisões e estatísticas.
- [ ] Testar login autorizado e não autorizado.
- [ ] Testar importação válida, inválida e duplicada.
- [ ] Testar edição, divisão e exclusão de gastos.
- [ ] Testar exportação PDF completa e por responsável.
- [ ] Adicionar smoke test automatizado para Preview.

**Critério de conclusão:** regras financeiras centrais cobertas e fluxos críticos executáveis sem validação exclusivamente manual.

### Sprint 5 · Produto e relatórios

**Objetivo:** transformar dados já existentes em informação mais útil.

- [ ] Criar tela detalhada da fatura.
- [ ] Exibir histórico e auditoria das importações.
- [ ] Adicionar comparativos entre períodos.
- [ ] Melhorar acessibilidade e leitura dos gráficos.
- [ ] Padronizar cores de categorias entre telas.
- [ ] Revisar textos e termos oficiais do produto.

**Já entregue**

- [x] Exportação PDF com `jsPDF` e `autoTable` tipados.
- [x] Download por Blob sem navegação intermediária.
- [x] Relatório completo com divisões, responsáveis e parcelamentos.
- [x] Relatório individual com parte atribuída, percentual e valor original.

### Sprint 6 · Produção e operação

**Objetivo:** melhorar diagnóstico, escala e manutenção do app publicado.

- [x] Criar healthcheck e logs serverless estruturados.
- [x] Persistir PDF e hash no Supabase Storage.
- [x] Definir timeout e limite de upload.
- [ ] Executar smoke test no domínio final.
- [ ] Adicionar monitoramento de falhas.
- [ ] Decidir quando a importação deve migrar para job assíncrono.
- [ ] Correlacionar logs de browser, Vercel e Supabase.

### Sprint 7 · Organização do repositório

**Objetivo:** manter ferramentas, documentação e contratos alinhados.

- [x] Atualizar `.env.example`.
- [x] Adicionar scripts `typecheck` e `check`.
- [ ] Escolher npm ou pnpm como gerenciador oficial.
- [ ] Decidir o destino de `test-jspdf.js`.
- [ ] Decidir se `CLAUDE.md` permanece.
- [ ] Adicionar scripts de teste e formatação.
- [ ] Revisar constantes e contratos legados de parcelamentos.

---

<a id="checklist-pr"></a>

## ✅ Checklist rápido para PRs

### Qualidade

- [ ] `npm run lint` passa.
- [ ] `npm run typecheck` passa.
- [ ] `npm run build` passa.
- [ ] Não foram adicionados `any`, imports mortos ou desativações genéricas de lint.

### Experiência

- [ ] O fluxo alterado foi testado em desktop e mobile.
- [ ] Botões apenas com ícone possuem `aria-label` e tooltip quando necessário.
- [ ] Formulários possuem labels associadas e erros compreensíveis.
- [ ] Estados de carregamento, vazio, sucesso e erro foram considerados.
- [ ] Textos seguem o padrão PT-BR do produto.

### Dados e segurança

- [ ] Mutações financeiras possuem validação e feedback de erro.
- [ ] Queries e invalidações usam chaves previsíveis.
- [ ] Dados externos ou gerados por IA são validados antes de persistir.
- [ ] Nenhum segredo usa o prefixo `NEXT_PUBLIC_`.
- [ ] Consultas e mutações respeitam `user_id` e RLS.
- [ ] Arquivos persistentes usam Storage, não o filesystem temporário.

### Deploy e documentação

- [ ] O Preview da Vercel foi testado quando houve alteração em auth, API, env, upload ou runtime.
- [ ] Migrations necessárias foram aplicadas no ambiente correto.
- [ ] `.env.example`, documentação e schema foram atualizados quando o contrato mudou.
- [ ] A interface não apresenta ações sem implementação.

---

## 📝 Como manter este roadmap

1. Marque tarefas concluídas com `[x]`, sem apagar o contexto técnico.
2. Atualize o status do título entre `✅`, `🚧` e `📌`.
3. Registre a data apenas quando a entrega estiver validada.
4. Mova detalhes históricos para “Resultado” ou “Já entregue”.
5. Revise referências de arquivos sempre que a estrutura do projeto mudar.
6. Atualize o painel de progresso no topo ao alterar o status de um item.
