'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Search, Plus, Edit2, Trash2, Download, Package, Tag, ChevronDown, ChevronRight, Eye, ArrowRightLeft } from 'lucide-react'
import { Button, Badge, Input, Select, Modal, Table, PageHeader, LoadingState, ErrorState } from '@/components/ui'
import { formatMoeda, formatData, exportarCSV } from '@/lib/utils'
import type { Produto, Categoria, Fornecedor } from '@/types'
import { ProdutoForm } from './ProdutoForm'

export function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [busca, setBusca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroFornecedor, setFiltroFornecedor] = useState('')
  const [modo, setModo] = useState<'agrupado' | 'individual'>('agrupado')
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [editando, setEditando] = useState<Produto | null>(null)
  const [consultando, setConsultando] = useState<Produto | null>(null)
  const [deletandoId, setDeletandoId] = useState<string | null>(null)
  const [movendoUnidade, setMovendoUnidade] = useState<{ id: string, etiqueta: string, produtoId: string } | null>(null)
  const [produtoDestinoId, setProdutoDestinoId] = useState('')
  const [excluindoUnidade, setExcluindoUnidade] = useState<{ id: string, etiqueta: string } | null>(null)
  const [acaoLoading, setAcaoLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const buscarProdutos = useCallback(async () => {
    setLoading(true)
    setError('')
    const p = new URLSearchParams()
    if (busca) p.set('search', busca)
    if (filtroCategoria) p.set('categoriaId', filtroCategoria)
    if (filtroFornecedor) p.set('fornecedorId', filtroFornecedor)
    try {
      const res = await fetch(`/api/produtos?${p}`)
      if (!res.ok) throw new Error('Não foi possível carregar produtos.')
      setProdutos(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro inesperado ao carregar produtos.')
    } finally {
      setLoading(false)
    }
  }, [busca, filtroCategoria, filtroFornecedor])

  useEffect(() => {
    buscarProdutos()
    fetch('/api/categorias').then(r => r.ok ? r.json() : []).then(setCategorias).catch(() => setCategorias([]))
    fetch('/api/fornecedores').then(r => r.ok ? r.json() : []).then(setFornecedores).catch(() => setFornecedores([]))
  }, [buscarProdutos])

  const toggleExpandir = (id: string) => {
    setExpandidos(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const deletar = async () => {
    if (!deletandoId) return
    setError('')
    const res = await fetch(`/api/produtos/${deletandoId}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Não foi possível excluir o produto.')
      return
    }
    setDeletandoId(null)
    buscarProdutos()
  }

  const iniciarMoverUnidade = (unidadeId: string, etiqueta: string, produtoId: string) => {
    setError('')
    setMovendoUnidade({ id: unidadeId, etiqueta, produtoId })
    setProdutoDestinoId('')
  }

  const confirmarMoverUnidade = async () => {
    if (!movendoUnidade || !produtoDestinoId) return
    setAcaoLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/unidades/${movendoUnidade.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produtoId: produtoDestinoId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Não foi possível mover o item.')
      setMovendoUnidade(null)
      setProdutoDestinoId('')
      buscarProdutos()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro inesperado ao mover item.')
    } finally {
      setAcaoLoading(false)
    }
  }

  const confirmarExcluirUnidade = async () => {
    if (!excluindoUnidade) return
    setAcaoLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/unidades/${excluindoUnidade.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Não foi possível excluir o item.')
      setExcluindoUnidade(null)
      buscarProdutos()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro inesperado ao excluir item.')
    } finally {
      setAcaoLoading(false)
    }
  }

  const exportar = () => exportarCSV(produtos.map(p => ({
    Nome: p.nome, Código: p.codigo,
    Categoria: p.categoria?.nome ?? '',
    Fornecedor: p.fornecedor?.nome ?? '',
    'Valor Unit.': p.valorUnitario,
    'Unidades Ativas': p._count?.unidades ?? 0,
  })), 'produtos-ti')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produtos"
        description={`${produtos.length} modelo${produtos.length !== 1 ? 's' : ''} cadastrado${produtos.length !== 1 ? 's' : ''}`}
        actions={
          <>
            <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} onClick={exportar}>CSV</Button>
            <Link href="/produtos/novo"><Button size="sm" icon={<Plus className="w-4 h-4" />}>Novo Produto</Button></Link>
          </>
        }
      />

      {error && <ErrorState message={error} />}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input placeholder="Buscar por nome, código ou etiqueta..." value={busca} onChange={e => setBusca(e.target.value)} icon={<Search className="w-4 h-4" />} />
        </div>
        <Select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
          <option value="">Todas as categorias</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </Select>
        <Select value={filtroFornecedor} onChange={e => setFiltroFornecedor(e.target.value)}>
          <option value="">Todos os fornecedores</option>
          {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </Select>
      </div>

      {/* Toggle modo */}
      <div className="flex gap-2">
        <button onClick={() => setModo('agrupado')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${modo === 'agrupado' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
          <Package className="w-3.5 h-3.5" /> Por Produto
        </button>
        <button onClick={() => setModo('individual')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${modo === 'individual' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
          <Tag className="w-3.5 h-3.5" /> Por Etiqueta
        </button>
      </div>

      {loading ? (
        <LoadingState message="Carregando produtos..." />
      ) : modo === 'agrupado' ? (
        /* MODO AGRUPADO */
        <div className="space-y-2">
          {produtos.length === 0 && <p className="text-center text-gray-400 py-12">Nenhum produto encontrado</p>}
          {produtos.map(p => (
            <div key={p.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
              <div className="flex items-center gap-4 px-4 py-3">
                <button onClick={() => toggleExpandir(p.id)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  {expandidos.has(p.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{p.nome}</p>
                    <span className="text-xs font-mono text-gray-400">{p.codigo}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {p.categoria && <Badge variant="info">{p.categoria.nome}</Badge>}
                    {p.fornecedor && <span className="text-xs text-gray-400">{p.fornecedor.nome}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{p._count?.unidades ?? 0} unid.</p>
                  <p className="text-xs text-gray-400">{formatMoeda(p.valorUnitario)} cada</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setConsultando(p)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-indigo-600 transition-colors"><Eye className="w-4 h-4" /></button>
                  <button onClick={() => setEditando(p)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => setDeletandoId(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              {/* Unidades expandidas */}
              {expandidos.has(p.id) && p.unidades && (
                <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  {p.unidades.length === 0
                    ? <p className="text-xs text-gray-400 px-8 py-3">Nenhuma unidade cadastrada — faça uma entrada de estoque</p>
                    : p.unidades.map(u => (
                      <div key={u.id} className="flex items-center gap-4 px-8 py-2 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                        <Tag className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="text-sm font-mono font-medium text-gray-700 dark:text-gray-300">{u.etiqueta}</span>
                        {u.dataCompra && <span className="text-xs text-gray-400">Compra: {formatData(u.dataCompra)}</span>}
                        <Badge variant={u.status === 'ATIVA' ? 'success' : 'danger'}>{u.status === 'ATIVA' ? 'Ativa' : 'Descartada'}</Badge>
                        <div className="ml-auto flex items-center gap-1">
                          <button
                            onClick={() => iniciarMoverUnidade(u.id, u.etiqueta, p.id)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Mover para outro produto"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setExcluindoUnidade({ id: u.id, etiqueta: u.etiqueta })}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                            title="Excluir item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* MODO INDIVIDUAL — por etiqueta */
        <Table headers={['Etiqueta', 'Produto', 'Categoria', 'Fornecedor', 'Valor', 'Data Compra', 'Status', 'Ações']} empty={produtos.flatMap(p => p.unidades ?? []).length === 0}>
          {produtos.flatMap(p =>
            (p.unidades ?? []).map(u => (
              <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3"><span className="font-mono text-sm font-medium text-gray-900 dark:text-white">{u.etiqueta}</span></td>
                <td className="px-4 py-3"><p className="text-sm text-gray-900 dark:text-white">{p.nome}</p><p className="text-xs text-gray-400">{p.codigo}</p></td>
                <td className="px-4 py-3">{p.categoria ? <Badge variant="info">{p.categoria.nome}</Badge> : <span className="text-xs text-gray-400">—</span>}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{p.fornecedor?.nome ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{formatMoeda(p.valorUnitario)}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{u.dataCompra ? formatData(u.dataCompra) : '—'}</td>
                <td className="px-4 py-3"><Badge variant={u.status === 'ATIVA' ? 'success' : 'danger'}>{u.status === 'ATIVA' ? 'Ativa' : 'Descartada'}</Badge></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => iniciarMoverUnidade(u.id, u.etiqueta, p.id)}
                      className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Mover para outro produto"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setExcluindoUnidade({ id: u.id, etiqueta: u.etiqueta })}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                      title="Excluir item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </Table>
      )}

      {/* Modal editar */}
      <Modal open={!!editando} onClose={() => setEditando(null)} title="Editar Produto">
        {editando && (
          <ProdutoForm
            produto={editando}
            categorias={categorias}
            fornecedores={fornecedores}
            onSuccess={() => { setEditando(null); buscarProdutos() }}
            onCancel={() => setEditando(null)}
          />
        )}
      </Modal>

      {/* Modal consulta */}
      <Modal open={!!consultando} onClose={() => setConsultando(null)} title="Detalhes do Produto">
        {consultando && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500">Nome</p>
                <p className="font-medium text-gray-900 dark:text-white">{consultando.nome}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Código</p>
                <p className="font-mono text-gray-900 dark:text-white">{consultando.codigo}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Categoria</p>
                <p className="text-gray-900 dark:text-white">{consultando.categoria?.nome ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Fornecedor</p>
                <p className="text-gray-900 dark:text-white">{consultando.fornecedor?.nome ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Valor unitário</p>
                <p className="text-gray-900 dark:text-white">{formatMoeda(consultando.valorUnitario)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Unidades ativas</p>
                <p className="text-gray-900 dark:text-white">{consultando._count?.unidades ?? 0}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500">Link de compra</p>
              {consultando.linkCompra ? (
                <a
                  href={consultando.linkCompra}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline break-all"
                >
                  {consultando.linkCompra}
                </a>
              ) : (
                <p className="text-gray-900 dark:text-white">—</p>
              )}
            </div>

            <div>
              <p className="text-xs text-gray-500">Observações</p>
              <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{consultando.observacoes || '—'}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal deletar */}
      <Modal open={!!deletandoId} onClose={() => setDeletandoId(null)} title="Confirmar exclusão">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Tem certeza que deseja excluir este produto? Só é possível excluir produtos sem unidades ativas.</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setDeletandoId(null)}>Cancelar</Button>
          <Button variant="danger" onClick={deletar}>Excluir</Button>
        </div>
      </Modal>

      <Modal open={!!movendoUnidade} onClose={() => { setMovendoUnidade(null); setProdutoDestinoId('') }} title="Mover item para outro produto">
        {movendoUnidade && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Selecione o produto de destino para a etiqueta <span className="font-mono font-medium">{movendoUnidade.etiqueta}</span>.
            </p>
            <Select value={produtoDestinoId} onChange={e => setProdutoDestinoId(e.target.value)}>
              <option value="">Selecionar produto</option>
              {produtos
                .filter(p => p.id !== movendoUnidade.produtoId)
                .map(p => <option key={p.id} value={p.id}>{p.nome} ({p.codigo})</option>)}
            </Select>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => { setMovendoUnidade(null); setProdutoDestinoId('') }}>Cancelar</Button>
              <Button loading={acaoLoading} onClick={confirmarMoverUnidade} disabled={!produtoDestinoId}>Mover item</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!excluindoUnidade} onClose={() => setExcluindoUnidade(null)} title="Excluir item">
        {excluindoUnidade && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Tem certeza que deseja excluir a etiqueta <span className="font-mono font-medium">{excluindoUnidade.etiqueta}</span>?
            </p>
            <p className="text-xs text-gray-500">
              A exclusão só é permitida para itens sem movimentações.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setExcluindoUnidade(null)}>Cancelar</Button>
              <Button variant="danger" loading={acaoLoading} onClick={confirmarExcluirUnidade}>Excluir item</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
