# Deploy e validacao na Vercel

## Variaveis obrigatorias

Configure em **Settings > Environment Variables**:

| Variavel | Development | Preview | Production |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | obrigatoria | obrigatoria | obrigatoria |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | obrigatoria | obrigatoria | obrigatoria |
| `GEMINI_API_KEY` | obrigatoria | obrigatoria | obrigatoria |

Preview e Production devem apontar para ambientes Supabase deliberadamente
escolhidos. O recomendado e usar projetos separados. Se compartilharem o mesmo
projeto, confirme RLS, usuarios autorizados, migrations e bucket antes do
primeiro teste.

As variaveis `NEXT_PUBLIC_*` sao incorporadas ao bundle durante o build. Depois
de alterar qualquer uma delas, gere um novo deploy.

## Validacao automatizada

Antes de enviar:

```bash
npm run check
```

No deploy:

```text
GET https://<dominio>/api/health
```

Resultado esperado: HTTP 200, `status: "ok"` e
`checks.environment.status: "ok"`. O endpoint mostra ambiente, regiao e SHA
curto do deploy, mas nunca retorna chaves.

A inicializacao do servidor valida as mesmas variaveis. Configuracao ausente ou
invalida produz erro explicito nos logs da Function e faz o healthcheck
responder HTTP 503. Rotas que dependem dessas credenciais continuam bloqueadas.

## Funcao de importacao

- Rota: `/api/process-fatura`
- Runtime: Node.js
- Duracao maxima declarada: 300 segundos
- Timeout da chamada Gemini: 240 segundos
- PDF maximo: 20 MB, enviado diretamente ao Supabase Storage
- Payload da Function: apenas JSON com caminho e metadados do PDF
- Arquivo original: bucket privado `faturas` no Supabase
- Duplicidade: SHA-256 por usuario
- Logs: JSON com `requestId`, `userId`, `stage`, `status` e `durationMs`
- Correlacao: o header de resposta `X-Request-Id` corresponde ao log

O limite de 300 segundos atende o teto atual do plano Hobby com Fluid Compute.
Nos planos Pro e Enterprise, a plataforma permite configuracao superior, mas a
aplicacao mantém 300 segundos para evitar requisicoes indefinidas.

## Smoke test por ambiente

1. Confirmar que `/api/health` responde HTTP 200.
2. Fazer login no dominio do deploy.
3. Importar um PDF controlado menor que 20 MB.
4. Abrir o PDF salvo pelo botao de visualizacao.
5. Tentar importar o mesmo PDF e confirmar bloqueio por duplicidade.
6. Editar um gasto e recarregar a pagina.
7. Excluir a fatura e confirmar remocao dos dados relacionados.
8. Fazer logout e testar outro usuario sem acesso cruzado.
9. Localizar a requisicao nos logs pelo `X-Request-Id`.
10. Confirmar callback OAuth, HTTPS e dominio final.

Os passos dependentes do painel, plano e dominio da Vercel precisam ser
executados em Preview e novamente em Production.
