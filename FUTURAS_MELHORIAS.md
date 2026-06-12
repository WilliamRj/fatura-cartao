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

### Progresso dos 25 itens

| Status | Quantidade | Significado |
|---|---:|---|
| ✅ Concluído | 14 | Implementado e validado no código |
| 🚧 Parcial | 3 | Parte relevante entregue; ainda há pendências |
| 📌 Planejado | 8 | Priorizado para ciclos futuros |

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

**Status:** endurecimento concluído no repositório; aplicação e validação em produção pendentes

O app usa `NEXT_PUBLIC_SUPABASE_ANON_KEY`, cliente Supabase no browser e RLS presumida. Isso e comum, mas exige politicas bem testadas.

**Contexto**

- `lib/supabase/client.ts` usa variaveis publicas.
- Hooks acessam tabelas diretamente do cliente em `lib/hooks/*`.
- `app/api/process-fatura/route.ts` cria cliente Supabase com o token do usuario, o que depende de RLS correta.
- `components/auth-provider.tsx` consulta `authorized_users` para permitir acesso.

**Checklist de segurança**

- [x] Documentar as políticas RLS esperadas por tabela.
- [x] Criar teste SQL transacional com duas contas.
- [x] Impedir mensagens cruas do Supabase na interface.
- [x] Restringir privilégios de `anon` e `authenticated`.
- [x] Ativar `FORCE ROW LEVEL SECURITY`.
- [x] Garantir no schema que gasto e fatura possuem o mesmo dono.
- [x] Restringir RPCs ao papel `authenticated`.
- [x] Recriar policies do bucket privado de faturas.
- [ ] Aplicar a migration no Supabase de Preview/Production.
- [ ] Executar o teste SQL no ambiente real.

**✅ Implementado no código em 11 de junho de 2026**

- Queries e mutacoes de faturas, gastos, parcelamentos derivados e responsaveis filtram explicitamente por `user_id`.
- Query keys incluem o ID do usuario.
- Cache do React Query e limpo em logout e troca de sessao.
- Migration RLS criada em `supabase/migrations/20260611_user_data_isolation.sql`.
- Migration de endurecimento criada em `supabase/migrations/20260612_supabase_security_hardening.sql`.
- Teste de isolamento criado em `supabase/tests/user_data_isolation.sql`.
- Tabelas usam RLS forçada e privilégios mínimos por papel.
- A chave estrangeira composta impede vínculos entre gastos e faturas de donos diferentes.
- Erros de dados apresentados pela UI usam mensagens públicas sem detalhes internos.

**🔒 Pendente no ambiente**

- Executar e validar a migration no projeto Supabase de producao.
- Executar `supabase/tests/user_data_isolation.sql` com pelo menos duas contas existentes.

### ✅ 8. Unificar modelo de dados e nomes

**Concluído em:** 12 de junho de 2026

**Decisão de arquitetura**

- `lib/domain/models.ts` contém os modelos camelCase usados pela aplicação.
- `lib/api/types.ts` contém somente linhas e payloads snake_case do Supabase.
- `lib/api/mappers.ts` é a fronteira única entre banco e domínio.
- `lib/data.ts` ficou responsável apenas por catálogo e formatação.
- Parcelamentos são oficialmente uma visão derivada de `gastos.parcela`.

**Resultado**

- Interfaces duplicadas `Api*` foram substituídas por DTOs com sufixo `Row`.
- Hooks deixaram de montar objetos manualmente e usam mappers compartilhados.
- Lista, detalhe, criação e atualização de gastos retornam o mesmo formato.
- `quantidadeLançamentos` foi normalizado para `quantidadeLancamentos`.
- `DivisaoGasto` passou a ser compartilhado por gasto, DTO e parcelamento.
- Contratos não utilizados de tabela/detalhe de parcelamentos foram removidos.
- `lib/mock-data.ts` e os mocks antigos de `lib/data.ts` foram removidos.

**Manutenção**

- Snake_case deve permanecer restrito a `lib/api` e chamadas Supabase.
- Componentes e regras de negócio devem importar modelos de `lib/domain`.
- Testes unitários dos mappers entram junto ao item 20, quando a suíte for criada.

### ✅ 9. Melhorar cache e invalidações do React Query

**Concluído em:** 12 de junho de 2026

