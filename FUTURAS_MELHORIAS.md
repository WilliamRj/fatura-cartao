# Futuras melhorias do projeto

Documento criado em 2026-06-11 a partir de uma revisao estatica do codigo, com foco em desenvolvimento de software, arquitetura, qualidade, seguranca, UX e UI.

## Resumo executivo

O projeto ja tem uma base funcional clara: Next.js App Router, Supabase, React Query, componentes reutilizaveis, tema claro/escuro, upload de PDF, processamento por IA e dashboards financeiros. Como o app esta publicado na Vercel para acesso remoto, algumas melhorias ganham peso em producao: limites de serverless functions, variaveis de ambiente, logs, storage de PDFs, seguranca Supabase/RLS e performance em redes variadas. O maior ganho para proximas atualizacoes esta em estabilizar qualidade automatizada, melhorar acessibilidade, reduzir acoplamento client-side, endurecer o processamento de faturas e transformar alguns fluxos em experiencias mais completas.

Verificacoes executadas:

- `npm run lint`: passou sem erros ou warnings em 2026-06-11.
- `npx tsc --noEmit`: passou sem erros.
- Guias locais consultados por causa do `AGENTS.md`: `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`, `15-route-handlers.md` e `10-error-handling.md`.

Contexto de deploy:

- O app roda na Vercel, entao rotas em `app/api/*` devem ser avaliadas como funcoes serverless/edge conforme a configuracao de runtime.
- Variaveis como `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` precisam estar configuradas por ambiente: Development, Preview e Production.
- Uploads enviados para funcoes da Vercel nao sao armazenamento persistente; PDFs originais devem ir para Supabase Storage, Vercel Blob ou outro storage.

## Prioridade 0: corrigir antes de evoluir

### 1. Fazer o lint passar - concluido em 2026-06-11

Resultado:

- `npm run lint` passa sem erros ou warnings.
- `npx tsc --noEmit` continua passando sem erros.

Correcoes realizadas:

- Tratamento de erros alterado de `any` para `unknown` em configuracoes e importacao de faturas.
- Imports, constantes e estados sem uso removidos das telas de faturas e gastos.
- `FaturaProvider` passou a armazenar apenas o ID selecionado e derivar a fatura atual da lista, eliminando o `setState` sincrono dentro de `useEffect`.
- Problemas anteriores da rota de processamento, exportacao PDF e relatorios ja estavam corrigidos.

Manutencao:

- Manter `npm run lint` como verificacao obrigatoria antes de cada deploy.
- Evitar desativar regras de lint para contornar novos erros; corrigir a causa sempre que possivel.

### 2. Validar rigorosamente a resposta da IA antes de salvar - concluido em 2026-06-11

Resultado:

- A resposta do Gemini passa por schema `zod` estrito antes de qualquer escrita.
- Mes de referencia, moeda, datas reais, valores positivos, parcelas, categorias e limites de texto/lista sao validados e normalizados.
- Respostas invalidas retornam HTTP 422 com campos compreensiveis e deixam explicito que nenhum dado foi salvo.
- Fatura e gastos sao inseridos pela RPC transacional `import_fatura_atomically`, impedindo estado parcialmente salvo.
- Migration criada em `supabase/migrations/20260611_atomic_invoice_import.sql`.

Complemento implementado:

- O PDF original passa a ser salvo no bucket privado `faturas`.
- O caminho e vinculado a `faturas.arquivo_url`.
- O SHA-256 e salvo em `faturas.arquivo_hash` e impede importacao duplicada por usuario.

### 3. Revisar delecoes relacionadas - concluido em 2026-06-12

Resultado:

- `gastos.fatura_id` usa `ON DELETE CASCADE`.
- A tabela legada `parcelamentos`, quando existir com `fatura_id`, tambem recebe cascade.
- `useDeleteFatura` executa apenas a RPC `delete_fatura_atomically`, eliminando deletes client-side parciais.
- A RPC valida o usuario com `auth.uid()`, bloqueia a fatura durante a operacao e remove os dados relacionados em uma unica transacao.
- A confirmacao mostra a quantidade real de lancamentos e parcelamentos derivados que serao removidos.
- A RPC retorna o caminho do PDF e as contagens removidas para feedback ao usuario.
- A limpeza do PDF ocorre depois do commit e exibe aviso especifico se o Storage falhar.
- Migration criada em `supabase/migrations/20260612_atomic_invoice_deletion.sql`.

