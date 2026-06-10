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

export interface Funcionario {
  id: string
  nome: string
  setorId: string
  setor?: Setor
  ativo: boolean
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
  localAtual?: string
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

export interface Empresa {
  id: string
  razaoSocial: string
  nomeFantasia?: string | null
  cnpj: string
  inscricaoEstadual?: string | null
  emailCorporativo?: string | null
  telefone?: string | null
  website?: string | null
  endereco?: string | null
  cep?: string | null
  rua?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
  representanteNome?: string | null
  representanteCargo?: string | null
  representanteEmail?: string | null
  representanteTelefone?: string | null
  logoUrl?: string | null
  assinaturaUrl?: string | null
  usarLogoNoPdf?: boolean
  exibirCargoRepresentante?: boolean
  assinaturaAutomatica?: boolean
  mostrarEnderecoNoTermo?: boolean
  criadoEm: string
  atualizadoEm: string
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
