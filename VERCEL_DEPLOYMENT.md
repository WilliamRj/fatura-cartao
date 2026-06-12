# ▲ Deploy na Vercel

> Configuração, validação e smoke test do Cartão Inteligente.

## 🎯 Resultado esperado

- Build publicado sem erros.
- `/api/health` respondendo HTTP `200`.
- OAuth funcionando no domínio final.
- Importação de PDF abaixo de 20 MB.
- Logs correlacionáveis por `X-Request-Id`.
- Dados isolados entre usuários.

## 🔐 Variáveis obrigatórias

Configure em **Settings → Environment Variables**:

| Variável | Development | Preview | Production |
|---|:---:|:---:|:---:|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅ | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ✅ | ✅ |
| `GEMINI_API_KEY` | ✅ | ✅ | ✅ |

> [!IMPORTANT]
> Alterações em variáveis `NEXT_PUBLIC_*` exigem um novo deploy, pois seus valores entram no bundle durante o build.

O ideal é separar projetos Supabase de Preview e Production. Se ambos compartilharem o mesmo projeto, valide cuidadosamente RLS, migrations, bucket e usuários autorizados.

## 🧪 Validação antes do deploy

```bash
npm run check
```

- [ ] Lint aprovado.
- [ ] TypeScript aprovado.
- [ ] Build aprovado.
- [ ] Migrations revisadas.
- [ ] Variáveis configuradas no ambiente correto.

## ❤️ Healthcheck

```text
GET https://<dominio>/api/health
```

Resposta esperada:

```json
{
  "status": "ok",
  "checks": {
    "environment": {
      "status": "ok"
    }
  }
}
```

O endpoint pode informar ambiente, região e SHA curto, mas nunca retorna as chaves. Configuração ausente produz HTTP `503` e um erro estruturado nos logs.

## 📄 Função de importação

| Configuração | Valor |
|---|---|
| Rota | `/api/process-fatura` |
| Runtime | Node.js |
| Duração máxima | 300 segundos |
| Timeout Gemini | 240 segundos |
| PDF máximo | 20 MB |
| Upload | Direto ao Supabase Storage |
| Persistência | Bucket privado `faturas` |
| Duplicidade | SHA-256 por usuário |
| Logs | JSON estruturado |

O payload da Function contém apenas caminho e metadados do arquivo. Isso evita enviar o PDF pelo limite de payload da Vercel.

## 🔗 OAuth

Configure no Supabase e no Google Cloud:

```text
http://localhost:3000/auth/callback
https://<preview-ou-dominio>/auth/callback
```

- [ ] Site URL aponta para o domínio correto.
- [ ] Preview autorizado quando usado.
- [ ] Production autorizado.
- [ ] Login e logout testados no domínio.

## 🚦 Smoke test

1. Abra `/api/health` e confirme HTTP `200`.
2. Entre com um usuário autorizado.
3. Importe um PDF controlado menor que 20 MB.
4. Abra o PDF usando a visualização assinada.
5. Importe o mesmo arquivo novamente e confirme o bloqueio.
6. Edite um gasto e recarregue a página.
7. Divida um gasto entre responsáveis.
8. Confira os valores na tela de parcelamentos.
9. Exporte um relatório completo e individual.
10. Exclua a fatura e confira os dados relacionados.
11. Faça logout e entre com outra conta.
12. Confirme que não há acesso aos dados anteriores.
13. Localize a operação nos logs pelo `X-Request-Id`.

> [!WARNING]
> Execute o smoke test primeiro em Preview e novamente em Production. Configurações de domínio, OAuth e variáveis podem divergir.

## 🧭 Onde investigar falhas

| Sintoma | Verificar |
|---|---|
| Healthcheck `503` | Variáveis e logs da Function |
| Login retorna ao app sem sessão | Redirect URLs do Supabase/Google |
| PDF não importa | Tamanho, bucket, RLS, Gemini e `requestId` |
| Timeout | Duração da IA e limite do plano |
| PDF não abre | Caminho, policy e URL assinada |
| Dados de outra conta | Migration RLS e filtros `user_id` |

## ✅ Aprovação do ambiente

- [ ] Preview aprovado.
- [ ] Production aprovado.
- [ ] Domínio customizado e HTTPS ativos.
- [ ] Callback OAuth validado.
- [ ] RLS testada com duas contas.
- [ ] Logs acessíveis à equipe.
- [ ] Plano da Vercel suporta os limites configurados.