### 4. Corrigir acessibilidade dos controles principais - concluido em 2026-06-12

Resultado:

- Botoes de icone de tema, logout, sidebar, menu mobile, faturas, gastos, arquivos e responsaveis possuem nome acessivel.
- Links de navegacao informam a pagina atual com `aria-current`.
- Controles de expandir/recolher informam `aria-expanded` e o elemento controlado.
- Seletores principais sem label visivel possuem `aria-label`.
- Ordenacao de gastos usa `<button>` dentro do cabecalho e atualiza `aria-sort`.
- Linhas da tabela deixaram de simular botoes; a edicao usa uma acao explicita e acessivel.
- Confirmacoes nativas foram substituidas por dialogs do design system.
- O botao padrao de fechar dialogs anuncia "Fechar" em portugues.

### 5. Validar ambiente de producao na Vercel - implementado no codigo em 2026-06-12

Resultado:

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

Validacao operacional pendente:

- Confirmar no painel o repositorio, Production Branch e variaveis de Preview/Production.
- Confirmar os limites reais do plano atual da Vercel.
- Executar o smoke test no dominio de Preview e no dominio final de Production.

## Prioridade 1: arquitetura e dados

### 6. Reduzir o alcance de Client Components - concluido em 2026-06-12

Resultado:

- Todas as rotas `app/**/page.tsx` sao Server Components.
- Dashboard, faturas, gastos, parcelamentos, relatorios e configuracoes renderizam cabecalho estatico no servidor.
- Hooks, filtros, dialogs, uploads, tabelas editaveis e graficos ficaram em `components/pages/*-client.tsx`.
- Cada rota possui metadata propria sem precisar hidratar esse conteudo.
- O login interativo foi extraido para `components/pages/login-client.tsx`.
- `AuthProvider` deixou de importar uma pagina de rota, removendo a dependencia circular com o App Router.
- Providers recebem as paginas server-side pelo slot `children`, conforme o padrao documentado pelo Next.js 16.

Decisao mantida:

- A carga inicial continua via React Query e Supabase no cliente enquanto autenticacao SSR por cookies e RLS
server-side nao forem projetadas. Migrar apenas as consultas criaria duas fontes de sessao.
- Bundle e metricas reais de rede devem ser acompanhados nos deploys Preview/Production.

### 7. Fortalecer limites de seguranca Supabase

O app usa `NEXT_PUBLIC_SUPABASE_ANON_KEY`, cliente Supabase no browser e RLS presumida. Isso e comum, mas exige politicas bem testadas.

Pontos relevantes:

- `lib/supabase/client.ts` usa variaveis publicas.
- Hooks acessam tabelas diretamente do cliente em `lib/hooks/*`.
- `app/api/process-fatura/route.ts` cria cliente Supabase com o token do usuario, o que depende de RLS correta.
- `components/auth-provider.tsx` consulta `authorized_users` para permitir acesso.

Recomendacoes:

- Documentar no repo as politicas RLS esperadas por tabela.
- Criar testes manuais/SQL para garantir que usuarios nao acessam dados de outros usuarios.
- Evitar mensagens de erro que exponham detalhes internos de tabelas.
- Considerar mover mutacoes sensiveis para route handlers/server actions com validacao centralizada.
- Como o app esta publico na Vercel, tratar RLS como barreira obrigatoria, nao apenas defesa adicional.

Implementado no codigo em 2026-06-11:

- Queries e mutacoes de faturas, gastos, parcelamentos derivados e responsaveis filtram explicitamente por `user_id`.
- Query keys incluem o ID do usuario.
- Cache do React Query e limpo em logout e troca de sessao.
- Migration RLS criada em `supabase/migrations/20260611_user_data_isolation.sql`.

