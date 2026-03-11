export interface Ativo {
  id: string
  nome: string
  codigo: string
  etiqueta?: string | null
  fornecedorId?: string | null
  fornecedor?: Fornecedor | null
  linkCompra?: string | null
  valorUnitario: number
  quantidade: number
  estoqueMinimo: number
  dataCompra?: string | null
  observacoes?: string | null
  criadoEm: string
  atualizadoEm: string
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

export interface Movimentacao {
  id: string
  tipo: 'ENTRADA' | 'SAIDA'
  ativoId: string
  ativo?: Ativo
  quantidade: number
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
  totalAtivos: number
  totalItens: number
  valorTotal: number
  estoqueBaixoCount: number
  ultimasMovimentacoes: Movimentacao[]
  topAtivos: { nome: string; totalSaida: number }[]
  distribuicaoFornecedor: { nome: string; quantidade: number }[]
  graficoMovimentacoes: { data: string; entradas: number; saidas: number }[]
}
