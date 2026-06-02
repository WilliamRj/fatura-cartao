# 💳 Cartão Inteligente

> Um sistema inteligente e moderno para gerenciamento de faturas de cartão de crédito

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)

## 🎯 Sobre

**Cartão Inteligente** é uma aplicação web moderna para gerenciar faturas de cartão de crédito. Permite aos usuários:

- 📊 Visualizar e analisar gastos com gráficos interativos
- 📄 Importar e organizar faturas em PDF
- 💰 Rastrear parcelamentos e despesas
- 👥 Atribuir responsáveis aos gastos
- 📈 Gerar relatórios detalhados

Construída com tecnologias modernas e com design profissional.

## 🚀 Quick Start

### Pré-requisitos

- **Node.js** 18+
- **npm** ou **yarn**
- **Conta Supabase**

### Instalação (3 minutos)

```bash
# 1. Clone o repositório
git clone <repo-url>
cd cartao-inteligente

# 2. Instale as dependências
npm install

# 3. Configure variáveis de ambiente
cp .env.example .env.local
# Edite com suas credenciais Supabase

# 4. Rode o dev server
npm run dev

# 5. Abra http://localhost:3000
```

## 📚 Documentação

| Documento | Descrição |
|-----------|-----------|
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Arquitetura e data flow |
| **[DEVELOPMENT.md](./DEVELOPMENT.md)** | Como desenvolver |
| **[API_INTEGRATION.md](./API_INTEGRATION.md)** | Setup Supabase |
| **[BACKEND_INTEGRATION_CHECKLIST.md](./BACKEND_INTEGRATION_CHECKLIST.md)** | Deploy checklist |
| **[CLAUDE.md](./CLAUDE.md)** | Padrões do projeto |

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Data Fetching**: React Query + Supabase
- **Auth**: OAuth2 (Google) via Supabase
- **Validation**: Zod + react-hook-form
- **Charts**: Recharts
- **Notifications**: Sonner

## 📁 Estrutura

```
cartao-inteligente/
├── app/                    # Next.js pages
├── components/             # React components
├── lib/                    # Utilities & hooks
│   ├── supabase/           # Supabase client
│   ├── api/                # Types & endpoints
│   ├── hooks/              # Data fetching hooks
│   └── data.ts             # Mock data & types
└── docs/                   # Documentation
```

## 📊 Funcionalidades

✅ Autenticação OAuth2 (Google)
✅ Dashboard com estatísticas
✅ Tabela de gastos com filtros
✅ Upload de faturas (PDF)
✅ Rastreamento de parcelamentos
✅ Relatórios com gráficos
✅ Gerenciamento de responsáveis
✅ Tema claro/escuro
✅ Design responsivo

## 🚀 Deploy

```bash
# Vercel
git push origin main  # Deploy automático

# Ou manual
npm install -g vercel
vercel
```

## 🧪 Testing

```bash
npm test       # Rodar testes
npm run build  # Build para produção
npm run dev    # Dev server
npm run lint   # ESLint check
```

## 🐛 Troubleshooting

**Cannot find module**
```bash
npm install && npm run dev
```

**RLS policy violation**
- Verificar policies em Supabase

**OAuth mismatch**
- Verificar URL em Google Cloud Console

## 📞 Suporte

- **Issues**: GitHub Issues
- **Docs**: [Documentação Completa](./ARCHITECTURE.md)

## 🤝 Contribuindo

1. Fork do projeto
2. Crie uma branch (`git checkout -b feature/feature-name`)
3. Commit (`git commit -m 'feat: description'`)
4. Push (`git push origin feature/feature-name`)
5. Abra um Pull Request

## 📄 Licença

MIT © 2024

## 👨‍💻 Autor

**William** - [@WilliamRj](https://github.com/WilliamRj)

---

Feito com ❤️