**Implementação**

- `lib/api/queryKeys.ts` centraliza factories hierárquicas para faturas, gastos, detalhes, parcelamentos e responsáveis.
- Todas as chaves remotas incluem o ID do usuário antes do escopo específico.
- Listas de gastos e parcelamentos distinguem o conjunto completo da lista de uma fatura.
- Arrays literais e o objeto legado `QUERY_KEYS` foram removidos.
- Chaves sem query real, como dashboard e relatórios, também foram removidas.

**Invalidações**

- Criação e atualização de gasto invalidam apenas as listas agregadas e da fatura afetada.
- Alterações em gastos também invalidam parcelamentos, pois eles são derivados de `gastos.parcela`, responsável e divisões.
- Atualizações sincronizam o cache de detalhe com `setQueryData`.
- Exclusão de fatura remove imediatamente os caches específicos da fatura e somente os detalhes de gastos vinculados a ela.
- Importação invalida a lista de faturas e apenas as coleções agregadas do usuário autenticado, preservando caches de meses antigos.
- Mutações de responsáveis invalidam apenas a lista daquele usuário.

**Estatísticas**

- `useEstatisticas` deixou de criar uma query com o array inteiro de gastos na chave.
- Categorias e responsáveis são calculados com `useMemo` a partir da lista de gastos já mantida pelo React Query.
- Dashboard e relatórios passam a refletir o mesmo cache-base, sem uma segunda camada de estado remoto.

**Manutenção**

- Novos hooks devem usar exclusivamente as factories de `queryKeys`.
- Projeções síncronas de dados já carregados devem preferir `useMemo`.
- Invalidações globais só devem ser usadas quando a mutação não permitir identificar a fatura afetada.

### ✅ 10. Tratar importação de múltiplos PDFs como job observável

**Concluído em:** 12 de junho de 2026

**Execução do lote**

- O lote continua sequencial para limitar memória, chamadas ao Gemini e concorrência na Vercel.
- Cada arquivo percorre os estados aguardando, validando, verificando, enviando, processando e concluído.
- A interface mostra progresso geral, progresso individual, duração e resultado consolidado.
- Falhas podem ser reprocessadas individualmente sem repetir arquivos concluídos.
- A saída acidental da página é protegida enquanto o lote está em execução.

**Validação e duplicidade**

- `lib/files/pdf.ts` valida tamanho, MIME declarado e assinatura `%PDF-` antes do upload.
- O navegador calcula SHA-256 e detecta arquivos repetidos no mesmo lote.
- O hash é consultado no Supabase antes do upload e do processamento por IA.
- O servidor recalcula o hash e compara com o valor declarado pelo navegador.
- O índice único `(user_id, arquivo_hash)` permanece como proteção final contra concorrência.

**Observabilidade**

- Cada requisição usa um `requestId` exibido na interface e registrado nos logs.
- A API retorna `requestId`, estágio final e duração em respostas de sucesso e erro.
- Falhas mostram a etapa server-side que interrompeu a importação.
- PDFs temporários são removidos quando validação, IA ou persistência falham.

**Decisão sobre fila assíncrona**

- A tabela `import_jobs` persiste fila, progresso, erro, duração e vínculo com a fatura.
- `/api/import-jobs` responde com `202` após registrar o job e usa `after()` do Next.js, apoiado por `waitUntil` na Vercel, para continuar depois da resposta.
- A tela consulta os jobs por RLS e retoma o acompanhamento após navegação, troca de aba ou reabertura.
- O upload inicial ainda precisa terminar antes de fechar a janela; depois da confirmação de enfileiramento, o processamento pertence ao servidor.
- Um worker independente continua sendo a evolução recomendada quando o volume ou a duração ultrapassarem os limites de uma única função Vercel.

**Validações financeiras mantidas**

- A saída do Gemini usa JSON e passa pelo schema Zod.
- Créditos, estornos e ajustes negativos são preservados.
- A soma dos lançamentos é comparada ao total da fatura em centavos antes da persistência.

---

<a id="prioridade-2"></a>

## ✨ Prioridade 2 · UI, UX e produto

> Melhorias para tornar o uso recorrente mais simples, claro e agradável.

### ✅ 11. Reorganizar o header mobile

**Concluído em:** 12 de junho de 2026

