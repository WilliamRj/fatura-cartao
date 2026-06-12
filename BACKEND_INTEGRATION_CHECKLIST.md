# ✅ Checklist de backend e produção

> Auditoria prática de Supabase, Gemini e Vercel.

## 📊 Painel de prontidão

| Área | Código | Ambiente |
|---|:---:|:---:|
| Autenticação | ✅ | 🔍 validar |
| RLS e isolamento | ✅ | 🔍 validar |
| Importação de PDF | ✅ | 🔍 smoke test |
| Storage privado | ✅ | 🔍 validar policies |
| Exclusão transacional | ✅ | 🔍 smoke test |
| Vercel | ✅ | 🔍 painel/domínio |
| Testes automatizados | ❌ | ❌ |

### Legenda

- ✅ implementado;
- 🔍 precisa de validação real;
- ❌ ainda não implementado.

> [!IMPORTANT]
> Este arquivo é um checklist operacional. Marque itens somente após conferir o ambiente correspondente.

## 1. 🔐 Supabase Auth

- [ ] Google provider habilitado.
- [ ] Site URL correta.
- [ ] Callback local autorizado.
- [ ] Callback de Preview autorizado.
- [ ] Callback de Production autorizado.
- [ ] Login autorizado funciona.
- [ ] Login não autorizado encerra a sessão.
- [ ] Refresh restaura a sessão.
- [ ] Logout limpa a sessão e o cache.

## 2. 🗃️ Tabelas

- [ ] `faturas` possui os campos documentados.
- [ ] `gastos.fatura_id` existe e usa cascade.
- [ ] `gastos.divisoes` aceita JSONB.
- [ ] `responsaveis` existe.
- [ ] `authorized_users` contém os emails permitidos.
- [ ] Responsável é único por `(user_id, nome)`.
- [ ] `data_importacao` aceita `timestamptz`.
- [ ] `arquivo_url` e `arquivo_hash` existem.

## 3. 💳 Parcelamentos

Estado atual: derivados de `gastos.parcela`.

- [ ] Confirmar se a tabela legada `parcelamentos` existe.
- [ ] Decidir se será removida ou adotada.
- [ ] Se removida, retirar contratos legados.
- [ ] Se mantida, implementar leitura e escrita.
- [x] Tela respeita divisões por responsável.
- [x] Cards mostram valor original e parte dividida.

## 4. 🛡️ RLS e isolamento

- [ ] Revisar `20260611_user_data_isolation.sql`.
- [ ] Confirmar `user_id` dos dados antigos.
- [ ] Executar a migration no ambiente correto.
- [ ] RLS habilitada em `faturas`.
- [ ] RLS habilitada em `gastos`.
- [ ] RLS habilitada em `responsaveis`.
- [ ] SELECT limitado por usuário.
- [ ] INSERT validado por usuário.
- [ ] UPDATE usa `USING` e `WITH CHECK`.
- [ ] DELETE limitado por usuário.
- [ ] `authorized_users` não permite enumeração.
- [ ] Usuário A não lê dados de B.
- [ ] Usuário A não altera dados de B.
- [ ] Usuário A não exclui dados de B.
- [ ] Troca de conta não reaproveita cache.
- [x] Nenhuma service role key exposta no browser.

## 5. 🤖 Gemini

- [ ] Chave configurada localmente.
- [ ] Chave configurada em Preview.
- [ ] Chave configurada em Production.
- [x] Chave não usa `NEXT_PUBLIC_`.
- [ ] Cota e billing verificados.
- [ ] Modelo disponível para a conta.
- [ ] Erro `429` testado.
- [ ] Erro `503` testado.
- [x] Timeout possui mensagem específica.
- [x] Resposta validada com Zod.

## 6. 📄 Importação de PDF

- [x] Tipo real do PDF validado.
- [x] Limite de 20 MB no cliente e servidor.
- [x] Upload direto ao Storage.
- [x] Duplicidade por SHA-256.
- [x] Progresso individual por arquivo.
- [x] Reprocessamento de arquivo com falha.
- [x] Persistência atômica.
- [x] Compensação do upload em falhas.
- [x] Logs com usuário, etapa e duração.
- [ ] Fluxo completo testado no domínio publicado.

## 7. 📦 Storage

Migration: `20260611_invoice_pdf_storage.sql`.

- [x] Supabase Storage escolhido.
- [x] Bucket privado `faturas`.
- [x] Caminho inclui `user_id`.
- [x] URL assinada.
- [x] Caminho salvo na fatura.
- [x] Exclusão tenta remover o PDF.
- [ ] Policies testadas com dois usuários.
- [ ] Arquivos órfãos monitorados.

## 8. 🧮 Integridade de dados

- [x] Importação usa RPC transacional.
- [x] Exclusão usa RPC e cascade.
- [x] Duplicidade protegida por índice.
- [ ] Precisão monetária validada no schema real.
- [ ] Soma de divisões igual ao valor original.
- [ ] Responsáveis repetidos em uma divisão rejeitados.
- [ ] Fixtures financeiras cobertas por testes.

## 9. ▲ Vercel

- [ ] Repositório correto conectado.
- [ ] Production Branch correta.
- [ ] Variáveis em Development.
- [ ] Variáveis em Preview.
- [ ] Variáveis em Production.
- [x] Build local aprovado.
- [ ] Preview Deploy aprovado.
- [ ] Domínio e HTTPS funcionando.
- [ ] OAuth funcionando no domínio final.
- [x] `/api/health` implementado.
- [x] Runtime Node.js configurado.
- [x] `maxDuration` de 300 segundos.
- [x] Timeout Gemini de 240 segundos.
- [x] Payload sem o binário do PDF.
- [x] Logs correlacionáveis por `X-Request-Id`.
- [ ] Limites confirmados no plano atual.

## 10. 🧪 Qualidade

- [x] `npm run lint`.
- [x] `npm run typecheck`.
- [x] `npm run build`.
- [ ] Console sem erros relevantes.
- [ ] Todas as páginas testadas.
- [ ] Mobile e desktop testados.
- [ ] Tema claro e escuro testados.
- [ ] Suíte automatizada existente.

## 11. 🚦 Smoke test

1. [ ] Abrir `/api/health`.
2. [ ] Entrar com usuário autorizado.
3. [ ] Navegar por todas as páginas.
4. [ ] Importar PDF controlado.
5. [ ] Abrir o arquivo salvo.
6. [ ] Confirmar bloqueio de duplicidade.
7. [ ] Editar e dividir gasto.
8. [ ] Conferir parcelamentos por responsável.
9. [ ] Exportar os dois tipos de relatório.
10. [ ] Excluir a fatura.
11. [ ] Trocar de conta.
12. [ ] Confirmar isolamento.
13. [ ] Localizar logs pelo `requestId`.

Procedimento detalhado: [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md).

## 🎯 Aprovação final

### Preview

- [ ] Ambiente aprovado.
- [ ] OAuth aprovado.
- [ ] Importação aprovada.
- [ ] Isolamento aprovado.

### Production

- [ ] Ambiente aprovado.
- [ ] Domínio aprovado.
- [ ] Smoke test aprovado.
- [ ] Logs e responsáveis operacionais definidos.

## 🔗 Documentos relacionados

- [Integração e schema](./API_INTEGRATION.md)
- [Arquitetura](./ARCHITECTURE.md)
- [Deploy Vercel](./VERCEL_DEPLOYMENT.md)
- [Roadmap](./FUTURAS_MELHORIAS.md)
