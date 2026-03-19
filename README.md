# 🖥️ IT Control — Sistema de Controle de Ativos de TI

Sistema profissional fullstack de controle de ativos e estoque de TI, com dashboard em tempo real, histórico completo de movimentações, alertas de estoque por categoria e controle de descartes.

🔗 **[Acessar sistema](https://it-control-fast.vercel.app)**

---

## ✨ Funcionalidades

### 📊 Dashboard
- Cards com total de produtos, itens em estoque, valor total, categorias em estoque baixo e descartes do mês
- Gráfico de movimentações dos últimos 7 dias (entradas, saídas e descartes)
- Gráfico de distribuição por fornecedor
- Top produtos com maior saída
- Feed das últimas movimentações

### 📦 Ativos
- Cadastro completo (nome, código, etiqueta, categoria, fornecedor, valor, data de compra, link de compra)
- Busca por nome, código ou etiqueta
- Filtros por categoria, fornecedor e estoque baixo
- Soft delete — histórico preservado após exclusão
- Exportação em CSV

### 🔄 Movimentações
- **Entrada de estoque** — com fornecedor, data e valor unitário
- **Saída para usuário** — com setor destino e funcionário que recebe
- **Descarte** — registra motivo, zera estoque do item automaticamente
- Cancelamento de movimentações (admin) com estorno automático de estoque

### 🏷️ Categorias
- Estoque mínimo definido por categoria (ex: Teclados mínimo 4 unidades)
- Alerta disparado quando a soma de todos os ativos da categoria fica abaixo do mínimo
- CRUD completo pelo admin

### 🏢 Fornecedores
- Cadastro com contato, e-mail, telefone e site
- Máscara automática de telefone

### 🔐 Autenticação
- Login com Google OAuth
- Login com e-mail e senha
- Controle de acesso por perfil (admin / usuário)
- Usuários inativos bloqueados automaticamente

### ⚙️ Administração
- Gerenciamento de usuários (ativar/desativar, alterar perfil)
- Gerenciamento de setores
- Gerenciamento de categorias
- Histórico completo com filtros por tipo, subtipo, categoria, produto, usuário e setor
- Exportação do histórico em CSV

### 🎨 Interface
- Modo escuro / claro
- Totalmente responsivo (desktop, tablet, celular)
- Sidebar colapsável com submenus

---

## 🛠️ Tecnologias

| Tecnologia | Versão | Uso |
|---|---|---|
| Next.js | 14 | Framework fullstack (App Router) |
| React | 18 | Interface |
| TypeScript | 5 | Tipagem estática |
| TailwindCSS | 3 | Estilização |
| Prisma ORM | 5 | Banco de dados |
| PostgreSQL | — | Banco (Neon.tech) |
| NextAuth.js | 4 | Autenticação |
| Recharts | 2 | Gráficos |
| Lucide React | — | Ícones |

---

## 🗄️ Banco de Dados

| Tabela | Descrição |
|---|---|
| `usuarios` | Usuários do sistema |
| `accounts` | Contas OAuth (NextAuth) |
| `sessions` | Sessões ativas (NextAuth) |
| `ativos` | Equipamentos de TI |
| `categorias` | Categorias com estoque mínimo |
| `fornecedores` | Fornecedores |
| `setores` | Setores da empresa |
| `movimentacoes` | Histórico de entradas, saídas e descartes |

---

## 📁 Estrutura

```
src/
├── app/
│   ├── api/                  # Backend (API Routes)
│   │   ├── ativos/
│   │   ├── movimentacoes/
│   │   ├── categorias/
│   │   ├── fornecedores/
│   │   ├── setores/
│   │   ├── dashboard/
│   │   └── admin/
│   ├── dashboard/
│   ├── ativos/
│   ├── movimentacoes/
│   ├── fornecedores/
│   ├── admin/
│   └── login/
├── components/
│   ├── layout/               # Sidebar, AppLayout
│   ├── ui/                   # Componentes reutilizáveis
│   ├── dashboard/
│   ├── ativos/
│   └── movimentacoes/
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── utils.ts
│   └── mascaras.ts
└── types/
    └── index.ts
prisma/
└── schema.prisma
```

---

## 🚀 Deploy

Hospedado na **Vercel** com deploy automático a partir da branch `main`.  
Banco de dados **PostgreSQL** na **Neon.tech**.

---

*Desenvolvido por [Gabriell Gava](https://github.com/Gabriellgava)*