**Implementação**

- O header mobile exibe somente o botão do menu e a fatura atual.
- O seletor deixou de usar larguras fixas e ocupa o espaço disponível com `min-width: 0` e truncamento seguro.
- Estados sem fatura e carregamento possuem apresentação compacta e estável.
- O logo completo, a navegação e o seletor contextual ficam dentro do sheet.
- Tema e logout foram movidos para o rodapé do menu com ícone e rótulo.

**Responsividade e acessibilidade**

- O sheet respeita a largura da viewport e mantém margem lateral em telas estreitas.
- A seleção de fatura dentro do menu fecha o sheet e devolve o foco ao conteúdo.
- O menu possui título e descrição acessíveis.
- Botões de menu, tema, logout e seleção mantêm nomes acessíveis.
- Meses longos são truncados sem empurrar ou sobrepor o botão do menu.

**Resultado**

- O topo permanece legível com zoom e em celulares estreitos.
- A ação principal do contexto financeiro, trocar a fatura, continua disponível em um toque.
- Ações menos frequentes deixaram de competir por espaço no header.

### ✅ 12. Tornar filtros, labels e formulários mais acessíveis

**Concluído em:** 12 de junho de 2026

**Filtros e seleção de arquivos**

- A busca e os filtros de gastos possuem labels visíveis ligadas aos controles por `htmlFor` e `id`.
- Os filtros foram agrupados em `fieldset` com legenda acessível.
- O filtro de responsável dos parcelamentos possui label para leitores de tela.
- O seletor de PDFs anuncia sua finalidade e mantém uma descrição estável durante o arraste.

**Formulários**

- O cadastro de responsável usa um formulário real, pode ser enviado pelo teclado e exibe estado de processamento.
- O campo possui nome, descrição auxiliar e erro específico associados por `aria-describedby`.
- Nome vazio, duplicado e falha de persistência são apresentados junto ao campo com `role="alert"`.
- Os campos do modal de gasto possuem identificadores e labels explícitas, visíveis ou `sr-only` conforme o espaço.

**Validação da divisão**

- Cada valor e responsável da divisão possui mensagem de erro própria.
- Campos inválidos informam `aria-invalid` e apontam para seus erros por `aria-describedby`.
- O resumo de soma e valor restante é atualizado em uma região `aria-live`.
- O modal usa submissão de formulário, preservando o envio por teclado e diferenciando ações secundárias.

### ✅ 13. Melhorar o modal de edição e divisão de gastos

**Concluído em:** 12 de junho de 2026

**Layout e responsividade**

- O modal possui largura própria de até `sm:max-w-2xl`, sem alterar o tamanho padrão dos demais dialogs.
- A altura respeita a viewport e o conteúdo central possui rolagem independente.
- Estabelecimento e valor ficam visíveis no início do fluxo.
- Cada divisão usa grid responsivo, com labels visíveis, valor, responsável e ação de remoção.
- Cabeçalho, conteúdo e rodapé permanecem organizados em celulares e desktop.

**Resumo e automação**

- O resumo apresenta valor original, distribuído e restante em áreas estáveis.
- A diferença muda de estado visual quando a soma ainda não fecha.
- `Sugerir 50/50` divide entre o responsável principal e outra pessoa disponível.
- `Igualar valores` redistribui o total entre todas as linhas atuais.
- Os cálculos são feitos em centavos e atribuem eventual resto sem gerar diferença artificial.

**Segurança do fluxo**

- A persistência continua bloqueada quando soma, valores ou responsáveis são inválidos.
- Responsáveis duplicados continuam impedidos pela validação por linha.
- É possível iniciar uma divisão e voltar ao modo simples sem fechar o modal.
- Divisões existentes continuam podendo ser desfeitas pela ação dedicada.

### ✅ 14. Implementar paginação na lista de gastos

**Concluído em:** 12 de junho de 2026

**Implementação**

- A lista usa paginação client-side depois dos filtros e da ordenação.
- O padrão exibe 20 gastos por página.
- O usuário pode escolher 10, 20, 50 ou `Todos`.
- O rodapé informa o intervalo visível, o total filtrado e a página atual.
- Botões anterior e próximo possuem nomes acessíveis e estados desabilitados.
- Alterar busca, filtros, ordenação ou tamanho da página retorna à primeira página.
- Linhas de divisão permanecem junto ao gasto principal e não contam como itens separados.