Pendente de ambiente:

- Executar e validar a migration no projeto Supabase de producao.
- Testar isolamento com duas contas autorizadas diferentes.

### 8. Unificar modelo de dados e nomes

Ha tipos em `lib/data.ts`, tipos de API em `lib/api/types.ts` e mapeamentos nos hooks. Isso funciona, mas tende a divergir.

Exemplos:

- `ApiGasto` e `Gasto` duplicam varios campos.
- `ApiFatura.quantidade_lancamentos` vira `Fatura.quantidadeLancamentos`.
- `Parcelamento` e derivado de gastos em `lib/hooks/useParcelamentos.ts`, apesar de existir constante `TABLES.PARCELAMENTOS`.

Recomendacoes:

- Criar uma camada clara de DTOs e mappers em `lib/api/mappers.ts`.
- Definir categorias/responsaveis com tipos literais quando possivel.
- Decidir se `parcelamentos` sera entidade propria ou visao derivada de `gastos`.
- Adicionar fixtures de teste para garantir que mappers continuam corretos.

### 9. Melhorar cache e invalidacoes React Query

Ha mistura de query keys constantes e arrays literais.

Exemplos:

- `QUERY_KEYS.GASTOS` em `lib/api/endpoints.ts`.
- `['gastos', faturaId]` em `lib/hooks/useGastos.ts:8`.
- `['parcelamentos', faturaId]` em `lib/hooks/useParcelamentos.ts:8`.
- `['estatisticas', gastos]` em `lib/hooks/useGastos.ts:126`.

Recomendacoes:

- Centralizar factories de query keys: `gastos.list(faturaId)`, `estatisticas.byFatura(faturaId)`.
- Evitar usar o array inteiro de gastos como parte da query key de estatisticas; calcular com `useMemo` ou query key por `faturaId`.
- Fazer invalidacoes especificas apos mutacoes para reduzir refetch desnecessario.

### 10. Tratar importacao de multiplos PDFs como job observavel - parcialmente implementado em 2026-06-12

`components/pages/faturas-client.tsx` processa arquivos em loop sequencial com estado individual por arquivo.

Na Vercel, esse ponto e ainda mais importante porque o processamento acontece em uma requisicao serverless. Chamadas longas para Gemini, PDFs grandes ou varios arquivos em sequencia podem atingir limites de execucao, memoria ou payload.

Recomendacoes:

- [x] Mostrar progresso por arquivo: aguardando, enviando, processando, salvo, erro.
- [x] Permitir remover/reprocessar arquivo que falhou sem repetir todos.
- Validar tamanho maximo e tipo real do arquivo, nao apenas extensao/dropzone.
- Evitar importacao duplicada por hash, mes ou combinacao de `mes_referencia` + usuario.
- Considerar fila server-side se os PDFs forem grandes ou a IA demorar.
- Considerar arquitetura assincrona: upload do PDF para storage, registro de job no banco, processamento posterior e polling/status na UI.
- [x] Definir timeout e mensagem de erro especifica para limite/indisponibilidade da IA.

Complementos implementados:

- Falhas 422 ficam associadas ao arquivo e informam explicitamente que nenhum dado foi salvo.
- O `requestId` aparece durante o processamento e pode ser correlacionado com os logs da Vercel.
- A saida do Gemini usa modo JSON e mantém Zod como validacao final.
- O schema nativo fica pendente da migracao do SDK legado `@google/generative-ai` para `@google/genai`, exigido pela API atual do Gemini 3.5 para `responseFormat`.
- Valores monetarios brasileiros e internacionais comuns sao normalizados.
- Creditos, estornos e ajustes negativos sao preservados para conciliacao; valores zero e ilegíveis continuam invalidos.
- A soma dos lancamentos e comparada ao total da fatura em centavos antes de qualquer persistencia.

## Prioridade 2: UI, UX e produto

### 11. Reorganizar header mobile

No mobile, `components/app-sidebar.tsx:284-293` coloca seletor de fatura, tema, logout e menu no mesmo bloco. O seletor tem largura fixa em `components/app-sidebar.tsx:285`.

