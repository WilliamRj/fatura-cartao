# Backend Integration Checklist - Cartão Inteligente

Guia passo-a-passo para integrar a aplicação frontend com Supabase backend.

---

## 📋 Phase 1: Supabase Setup (1-2 horas)

### 1.1 Criar Projeto Supabase

- [ ] Acesse [supabase.com](https://supabase.com)
- [ ] Clique "New Project"
- [ ] Escolha:
  - **Organization**: Crie ou selecione existente
  - **Project name**: "cartao-inteligente"
  - **Database password**: Salve em local seguro
  - **Region**: Escolha mais próximo (ex: `sa-east-1` para Brasil)
- [ ] Aguarde criação (pode demorar 2-3 minutos)
- [ ] Copie e salve as credenciais:
  - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
  - `anon key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY`

### 1.2 Configurar Google OAuth

**Google Cloud Console:**

- [ ] Acesse [console.cloud.google.com](https://console.cloud.google.com)
- [ ] Crie novo projeto (nome: "cartao-inteligente")
- [ ] Vá para **APIs & Services → Library**
- [ ] Procure "Google+ API" e clique **ENABLE**
- [ ] Vá para **Credentials**
- [ ] Clique **Create Credentials → OAuth 2.0 Client ID**
- [ ] Selecione "Web Application"
- [ ] Configure:
  - **Name**: "Cartao Inteligente Web"
  - **Authorized JavaScript origins**:
    - `http://localhost:3000` (dev)
    - `https://seu-dominio.com` (produção)
  - **Authorized redirect URIs**:
    - `http://localhost:3000/auth/callback` (dev)
    - `https://seu-dominio.com/auth/callback` (produção)
- [ ] Copie:
  - `Client ID` → Salve para próximo passo
  - `Client Secret` → Salve para próximo passo

**Supabase Dashboard:**

- [ ] Vá para projeto Supabase criado
- [ ] **Authentication → Providers**
- [ ] Procure "Google"
- [ ] Habilite
- [ ] Cole:
  - **Client ID**: Do Google Cloud
  - **Client Secret**: Do Google Cloud
- [ ] Clique **Save**
- [ ] Teste login (vai funcionar após DB setup)

### 1.3 Criar Banco de Dados

- [ ] Vá para **SQL Editor** no Supabase
- [ ] Clique **New Query**
- [ ] Cole e execute o SQL abaixo:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. GASTOS TABLE
CREATE TABLE gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  estabelecimento TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL CHECK (valor > 0),
  categoria TEXT NOT NULL,
  responsavel TEXT NOT NULL,
  parcela TEXT,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX idx_gastos_user_id ON gastos(user_id);
CREATE INDEX idx_gastos_data ON gastos(data DESC);
CREATE INDEX idx_gastos_categoria ON gastos(categoria);
CREATE INDEX idx_gastos_responsavel ON gastos(responsavel);

-- 2. FATURAS TABLE
CREATE TABLE faturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mes_referencia TEXT NOT NULL,
  valor_total DECIMAL(10, 2) NOT NULL CHECK (valor_total > 0),
  quantidade_lancamentos INT DEFAULT 0,
  data_importacao DATE,
  arquivo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX idx_faturas_user_id ON faturas(user_id);
CREATE INDEX idx_faturas_mes ON faturas(mes_referencia DESC);

-- 3. PARCELAMENTOS TABLE
CREATE TABLE parcelamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  parcela_atual INT NOT NULL CHECK (parcela_atual > 0),
  total_parcelas INT NOT NULL CHECK (total_parcelas > 0),
  valor_parcela DECIMAL(10, 2) NOT NULL CHECK (valor_parcela > 0),
  valor_total DECIMAL(10, 2) NOT NULL CHECK (valor_total > 0),
  categoria TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX idx_parcelamentos_user_id ON parcelamentos(user_id);

-- 4. RESPONSAVEIS TABLE
CREATE TABLE responsaveis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL UNIQUE,
  cor TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX idx_responsaveis_user_id ON responsaveis(user_id);
```

- [ ] Confirme que todas as tabelas foram criadas (veja em **Tables** na esquerda)

### 1.4 Configurar Row Level Security

- [ ] Para cada tabela em **Tables**, clique no ícone de cadeado ao lado do nome
- [ ] Habilite "Enable RLS"
- [ ] Execute a SQL de RLS:

```sql
-- GASTOS RLS Policies
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

-- FATURAS RLS Policies
ALTER TABLE faturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own faturas"
  ON faturas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own faturas"
  ON faturas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own faturas"
  ON faturas FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own faturas"
  ON faturas FOR DELETE
  USING (auth.uid() = user_id);

-- PARCELAMENTOS RLS Policies
ALTER TABLE parcelamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own parcelamentos"
  ON parcelamentos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own parcelamentos"
  ON parcelamentos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own parcelamentos"
  ON parcelamentos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own parcelamentos"
  ON parcelamentos FOR DELETE
  USING (auth.uid() = user_id);

-- RESPONSAVEIS RLS Policies
ALTER TABLE responsaveis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own responsaveis"
  ON responsaveis FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own responsaveis"
  ON responsaveis FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own responsaveis"
  ON responsaveis FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own responsaveis"
  ON responsaveis FOR DELETE
  USING (auth.uid() = user_id);
```

### 1.5 Criar Storage Bucket

- [ ] Vá para **Storage** em Supabase
- [ ] Clique **Create a new bucket**
- [ ] Nome: `faturas`
- [ ] Escolha: **Public** (para facilitar acesso aos PDFs)
- [ ] Clique **Create bucket**
- [ ] Vá para aba **Policies**
- [ ] Adicione policy (ou deixe pública):

```sql
-- Storage policy para PDFs
CREATE POLICY "Users can upload own PDFs"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'faturas' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own PDFs"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'faturas' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
```

---

## 📋 Phase 2: Frontend Configuration (30 minutos)

### 2.1 Atualizar .env.local

- [ ] Abra `.env.local` (criar se não existir)
- [ ] Cole e complete:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=seu-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=seu-service-role-aqui

# App
NEXT_PUBLIC_APP_NAME=Cartão Inteligente
NEXT_PUBLIC_VERSION=1.0.0
```

### 2.2 Instalar Dependências

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs @tanstack/react-query zod react-hook-form sonner
```

- [ ] Confirme instalação sem erros
- [ ] Recomendado: `npm audit fix` se houver vulnerabilidades

### 2.3 Rodar Dev Server

```bash
npm run dev
```

- [ ] Abra http://localhost:3000
- [ ] Deve carregar login page (não dashboard)
- [ ] Clique "Entrar com Google"
- [ ] Complete login com sua conta Google
- [ ] Deve redirecionar para dashboard

---

## 📋 Phase 3: Testing (1-2 horas)

### 3.1 Testar Autenticação

- [ ] [ ] Login com Google - deve redirecionar para dashboard
- [ ] Logout - deve voltar para login page
- [ ] Refresh page - deve manter sessão
- [ ] Fechar browser, abrir novamente - deve restaurar sessão

### 3.2 Testar CRUD de Gastos

**Create:**
- [ ] Vá para página "Gastos"
- [ ] Clique "Novo Gasto" (quando implementado)
- [ ] Preencha: data, estabelecimento, valor, categoria, responsável
- [ ] Clique Salvar
- [ ] Deve aparecer na lista

**Read:**
- [ ] Dados devem aparecer em tempo real
- [ ] Filtros devem funcionar (categoria, responsável)
- [ ] Busca deve funcionar (estabelecimento)

**Update:**
- [ ] Clique em um gasto
- [ ] Edite categoria/responsável
- [ ] Clique Salvar
- [ ] Lista deve atualizar

**Delete:**
- [ ] Clique botão de deletar em um gasto
- [ ] Confirme
- [ ] Deve remover da lista

### 3.3 Testar Upload de Fatura

- [ ] Vá para "Faturas"
- [ ] Drag-and-drop um PDF
- [ ] Ou clique para selecionar
- [ ] Clique "Processar Faturas"
- [ ] Deve aparecer na lista

### 3.4 Testar Cada Página

- [ ] **Dashboard**: Carrega e mostra cards/gráficos
- [ ] **Gastos**: Tabela com dados, filtros funcionam
- [ ] **Faturas**: Lista com cards e upload
- [ ] **Parcelamentos**: Mostra progresso
- [ ] **Relatórios**: Gráficos renderizam
- [ ] **Configurações**: Pode adicionar/remover responsáveis

### 3.5 Testar Responsividade

- [ ] Abra DevTools (F12)
- [ ] Teste em **iPhone 12** (mobile)
- [ ] Teste em **iPad** (tablet)
- [ ] Teste em **Desktop** (1920x1080)
- [ ] Verifique layout e UI não quebra

---

## 📋 Phase 4: Performance & Optimization (1 hora)

### 4.1 Verificar Performance

```bash
# Usar Lighthouse no Chrome DevTools
- Abra DevTools (F12)
- Vá para "Lighthouse"
- Clique "Analyze page load"
- Target: Performance > 80
```

### 4.2 Verificar Types

```bash
# TypeScript check
npx tsc --noEmit

# ESLint
npm run lint
```

### 4.3 Verificar Build

```bash
npm run build
npm start

# Deve funcionar sem erros
```

---

## 📋 Phase 5: Deployment (2 horas)

### 5.1 Preparar para Produção

- [ ] Revisar código (code review)
- [ ] Testar em staging environment
- [ ] Criar commit final:

```bash
git add .
git commit -m "chore: prepare for production deployment"
git push origin main
```

### 5.2 Deploy no Vercel

**Option A: Via GitHub (Recomendado)**

- [ ] Vá para [vercel.com](https://vercel.com)
- [ ] Clique "New Project"
- [ ] Selecione repositório GitHub
- [ ] Clique "Import"
- [ ] Configure variáveis de ambiente:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Clique "Deploy"
- [ ] Aguarde build (5-10 minutos)
- [ ] Teste URL em produção

**Option B: Via CLI**

```bash
npm install -g vercel
vercel
# Siga prompts
```

### 5.3 Configurar Google OAuth para Produção

- [ ] Google Cloud Console:
  - Adicione domínio Vercel em "Authorized origins"
  - Adicione callback URL em "Authorized redirect URIs"
  - Exemplo: `https://seu-projeto.vercel.app/auth/callback`

- [ ] Supabase Dashboard:
  - Vá para **Settings → URL Configuration**
  - Adicione seu domínio de produção

### 5.4 Verificar DNS e SSL

- [ ] Domínio resolvendo corretamente
- [ ] SSL certificate ativo (HTTPS)
- [ ] Teste login em produção

---

## ✅ Final Checklist

### Funcionalidades

- [ ] Autenticação Google OAuth funcionando
- [ ] CRUD de Gastos completo
- [ ] Upload de Faturas funcionando
- [ ] Filtros e busca funcionando
- [ ] Gráficos renderizando
- [ ] Responsivo em mobile/tablet/desktop

### Qualidade

- [ ] Sem erros de console
- [ ] TypeScript sem warnings
- [ ] ESLint sem issues
- [ ] Performance > 80 (Lighthouse)
- [ ] Acessibilidade > 90 (Lighthouse)

### Segurança

- [ ] HTTPS em produção
- [ ] RLS policies ativas no Supabase
- [ ] Sem dados sensíveis em .env
- [ ] CORS configurado corretamente

### Documentation

- [ ] README.md atualizado
- [ ] ARCHITECTURE.md completo
- [ ] API_INTEGRATION.md completo
- [ ] DEVELOPMENT.md completo

---

## 🎉 Sucesso!

Quando todos os itens acima estiverem completos, você tem:

✅ Autenticação segura com Google OAuth  
✅ Backend persistente com Supabase  
✅ Aplicação funcional e responsiva  
✅ Documentação completa para futuros desenvolvedores  
✅ Pronto para produção  

---

## 🆘 Troubleshooting

### "NEXT_PUBLIC_SUPABASE_URL is not defined"

- Verifique .env.local existe
- Verifique variáveis estão corretas
- Restart dev server

### "OAuth redirect mismatch"

- Google Console: Verifique URL de callback exata
- Supabase: Verifique URL está configurada

### "RLS policy violation"

- Verifique policies foram criadas
- Verifique user_id está sendo passado
- Teste com service_role_key

### "Build error: Cannot find module"

- `npm install` novamente
- Delete `node_modules` e `.next`
- Restart

---

## 📞 Support

Dúvidas? Verifique:

1. [ARCHITECTURE.md](./ARCHITECTURE.md) - Visão geral
2. [API_INTEGRATION.md](./API_INTEGRATION.md) - Detalhes de API
3. [DEVELOPMENT.md](./DEVELOPMENT.md) - Development setup
4. Supabase Docs: https://supabase.com/docs
5. Abra issue no GitHub