**Evolução futura**

- Migrar para paginação server-side com `range()` quando uma única fatura atingir volume que justifique novas consultas.

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

### ✅ 20. Implementar solicitações e administração de acesso

**Concluído em:** 12 de junho de 2026

**Fluxo do usuário**

- O primeiro login Google registra automaticamente uma solicitação pendente.
- Estados pendente, recusado, suspenso e retirado possuem telas próprias.
- Usuários recusados ou que retiraram o pedido podem solicitar nova análise.
- O motivo de recusa ou suspensão é apresentado ao usuário.
- Apenas contas com estado `approved` recebem acesso às áreas internas.

**Painel Master**

- O card administrativo aparece somente para usuários presentes em `system_admins`.
- Solicitações são organizadas em pendentes, aprovadas, encerradas e suspensas.
- O Master pode aprovar, recusar, suspender e reativar contas.
- Busca, contadores, perfil Google, último pedido e quantidade de reenvios auxiliam a análise.
- Cada usuário possui histórico de decisões e motivos.

**Segurança e operação**

- Masters são definidos exclusivamente por `supabase/scripts/set_system_master.sql`.
- RPCs administrativas validam o Master no PostgreSQL; a UI não é a barreira de segurança.
- RLS impede enumeração e escrita direta nas tabelas administrativas.
- Usuários da allowlist legada são migrados como aprovados quando já existem em `auth.users`.
- `authorized_users` permanece temporariamente como compatibilidade.

**Responsável titular**

- Cada conta aprovada recebe automaticamente um responsável titular no login.
- O nome inicial usa o perfil Google e pode ser alterado em Configurações.
- Apenas esse responsável pode ser Principal; o papel não pode ser transferido ou removido.
- Nomes repetidos são bloqueados sem diferenciar maiúsculas e minúsculas.
- A renomeação atualiza atomicamente gastos e divisões históricas.
- A migration `20260612_zzz_owner_responsible.sql` protege essas regras no banco.

**Evolução futura do modelo**

- Substituir nomes desnormalizados em `gastos` e `divisoes` por IDs de responsáveis.
- Arquivar responsáveis secundários em vez de excluí-los quando já possuírem histórico.
- Preservar o nome exibido no momento do lançamento como informação de auditoria.

**Evoluções futuras sugeridas**

- Enviar email quando uma solicitação for aprovada, recusada ou suspensa.
- Adicionar paginação server-side quando a lista crescer.
- Permitir observação interna do Master, separada do motivo exibido ao usuário.
- Definir política de recuperação com pelo menos dois Masters ativos.
- Adicionar expiração opcional para acessos temporários.
- Criar exportação do histórico administrativo para auditoria.

---

<a id="prioridade-3"></a>

## 🧪 Prioridade 3 · Qualidade contínua

> Investimentos que aumentam confiança em cada alteração e reduzem regressões.

### 📌 21. Adicionar testes unitários para regras financeiras

Areas de maior retorno:

- `formatCurrency`, `formatDate` e `formatDateTime` em `lib/data.ts`.
- Validacao de parcelas `X/Y`.
- Soma de divisoes com tolerancia de centavos em `components/pages/gastos-client.tsx`.
- Calculo de estatisticas por categoria/responsavel em `lib/hooks/useGastos.ts:132-154`.
- Calculo de parcelamentos restantes em `components/pages/parcelamentos-client.tsx`.

### 📌 22. Adicionar testes de integração para fluxos críticos

Fluxos sugeridos:

- Login aprovado, pendente, recusado e suspenso.
- Aprovação, recusa, nova solicitação e reativação pelo Master.
- Importar fatura com sucesso.
- Importar fatura com resposta invalida da IA.
- Editar categoria/responsavel de gasto.
- Dividir gasto e desfazer divisao.
- Excluir fatura e invalidar dashboard.
- Exportar PDF por todos e por responsavel.
- Smoke test no deploy da Vercel para login, carregamento inicial e importacao controlada.

### 📌 23. Preparar observabilidade e auditoria

**Próximas ações**