Riscos:

- Quebra em telas estreitas.
- Dificuldade com zoom de acessibilidade.
- Meses longos podem truncar mal.

Recomendacoes:

- Priorizar menu + fatura atual no header.
- Mover tema e logout para o sheet.
- Usar seletor compacto ou abrir selecao de fatura dentro do menu.

### 12. Tornar filtros, labels e forms mais acessiveis

Exemplos:

- Busca de gastos usa placeholder como label visual em `components/pages/gastos-client.tsx`.
- Campo de novo responsavel fica em `components/pages/configuracoes-client.tsx`.
- Labels do modal de gasto em `components/pages/gastos-client.tsx` ainda devem ser auditadas.

Recomendacoes:

- Usar `label` com `htmlFor` e `id`.
- Quando a label nao deve aparecer, usar `sr-only`.
- Adicionar mensagens de erro por campo no modal de divisao.
- Usar `aria-describedby` para textos auxiliares.

### 13. Melhorar modal de edicao/divisao de gastos

O `DialogContent` padrao usa `sm:max-w-sm` em `components/ui/dialog.tsx:56`, estreito para o fluxo de divisao.

Recomendacoes:

- Permitir largura maior por tela, como `sm:max-w-lg` ou `md:max-w-2xl`.
- Exibir resumo: valor original, soma das divisoes, diferenca restante.
- Transformar linhas de divisao em grid responsivo.
- Bloquear salvar enquanto houver diferenca.
- Sugerir divisao automatica 50/50 ou por responsavel principal/outros.

### 14. Implementar paginacao ou remover constante morta

`components/pages/gastos-client.tsx` define `ITEMS_PER_PAGE = 10`, mas a tabela mostra todos os itens.

Recomendacoes:

- Implementar paginacao client-side inicialmente.
- Em escala maior, paginar no Supabase com `range()`.
- Manter contadores: total filtrado, pagina atual e itens por pagina.
- Exibir botoes Proximo/Anterior com estado desabilitado acessivel.

### 15. Finalizar a acao de visualizar fatura - concluido em 2026-06-11

Resultado:

- PDFs novos sao armazenados no bucket privado `faturas`, em caminho isolado por usuario.
- O botao com icone `Eye` gera URL assinada curta e abre o PDF original em nova aba.
- Faturas antigas sem `arquivo_url` exibem o botao desabilitado.
- A exclusao da fatura tenta remover tambem o arquivo do Storage.

Evolucao futura:

- Implementar detalhe da fatura com resumo, gastos, parcelamentos e auditoria da importacao.

### 16. Melhorar estados vazios e acoes contextuais

`EmptyState` aceita `action`, mas varias telas usam apenas texto.

Exemplos:

- Gastos vazios em `components/pages/gastos-client.tsx`.
- Parcelamentos vazios em `components/pages/parcelamentos-client.tsx`.

Recomendacoes:

- Em gastos: CTA para importar fatura ou selecionar outra fatura.
- Em parcelamentos: explicar que depende de lancamentos parcelados e linkar para faturas/gastos.
- Em relatorios: estado vazio quando nao houver dados suficientes para grafico.
- Em configuracoes: CTA para adicionar primeiro responsavel.

### 17. Melhorar graficos para leitura e acessibilidade

Graficos em `components/dashboard-content.tsx` e `components/pages/relatorios-client.tsx` dependem fortemente de cores.

Recomendacoes:

- Adicionar resumo textual abaixo ou ao lado dos graficos.
- Mostrar valores e percentuais na legenda quando fizer sentido.
- Garantir contraste das cores de `--chart-*` em claro e escuro.
- Evitar que categorias diferentes recebam cores inconsistentes entre Dashboard e Relatorios.
- Adicionar estados vazios especificos para grafico sem dados.

### 18. Ajustar feedback visual de cards

`.card-hover` em `app/globals.css:231` eleva cards ao passar o mouse. Isso esta em cards informativos e graficos, podendo sugerir clique.

Recomendacoes:

