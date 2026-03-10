# 🖥️ TI Assets — Sistema de Controle de Ativos de TI

Sistema profissional de controle de ativos e estoque de TI, com dashboard, histórico de movimentações, alertas de estoque baixo e exportação de dados.

## ✨ Funcionalidades

- **Dashboard profissional** com gráficos de movimentações, distribuição por fornecedor e indicadores
- **Cadastro completo de ativos** (nome, código, etiqueta, fornecedor, valor, estoque, links de compra)
- **Controle de entradas** com registro de fornecedor, data e valor
- **Controle de saídas** com registro de setor destino, usuário responsável e data
- **Histórico completo** de todas as movimentações
- **Alertas automáticos** de estoque baixo (item fica vermelho quando abaixo do mínimo)
- **Gerenciamento de fornecedores**
- **Exportação para CSV** de ativos e movimentações
- **Busca e filtros** por nome, código, etiqueta e fornecedor
- **Paginação** na listagem de ativos
- **Modo escuro/claro**
- **Interface responsiva** (desktop, tablet, celular)

## 🚀 Como rodar

### Pré-requisitos
- Node.js 18+
- npm ou yarn

### Instalação

```bash
# 1. Instalar dependências
npm install

# 2. Configurar banco de dados (SQLite local)
npx prisma db push

# 3. (Opcional) Popular com dados de exemplo
npm run db:seed

# 4. Iniciar servidor de desenvolvimento
npm run dev
```

Acesse: http://localhost:3000

## 🗄️ Banco de dados

O projeto usa SQLite por padrão (arquivo `prisma/dev.db`). Para usar PostgreSQL, altere o `.env`:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/ti_assets"
```

E no `prisma/schema.prisma`, mude `provider = "sqlite"` para `provider = "postgresql"`.

## 🌐 Deploy na Vercel


## 📁 Estrutura do projeto

```
src/
├── app/
│   ├── api/               # API Routes (backend)
│   │   ├── assets/        # CRUD de ativos
│   │   ├── movements/     # Movimentações
│   │   ├── suppliers/     # Fornecedores
│   │   ├── sectors/       # Setores
│   │   ├── users/         # Usuários
│   │   └── dashboard/     # Stats do dashboard
│   ├── dashboard/         # Página do dashboard
│   ├── assets/            # Páginas de ativos
│   ├── movements/         # Páginas de movimentações
│   └── suppliers/         # Página de fornecedores
├── components/
│   ├── layout/            # Sidebar e AppLayout
│   ├── ui/                # Componentes reutilizáveis
│   ├── dashboard/         # Componentes do dashboard
│   ├── assets/            # Formulário e lista de ativos
│   └── movements/         # Formulário e lista de movimentações
├── lib/
│   ├── prisma.ts          # Instância do Prisma
│   └── utils.ts           # Funções utilitárias
└── types/
    └── index.ts           # Types TypeScript
prisma/
├── schema.prisma          # Schema do banco
```

## 🛠️ Tecnologias

- **Next.js 14** — Framework React com App Router
- **TypeScript** — Tipagem estática
- **TailwindCSS** — Estilização
- **Prisma** — ORM
- **PostgreSQL** — Banco de dados
- **Recharts** — Gráficos interativos
- **Lucide React** — Ícones

## 📋 Tabelas do banco

- `Ativos` — Produtos/ativos de TI
- `Fornecedores` — Fornecedores
- `Movimentacoes` — Histórico de entradas e saídas
- `setor` — Setores da empresa
- `usuario` — Usuários do sistema