- Registrar eventos de importacao: usuario, arquivo, hash, duracao, status e erro resumido.
- Evitar `console.error` cru em producao; centralizar logger.
- Adicionar `requestId` em route handlers para depuracao.
- Separar erros esperados de falhas inesperadas, conforme guia local de error handling do Next.
- Correlacionar logs do browser, Vercel Functions e Supabase para depurar problemas que so aparecem no dominio publicado.
- Criar mensagens especificas para falhas comuns em producao: timeout da IA, limite de payload, variavel ausente, sessao expirada e erro de RLS.

### 🚧 24. Revisar dependências e scripts

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

### 📌 25. Manter documentação e configuração sincronizadas

**Auditoria realizada em 11 de junho de 2026**

- `README.md`, `ARCHITECTURE.md`, `API_INTEGRATION.md`, `BACKEND_INTEGRATION_CHECKLIST.md` e `DEVELOPMENT.md` foram atualizados para o codigo atual.
- `AGENTS.md` permanece necessario por conter a regra especial do Next.js 16.
- `CLAUDE.md` foi reduzido a um guia de compatibilidade e pode ser removido se Claude nao for usado.
- `FUTURAS_MELHORIAS.md` permanece como backlog e nao deve ser usado como descricao do estado implementado.

**Situação atual**

- `.env.example` já lista apenas as variáveis utilizadas, incluindo `GEMINI_API_KEY`.
- O rewrite global legado de `vercel.json` foi removido em 2026-06-11 para evitar conflito com App Router, chunks e APIs.
- Contratos não utilizados de Storage e da tabela `parcelamentos` foram removidos de `lib/api/endpoints.ts`.
- A aplicação mantém apenas a query key da visão derivada de parcelamentos.

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

- [x] Reorganizar o header mobile.
- [x] Tornar filtros, labels e formulários mais acessíveis.
- [x] Concluir a reorganização visual do modal de edição e divisão.
- [x] Implementar paginação e contagem na tela de gastos.
- [ ] Adicionar CTAs úteis aos estados vazios.
- [x] Substituir confirmações nativas por dialogs do design system.
- [x] Filtrar parcelamentos por responsável, respeitando divisões.
- [x] Exibir valor original e valor dividido nos cards de parcelamento.

**Critério de conclusão:** importar, revisar, dividir e localizar gastos confortavelmente em desktop e mobile.

### Sprint 3 · Arquitetura e segurança

**Objetivo:** reduzir divergências de dados e comprovar o isolamento entre contas.

- [x] Separar Server e Client Components.
- [x] Centralizar DTOs e mappers.
- [x] Centralizar query keys.
- [ ] Documentar as políticas RLS por tabela.
- [ ] Executar as migrations pendentes no Supabase de produção.
- [ ] Testar isolamento completo com duas contas autorizadas.
- [x] Definir parcelamentos como visão derivada de gastos.
- [x] Implementar solicitações de acesso e painel Master protegido por RPC.
- [ ] Aplicar a migration de controle de acesso e definir o primeiro Master em produção.

**Critério de conclusão:** duas contas não conseguem consultar, alterar ou excluir dados uma da outra, inclusive por chamadas diretas ao Supabase.

### Sprint 4 · Testes e confiança

**Objetivo:** proteger regras financeiras e fluxos críticos contra regressões.

- [ ] Escolher o framework de testes.
- [ ] Testar parcelas, moedas, datas, divisões e estatísticas.
- [ ] Testar login aprovado, pendente, recusado e suspenso.
- [ ] Testar decisões administrativas e auditoria de acesso.
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
- [x] Persistir jobs e continuar o processamento após navegação ou fechamento.
- [ ] Migrar de `after()` para worker independente quando o volume exigir.
- [ ] Correlacionar logs de browser, Vercel e Supabase.

### Sprint 7 · Organização do repositório

**Objetivo:** manter ferramentas, documentação e contratos alinhados.

- [x] Atualizar `.env.example`.
- [x] Adicionar scripts `typecheck` e `check`.
- [ ] Escolher npm ou pnpm como gerenciador oficial.
- [ ] Decidir o destino de `test-jspdf.js`.
- [ ] Decidir se `CLAUDE.md` permanece.
- [ ] Adicionar scripts de teste e formatação.
- [x] Revisar constantes e contratos legados de parcelamentos.
- [ ] Auditar e remover a tabela física legada `parcelamentos`, se ela existir no Supabase.

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