- Reservar hover com deslocamento para elementos clicaveis.
- Em cards estaticos, usar apenas borda/sombra sutil.
- Padronizar densidade dos cards de metricas para uso financeiro recorrente.

### 19. Revisar copy e consistencia visual

Pontos observados:

- `components/pages/relatorios-client.tsx`: "Por Responsavel" sem acento.
- `app/layout.tsx:13`: "Itau" sem acento.
- `components/pages/login-client.tsx`: revisar continuamente a consistencia visual do login.

Recomendacoes:

- Padronizar portugues: "responsavel", "Itaú", "cartao de credito", "lancamentos", conforme decisao de acentos do projeto.
- Trocar emojis do login por `Loader2` e icone/identidade coerente.
- Criar uma pequena lista de termos oficiais do produto para evitar variacoes.

## Prioridade 3: qualidade continua

### 20. Adicionar testes de unidade para regras financeiras

Areas de maior retorno:

- `formatCurrency`, `formatDate` e `formatDateTime` em `lib/data.ts`.
- Validacao de parcelas `X/Y`.
- Soma de divisoes com tolerancia de centavos em `components/pages/gastos-client.tsx`.
- Calculo de estatisticas por categoria/responsavel em `lib/hooks/useGastos.ts:132-154`.
- Calculo de parcelamentos restantes em `components/pages/parcelamentos-client.tsx`.

### 21. Adicionar testes de integracao para fluxos criticos

Fluxos sugeridos:

- Login autorizado vs nao autorizado.
- Importar fatura com sucesso.
- Importar fatura com resposta invalida da IA.
- Editar categoria/responsavel de gasto.
- Dividir gasto e desfazer divisao.
- Excluir fatura e invalidar dashboard.
- Exportar PDF por todos e por responsavel.
- Smoke test no deploy da Vercel para login, carregamento inicial e importacao controlada.

### 22. Preparar observabilidade e auditoria

Recomendacoes:

- Registrar eventos de importacao: usuario, arquivo, hash, duracao, status e erro resumido.
- Evitar `console.error` cru em producao; centralizar logger.
- Adicionar `requestId` em route handlers para depuracao.
- Separar erros esperados de falhas inesperadas, conforme guia local de error handling do Next.
- Correlacionar logs do browser, Vercel Functions e Supabase para depurar problemas que so aparecem no dominio publicado.
- Criar mensagens especificas para falhas comuns em producao: timeout da IA, limite de payload, variavel ausente, sessao expirada e erro de RLS.

### 23. Revisar dependencias e scripts

Pontos:

- Existem `package-lock.json` e `pnpm-lock.yaml`; escolher um gerenciador oficial para evitar instalacoes divergentes.
- `test-jspdf.js` na raiz parece script temporario; decidir se vira teste, utilitario documentado ou e removido.
- `package.json` nao tem scripts de `typecheck`, `test` ou `format`.

Recomendacoes:

- Padronizar em npm ou pnpm.
- Adicionar scripts:
  - `typecheck`: `tsc --noEmit`
  - `check`: `npm run lint && npm run typecheck`
  - `test`: conforme framework escolhido
- Considerar Prettier ou Biome para formatacao consistente.

### 24. Manter documentacao e configuracao sincronizadas

Auditoria realizada em 2026-06-11:

- `README.md`, `ARCHITECTURE.md`, `API_INTEGRATION.md`, `BACKEND_INTEGRATION_CHECKLIST.md` e `DEVELOPMENT.md` foram atualizados para o codigo atual.
- `AGENTS.md` permanece necessario por conter a regra especial do Next.js 16.
- `CLAUDE.md` foi reduzido a um guia de compatibilidade e pode ser removido se Claude nao for usado.
- `FUTURAS_MELHORIAS.md` permanece como backlog e nao deve ser usado como descricao do estado implementado.

Pendencias fora dos arquivos Markdown:

- `.env.example` ainda lista `SUPABASE_SERVICE_ROLE_KEY`, que nao e usada, e nao lista `GEMINI_API_KEY`, que e obrigatoria.
- O rewrite global legado de `vercel.json` foi removido em 2026-06-11 para evitar conflito com App Router, chunks e APIs.
- `lib/api/endpoints.ts` ainda declara Storage e tabela `parcelamentos`, embora esses contratos nao estejam plenamente implementados.

