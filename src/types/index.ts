export interface Categoria {
  id: string
  nome: string
  estoqueMinimo: number
  criadoEm: string
  _count?: { produtos: number }
}

export interface Fornecedor {
  id: string
  nome: string
  contato?: string | null
  email?: string | null
  telefone?: string | null
  site?: string | null
  criadoEm: string
}

export interface Setor {
  id: string
  nome: string
}

export interface Usuario {
  id: string
  nome: string
  email: string
  perfil: string
}

export interface Produto {
  id: string
  nome: string
  codigo: string
  categoriaId?: string | null
  categoria?: Categoria | null
  fornecedorId?: string | null
  fornecedor?: Fornecedor | null
  valorUnitario: number
  linkCompra?: string | null
  observacoes?: string | null
  criadoEm: string
  atualizadoEm: string
  unidades?: Unidade[]
  _count?: { unidades: number }
}

export interface Unidade {
  id: string
  produtoId: string
  produto?: Produto
  etiqueta: string
  dataCompra?: string | null
  status: 'ATIVA' | 'DESCARTADA'
  criadoEm: string
  movimentacoes?: Movimentacao[]
}

export interface Movimentacao {
  id: string
  tipo: 'ENTRADA' | 'SAIDA'
  subtipo?: 'USUARIO' | 'DESCARTE' | 'DEVOLUCAO' | null
  unidadeId: string
  unidade?: Unidade & { produto?: Produto }
  valorUnitario: number
  data: string
  fornecedorId?: string | null
  fornecedor?: Fornecedor | null
  setorId?: string | null
  setor?: Setor | null
  usuarioId?: string | null
  usuario?: Usuario | null
  responsavel?: string | null
  observacoes?: string | null
  cancelado: boolean
  canceladoEm?: string | null
  canceladoPor?: string | null
  criadoEm: string
}

export interface DashboardStats {
  totalProdutos: number
  totalUnidades: number
  valorTotal: number
  estoqueBaixoCount: number
  descartesDoMes: { count: number }
  ultimasMovimentacoes: Movimentacao[]
  topProdutos: { nome: string; totalSaida: number }[]
  distribuicaoCategoria: { nome: string; quantidade: number }[]
  graficoMovimentacoes: { data: string; entradas: number; saidas: number; descartes: number }[]
}
