# Checklist de backend e producao

Este checklist substitui o antigo guia de instalacao inicial. O app ja possui integracao com Supabase, Gemini e Vercel; os itens abaixo servem para auditar o ambiente real.

## 1. Supabase Auth

- [ ] Google provider esta habilitado.
- [ ] Site URL aponta para o dominio correto.
- [ ] Redirect URL local inclui `http://localhost:3000/auth/callback`.
- [ ] Redirect URL de producao inclui `https://<dominio>/auth/callback`.
- [ ] Preview URLs usadas pela equipe estao autorizadas ou usam estrategia de dominio estavel.
- [ ] Login autorizado funciona.
- [ ] Login nao autorizado encerra a sessao.
- [ ] Refresh mantem/restaura a sessao.

## 2. Tabelas exigidas

- [ ] `faturas` existe com os campos documentados em `API_INTEGRATION.md`.
- [ ] `gastos` possui `fatura_id`.
- [ ] `gastos` possui `divisoes` em formato JSON/JSONB.
- [ ] `responsaveis` existe.
- [ ] `authorized_users` existe e contem os emails permitidos.
- [ ] A unicidade de responsavel e por `(user_id, nome)`, nao global.
- [ ] `data_importacao` aceita o timestamp ISO enviado pelo route handler.

## 3. Decisao sobre parcelamentos

- [ ] Confirmar se a tabela `parcelamentos` existe.
- [ ] Confirmar se ela possui `fatura_id`.
- [ ] Decidir se sera removida ou utilizada como entidade real.
- [ ] Se removida, retirar `TABLES.PARCELAMENTOS` e o delete relacionado.
- [ ] Se mantida, implementar leitura/escrita consistente.

Hoje a tela deriva parcelamentos de `gastos.parcela`.

## 4. RLS e seguranca

- [ ] RLS esta habilitada em `faturas`.
- [ ] RLS esta habilitada em `gastos`.
- [ ] RLS esta habilitada em `responsaveis`.
- [ ] Politicas SELECT limitam por `auth.uid() = user_id`.
- [ ] Politicas INSERT validam `user_id`.
- [ ] Politicas UPDATE usam `USING` e `WITH CHECK`.
- [ ] Politicas DELETE limitam por usuario.
- [ ] `authorized_users` nao permite enumerar todos os emails.
- [ ] Teste com usuario A nao consegue ler/alterar dados do usuario B.
- [ ] Nenhuma service role key esta exposta no browser.

## 5. Gemini

- [ ] `GEMINI_API_KEY` esta configurada localmente.
- [ ] `GEMINI_API_KEY` esta configurada na Vercel Production.
- [ ] Preview usa chave/ambiente apropriado.
- [ ] A chave nao possui prefixo `NEXT_PUBLIC_`.
- [ ] Cotas e billing foram verificados.
- [ ] Erros 429 e 503 sao testados.
- [ ] Resposta da IA e validada antes de salvar.
- [ ] Prompt/modelo configurado em `app/api/process-fatura/route.ts` foi confirmado como disponivel para a conta.

## 6. Importacao de PDFs

- [ ] Apenas PDF e aceito.
- [ ] Existe limite de tamanho no cliente e no servidor.
- [ ] Arquivos duplicados sao detectados por hash ou regra equivalente.
- [ ] Falha ao inserir gastos nao deixa fatura orfa.
- [ ] Usuario recebe progresso por arquivo.
- [ ] Timeout da IA gera mensagem compreensivel.
- [ ] Logs registram request, usuario, duracao e etapa da falha.
- [ ] Foi decidido se PDF original precisa ser armazenado.

## 7. Storage

Status atual: nao implementado no codigo.

Se storage for necessario:

- [ ] Provedor escolhido: Supabase Storage, Vercel Blob ou outro.
- [ ] Bucket/container e privado.
- [ ] Caminho inclui `user_id`.
- [ ] Policies impedem acesso cruzado.
- [ ] Download usa URL assinada.
- [ ] Exclusao da fatura remove/agenda exclusao do arquivo.
- [ ] `arquivo_url`/path e salvo na fatura.

## 8. Integridade de dados

- [ ] `faturas` e `gastos` sao inseridos atomicamente por RPC/transacao, ou ha compensacao.
- [ ] Exclusao de fatura usa cascade ou operacao transacional.
- [ ] Erros de deletes relacionados sao checados.
- [ ] Valores monetarios usam precisao adequada.
- [ ] Soma de `divisoes` e igual ao valor original.
- [ ] Responsaveis repetidos em uma divisao sao rejeitados.

## 9. Vercel

- [ ] Projeto esta conectado ao repositorio correto.
- [ ] Production Branch esta correta.
- [ ] Env vars foram definidas em Development/Preview/Production conforme necessidade.
- [ ] Build de producao passa.
- [ ] Preview Deploy foi testado.
- [ ] Logs de `/api/process-fatura` estao acessiveis.
- [ ] Limites de timeout, memoria e request body foram revisados para o plano atual.
- [ ] Dominio customizado e HTTPS funcionam.
- [ ] Callback OAuth funciona no dominio final.
- [x] Rewrite global legado de `vercel.json` removido; rotas e assets ficam sob controle do Next.js.

## 10. Qualidade

- [ ] `npx tsc --noEmit` passa.
- [ ] `npm run lint` passa.
- [ ] `npm run build` passa.
- [ ] Nao ha erros relevantes no console.
- [ ] Dashboard, faturas, gastos, parcelamentos, relatorios e configuracoes foram testados.
- [ ] Mobile e desktop foram testados.
- [ ] Tema claro e escuro foram testados.

Estado observado em 2026-06-11:

- [x] TypeScript passa.
- [ ] Lint passa.
- [ ] Suite automatizada de testes existe.

## 11. Smoke test de producao

1. Abrir dominio Vercel.
2. Fazer login com usuario autorizado.
3. Selecionar uma fatura.
4. Abrir todas as paginas.
5. Importar um PDF controlado.
6. Editar um gasto.
7. Dividir e desfazer divisao.
8. Exportar relatorio PDF.
9. Fazer logout.
10. Verificar logs Vercel/Supabase.

## Documentos relacionados

- `API_INTEGRATION.md`: contratos e schema esperado.
- `ARCHITECTURE.md`: fluxo atual.
- `FUTURAS_MELHORIAS.md`: pendencias priorizadas.

## Sugestao de manutencao

Este arquivo continua util como checklist operacional. Evite transforma-lo novamente em tutorial generico de criacao do Supabase; esse conteudo fica melhor em documentacao oficial do provedor.