Recomendacoes:

- Atualizar documentacao no mesmo PR que alterar schema, env vars, rotas ou funcionalidades.
- Nao marcar recursos planejados como concluidos.
- Preferir links entre documentos a copiar grandes blocos repetidos.
- Revisar referencias de arquivo/linha em `FUTURAS_MELHORIAS.md` quando o codigo mudar significativamente.

## Roadmap sugerido

### Sprint 1: estabilidade

- [x] Fazer `npm run lint` passar.
- [x] Tipar e validar resposta da IA com `zod`.
- Validar variaveis de ambiente na Vercel para Production e Preview.
- [x] Corrigir deletes relacionados e estados parciais.
- [x] Adicionar `aria-label` em botoes de icone.
- Implementar ou remover botao de visualizar fatura.

### Sprint 2: experiencia principal

- Melhorar modal de divisao.
- Implementar paginacao/filtros completos em gastos.
- Melhorar header mobile.
- Adicionar estados vazios com CTAs.
- Trocar confirms nativos por dialogos do design system.

### Sprint 3: arquitetura

- Reorganizar Server/Client Components.
- Centralizar mappers e query keys.
- Documentar RLS Supabase.
- Testar RLS considerando acesso remoto pelo dominio da Vercel.
- Criar testes para regras financeiras.
- Definir fluxo robusto de importacao com progresso por arquivo.

### Sprint 4: produto e relatorios

- Tela de detalhe da fatura.
- Historico/auditoria de importacoes com storage persistente do PDF ou hash.
- Relatorios com comparativos, filtros e graficos acessiveis.
- Melhorias de performance e bundle size.

Concluido em 2026-06-11:

- Exportacao PDF refeita com imports tipados de `jsPDF` e `autoTable`.
- Download por Blob, sem depender de navegacao para URL de arquivo.
- Bibliotecas PDF incorporadas diretamente ao bundle client, sem import dinamico no clique.
- Rewrite global da Vercel removido.
- Relatorio completo com resumo por responsavel, divisoes, parcelamentos e gastos.
- Relatorio individual com parte atribuida, percentual e valor original.

### Sprint 5: producao e operacao

- Criar checklist de deploy Vercel: variaveis, ambiente, dominio, auth callback e smoke test.
- Adicionar logs estruturados para funcoes serverless.
- Definir estrategia de storage para PDFs: Supabase Storage, Vercel Blob ou outro provedor.
- Adicionar monitoramento de falhas no processamento de faturas.
- Revisar limites de timeout/payload e decidir se importacao precisa virar job assincrono.

### Sprint 6: limpeza de documentacao e configuracao

- Atualizar `.env.example` para incluir `GEMINI_API_KEY` e remover variaveis sem uso.
- Decidir se `CLAUDE.md` deve permanecer.
- Decidir o destino da tabela/constantes de `parcelamentos`.
- Remover constantes de Storage ate a implementacao ou concluir o upload persistente.

## Checklist rapido para PRs futuros

- `npm run lint` passa.
- `npx tsc --noEmit` passa.
- Deploy Preview da Vercel foi verificado quando a mudanca afeta runtime, env vars, auth, upload ou API.
- Fluxo alterado foi testado manualmente em desktop e mobile.
- Botoes icon-only tem `aria-label`.
- Formularios tem labels associadas.
- Mutacoes financeiras tem validacao e feedback de erro.
- Queries invalidadas usam chaves centralizadas.
- Nenhum dado vindo de IA/API externa e salvo sem validacao.
- Nenhuma variavel secreta foi exposta com prefixo `NEXT_PUBLIC_`.
- Uploads e arquivos que precisam persistir usam storage apropriado, nao filesystem temporario da function.
- A UI nao mostra acoes sem implementacao.
- Textos e termos seguem o padrao do produto.
- Documentacao, `.env.example` e schema foram atualizados quando o contrato mudou.
