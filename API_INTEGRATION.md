# API Integration Guide - Cartão Inteligente

## 🎯 Objetivo

Guia completo para integração do frontend com Supabase backend. Descreve como dados fluem, como configurar o banco de dados, e como testar a integração.

---

## 📋 Checklist de Configuração do Supabase

### Passo 1: Criar Projeto Supabase

- [ ] Acesse [supabase.com](https://supabase.com)
- [ ] Crie novo projeto (escolha region mais próxima)
- [ ] Copie as credenciais:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

### Passo 2: Habilitar Google OAuth

- [ ] Vá para **Authentication → Providers**
- [ ] Habilite **Google**
- [ ] Configure Google Console:
  - [ ] Crie projeto no Google Cloud Console
  - [ ] Habilite Google+ API
  - [ ] Crie OAuth 2.0 credentials (tipo: Web Application)
  - [ ] Adicione URLs autorizadas:
    - `http://localhost:3000/auth/callback` (desenvolvimento)
    - `https://seu-dominio.com/auth/callback` (produção)
  - [ ] Copie Client ID e Client Secret
- [ ] Cole no Supabase Google provider

### Passo 3: Criar Tabelas do Banco de Dados

Execute o seguinte SQL no Supabase SQL Editor:

```sql
-- Tabela: gastos (despesas do cartão)
CREATE TABLE gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  estabelecimento TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  categoria TEXT NOT NULL,
  responsavel TEXT NOT NULL,
  parcela TEXT,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Tabela: faturas (notas fiscais/extratos)
CREATE TABLE faturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mes_referencia TEXT NOT NULL,
  valor_total DECIMAL(10, 2) NOT NULL,
  quantidade_lancamentos INT DEFAULT 0,
  data_importacao DATE,
  arquivo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Tabela: parcelamentos (compras parceladas)
CREATE TABLE parcelamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  parcela_atual INT NOT NULL,
  total_parcelas INT NOT NULL,
  valor_parcela DECIMAL(10, 2) NOT NULL,
  valor_total DECIMAL(10, 2) NOT NULL,
  categoria TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Tabela: responsaveis (usuários que compartilham o cartão)
CREATE TABLE responsaveis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cor TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Índices para performance
CREATE INDEX idx_gastos_user_id ON gastos(user_id);
CREATE INDEX idx_gastos_data ON gastos(data DESC);
CREATE INDEX idx_gastos_categoria ON gastos(categoria);
CREATE INDEX idx_gastos_responsavel ON gastos(responsavel);

CREATE INDEX idx_faturas_user_id ON faturas(user_id);
CREATE INDEX idx_faturas_mes ON faturas(mes_referencia DESC);

CREATE INDEX idx_parcelamentos_user_id ON parcelamentos(user_id);

CREATE INDEX idx_responsaveis_user_id ON responsaveis(user_id);
```

### Passo 4: Configurar Row Level Security (RLS)

Habilite RLS em todas as tabelas (clique no ícone de cadeado):

```sql
-- Políticas para gastos
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gastos"
  ON gastos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gastos"
  ON gastos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gastos"
  ON gastos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own gastos"
  ON gastos FOR DELETE
  USING (auth.uid() = user_id);

-- Repita padrão similar para: faturas, parcelamentos, responsaveis
```

### Passo 5: Criar Storage Bucket

- [ ] Vá para **Storage**
- [ ] Crie novo bucket chamado `faturas`
- [ ] Configure como público (ou privado, conforme preferência)
- [ ] Habilite RLS (mesmo padrão das tabelas)

---

## 🔌 Endpoints de API - Estrutura

### Autenticação

**GET /auth/callback**
- Callback handler para OAuth Google
- Recebe code do Google
- Troca code por session no Supabase
- Redireciona para dashboard

**POST /logout**
- Sign out do usuário
- Limpa sessão
- Redireciona para login

### Dados (via Supabase Client)

Todos os endpoints usam o cliente Supabase direto (não há API REST customizada):

```typescript
// Em /lib/hooks/useGastos.ts
const { data } = await supabase
  .from('gastos')
  .select('*')
  .eq('user_id', userId)
  .order('data', { ascending: false });
```

---

## 📊 Estrutura de Dados

### Gasto (Despesa)

```typescript
interface Gasto {
  id: string;                    // UUID
  user_id: string;               // Supabase Auth User ID
  data: string;                  // ISO date: "2024-01-15"
  estabelecimento: string;       // ex: "Supermercado Extra"
  valor: number;                 // ex: 456.78
  categoria: string;             // ex: "Alimentacao"
  responsavel: string;           // ex: "William"
  parcela?: string;              // ex: "3/10" (opcional)
  observacao?: string;           // Notas (opcional)
  created_at: string;            // Timestamp
  updated_at: string;            // Timestamp
}
```

### Fatura (Nota Fiscal)

```typescript
interface Fatura {
  id: string;
  user_id: string;
  mes_referencia: string;        // ex: "Janeiro 2024"
  valor_total: number;           // ex: 3264.27
  quantidade_lancamentos: number; // ex: 20
  data_importacao: string;       // ISO date
  arquivo_url?: string;          // URL do PDF em Storage
  created_at: string;
}
```

### Parcelamento

```typescript
interface Parcelamento {
  id: string;
  user_id: string;
  nome: string;                  // ex: "Samsung Galaxy S23"
  parcela_atual: number;         // ex: 9
  total_parcelas: number;        // ex: 18
  valor_parcela: number;         // ex: 194.54
  valor_total: number;           // ex: 3501.72
  categoria?: string;
  created_at: string;
}
```

### Responsável

```typescript
interface Responsavel {
  id: string;
  user_id: string;
  nome: string;                  // ex: "William"
  cor?: string;                  // ex: "bg-chart-1"
  created_at: string;
}
```

---

## 🔄 Fluxo de Requisições

### 1. Login (OAuth)

```
Cliente: Clica "Entrar com Google"
    ↓
Frontend: window.location.href = supabase.auth.signInWithOAuth({ provider: 'google' })
    ↓
Google OAuth: Abre Google login
    ↓
Google: Redireciona para /auth/callback?code=xxxxx
    ↓
Backend: Troca code por session
    ↓
Frontend: Session armazenado no Supabase
    ↓
App: Redireciona para /dashboard
```

### 2. Fetch de Gastos

```
Cliente: Abre página Gastos
    ↓
Frontend: useGastos() hook dispara
    ↓
React Query: Verifica cache (stale = 5 min)
    ↓
Se stale: supabase.from('gastos').select('*')
    ↓
Supabase: Retorna gastos com RLS filters
    ↓
Frontend: Atualiza UI com dados
```

### 3. Atualizar Gasto

```
Cliente: Clica editar, muda categoria
    ↓
Frontend: Submete form com validação zod
    ↓
useUpdateGasto(): Chama supabase.from('gastos').update()
    ↓
Supabase: Valida RLS, atualiza registro
    ↓
Frontend: Toast "Salvo com sucesso"
    ↓
React Query: Invalida cache de gastos
    ↓
Auto-refetch: Dados atualizados renderizados
```

---

## 🆘 Tratamento de Erros

### Padrão de Error Handling

```typescript
try {
  const { data, error } = await supabase
    .from('gastos')
    .select('*');
  
  if (error) {
    // RLS violation: 403
    // Not found: 404
    // Auth required: 401
    console.error('Supabase error:', error.message);
    throw new Error(error.message);
  }
  
  return data;
} catch (err) {
  toast.error(err.message);
  throw err;
}
```

### Erros Comuns

| Erro | Causa | Solução |
|------|-------|---------|
| 401 | Não autenticado | Fazer login |
| 403 | RLS violation | Verificar políticas RLS |
| 404 | Recurso não encontrado | Verificar ID |
| 422 | Validação | Verificar tipos de dados |
| 500 | Erro server | Verificar Supabase status |

---

## 📤 Upload de Arquivos

### Storage Structure

```
faturas/
├── [user_id]/
│   ├── fatura_janeiro_2024.pdf
│   ├── fatura_fevereiro_2024.pdf
│   └── ...
```

### Upload Flow

```typescript
const { data, error } = await supabase.storage
  .from('faturas')
  .upload(`${userId}/fatura_${data}.pdf`, file);

if (error) throw error;

// Guardar URL na tabela faturas
const { error: insertError } = await supabase
  .from('faturas')
  .insert({
    user_id: userId,
    arquivo_url: data.path,
    // ... outros campos
  });
```

---

## 🧪 Testando a Integração

### 1. Local Development Setup

```bash
# 1. Clone o repositório
git clone <repo>
cd cartao-inteligente

# 2. Install dependências
npm install

# 3. Configure .env.local
NEXT_PUBLIC_SUPABASE_URL=seu_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_aqui

# 4. Rode o dev server
npm run dev
```

### 2. Teste Manual

```
1. Abra http://localhost:3000
2. Clique "Entrar com Google"
3. Faça login com sua conta Google
4. Você deve ser redirecionado para /dashboard
5. Teste cada página:
   - Gastos: Crie, edite, delete um gasto
   - Faturas: Teste upload de PDF
   - Parcelamentos: Visualize dados
   - Relatórios: Veja gráficos
   - Configurações: Adicione responsável
```

### 3. Testar com Mock Data

```typescript
// Inserir dados de teste via console do Supabase
const { data } = await supabase
  .from('gastos')
  .insert([
    {
      user_id: 'seu_user_id',
      data: '2024-01-15',
      estabelecimento: 'Teste Loja',
      valor: 100.00,
      categoria: 'Alimentacao',
      responsavel: 'William'
    }
  ]);
```

---

## 📚 Recursos

### Documentação

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase RLS Docs](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Supabase PostgreSQL Docs](https://supabase.com/docs/guides/database)

### Tools Úteis

- Supabase Studio (admin panel)
- pgAdmin (gerenciar PostgreSQL)
- Postman (testar API se usar custom routes)

---

## 🚀 Deployment

### Variáveis de Produção

```env
# Produção
NEXT_PUBLIC_SUPABASE_URL=https://[prod-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[prod-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[prod-service-role]
```

### Configurar Google OAuth para Produção

- [ ] Adicionar domínio de produção no Google Cloud Console
- [ ] Atualizar URL de callback em Supabase

### Backup do Banco de Dados

Supabase oferece backups automáticos. Veja:
- **Settings → Backups** no Supabase Studio

---

## 🆘 Troubleshooting

### "RLS policy not found"

- Verifique se as políticas RLS foram criadas corretamente
- Teste com service_role_key (não tem restrições)

### "CORS Error"

- Supabase auto-configura CORS
- Se erro persiste, verifique URL em .env

### "OAuth redirect mismatch"

- Verifique URL de callback exata em Google Console
- Deve ser `http://localhost:3000/auth/callback` em dev
- E `https://seu-dominio.com/auth/callback` em prod

---

## 📞 Support

- GitHub Issues
- Discord community
- Email: [seu-email]
