'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { ArrowDownCircle, ArrowUpCircle, Download, XCircle, Trash2 } from 'lucide-react'
import { Button, Badge, Table, Select, Modal, LoadingState, ErrorState, PageHeader } from '@/components/ui'
import { formatMoeda, formatDataHora, exportarCSV } from '@/lib/utils'
import type { Movimentacao, Produto } from '@/types'

export function MovimentacoesPage() {
  const { data: session } = useSession()
  const [movs, setMovs] = useState<Movimentacao[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroProduto, setFiltroProduto] = useState('')
  const [filtroResponsavel, setFiltroResponsavel] = useState('')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const [cancelandoId, setCancelandoId] = useState<string | null>(null)
  const [cancelando, setCancelando] = useState(false)
  const isAdmin = session?.user.perfil === 'admin'

  const buscar = useCallback(async () => {
    setLoading(true)
    setError('')
    const p = new URLSearchParams()
    if (filtroTipo) p.set('tipo', filtroTipo)
    if (filtroProduto) p.set('produtoId', filtroProduto)
    try {
      const res = await fetch(`/api/movimentacoes?${p}`)
      if (!res.ok) throw new Error('Não foi possível carregar movimentações.')
      setMovs(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro inesperado ao carregar movimentações.')
    } finally {
      setLoading(false)
    }
  }, [filtroTipo, filtroProduto])

  useEffect(() => {
    buscar()
    fetch('/api/produtos')
      .then(r => r.ok ? r.json() : [])
      .then(setProdutos)
      .catch(() => setProdutos([]))
  }, [buscar])

  const cancelar = async () => {
    if (!cancelandoId) return
    setCancelando(true)
    setError('')
    try {
      const res = await fetch(`/api/movimentacoes/${cancelandoId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Não foi possível cancelar a movimentação.')
      setCancelandoId(null)
      await buscar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro inesperado ao cancelar movimentação.')
    } finally {
      setCancelando(false)
    }
  }

  const exportar = () => exportarCSV(movs.filter(m => !m.cancelado).map(m => ({
    Tipo: m.tipo,
    Subtipo: m.subtipo ?? '—',
    Produto: m.unidade?.produto?.nome ?? '—',
    Etiqueta: m.unidade?.etiqueta ?? '—',
    'Valor Unitário': m.valorUnitario,
    Fornecedor: m.fornecedor?.nome ?? '—',
    Setor: m.setor?.nome ?? '—',
    Responsável: m.responsavel ?? '—',
    Data: formatDataHora(m.data),
    Observações: m.observacoes ?? '',
  })), 'movimentacoes-ti')

  const movimentacoesFiltradas = useMemo(() => {
    const responsavelBusca = filtroResponsavel.trim().toLowerCase()

    const inicio = filtroDataInicio ? new Date(`${filtroDataInicio}T00:00:00`) : null
    const fim = filtroDataFim ? new Date(`${filtroDataFim}T23:59:59.999`) : null

    const dadosFiltrados = movs.filter((m) => {
      const responsavel = (m.responsavel ?? m.usuario?.nome ?? '').toLowerCase()
      const atendeResponsavel = !responsavelBusca || responsavel.includes(responsavelBusca)

      const dataMovimentacao = new Date(m.data)
      const atendeInicio = !inicio || dataMovimentacao >= inicio
      const atendeFim = !fim || dataMovimentacao <= fim

      return atendeResponsavel && atendeInicio && atendeFim
    })

    if (!sort) return dadosFiltrados

    const mapaCampos: Record<string, (m: Movimentacao) => string | number> = {
      Tipo: (m) => m.tipo,
      'Produto / Etiqueta': (m) => `${m.unidade?.produto?.nome ?? ''} ${m.unidade?.etiqueta ?? ''}`,
      'Valor Unit.': (m) => m.valorUnitario ?? 0,
      Destino: (m) => (m.tipo === 'ENTRADA' ? (m.fornecedor?.nome ?? '') : (m.subtipo === 'DESCARTE' ? 'Descartado' : (m.setor?.nome ?? ''))),
      Responsável: (m) => m.responsavel ?? m.usuario?.nome ?? '',
      Data: (m) => new Date(m.data).getTime(),
    }

    const selector = mapaCampos[sort.key]
    if (!selector) return dadosFiltrados

    return [...dadosFiltrados].sort((a, b) => {
      const aValor = selector(a)
      const bValor = selector(b)

      const comparacao = typeof aValor === 'number' && typeof bValor === 'number'
        ? aValor - bValor
        : String(aValor).localeCompare(String(bValor), 'pt-BR', { numeric: true, sensitivity: 'base' })

      return sort.direction === 'asc' ? comparacao : -comparacao
    })
  }, [movs, filtroResponsavel, filtroDataInicio, filtroDataFim, sort])

  const alternarOrdenacao = (header: string) => {
    setSort((atual) => {
      if (!atual || atual.key !== header) return { key: header, direction: 'asc' }
      return { key: header, direction: atual.direction === 'asc' ? 'desc' : 'asc' }
    })
  }

  if (loading) return <LoadingState message="Carregando movimentações..." />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Movimentações"
        description={`${movs.filter(m => !m.cancelado).length} registro${movs.filter(m => !m.cancelado).length !== 1 ? 's' : ''}`}
        actions={
          <>
            <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} onClick={exportar}>CSV</Button>
            <Link href="/movimentacoes/entrada"><Button size="sm" icon={<ArrowDownCircle className="w-4 h-4" />} variant="secondary">Entrada</Button></Link>
            <Link href="/movimentacoes/saida"><Button size="sm" icon={<ArrowUpCircle className="w-4 h-4" />}>Saída</Button></Link>
          </>
        }
      />

      {error && <ErrorState message={error} />}

      <div className="flex gap-3 flex-wrap items-end">
        <Select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="w-44">
          <option value="">Todos os tipos</option>
          <option value="ENTRADA">Entradas</option>
          <option value="SAIDA">Saídas</option>
        </Select>
        <Select value={filtroProduto} onChange={e => setFiltroProduto(e.target.value)} className="w-60">
          <option value="">Todos os produtos</option>
          {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </Select>
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Responsável</label>
          <input
            type="text"
            value={filtroResponsavel}
            onChange={(e) => setFiltroResponsavel(e.target.value)}
            placeholder="Filtrar por responsável"
            className="w-60 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Período (de)</label>
          <input
            type="date"
            value={filtroDataInicio}
            onChange={(e) => setFiltroDataInicio(e.target.value)}
            className="w-44 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Período (até)</label>
          <input
            type="date"
            value={filtroDataFim}
            onChange={(e) => setFiltroDataFim(e.target.value)}
            className="w-44 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <Table headers={['Tipo', 'Produto / Etiqueta', 'Valor Unit.', 'Destino', 'Responsável', 'Data', ...(isAdmin ? [''] : [])]} empty={movimentacoesFiltradas.length === 0} sort={sort} onSort={alternarOrdenacao}>
        {movimentacoesFiltradas.map(m => (
          <tr key={m.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${m.cancelado ? 'opacity-40' : ''}`}>
            <td className="px-4 py-3">
              <div className="flex flex-col gap-1">
                {m.tipo === 'ENTRADA'
                  ? <Badge variant="success"><ArrowDownCircle className="w-3 h-3 mr-1" />Entrada</Badge>
                  : m.subtipo === 'DESCARTE'
                    ? <Badge variant="danger"><Trash2 className="w-3 h-3 mr-1" />Descarte</Badge>
                    : <Badge variant="warning"><ArrowUpCircle className="w-3 h-3 mr-1" />Saída</Badge>}
                {m.cancelado && <Badge variant="default">Cancelada</Badge>}
              </div>
            </td>
            <td className="px-4 py-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{m.unidade?.produto?.nome ?? '—'}</p>
              <p className="text-xs text-gray-400 font-mono">{m.unidade?.etiqueta ?? '—'}</p>
            </td>
            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{formatMoeda(m.valorUnitario)}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
              {m.tipo === 'ENTRADA' ? (m.fornecedor?.nome ?? '—')
                : m.subtipo === 'DESCARTE' ? <span className="text-red-500 text-xs font-medium">Descartado</span>
                : (m.setor?.nome ?? '—')}
            </td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{m.responsavel ?? m.usuario?.nome ?? '—'}</td>
            <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDataHora(m.data)}</td>
            {isAdmin && (
              <td className="px-4 py-3">
                {!m.cancelado && (
                  <button onClick={() => setCancelandoId(m.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                    title="Cancelar movimentação">
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </td>
            )}
          </tr>
        ))}
      </Table>

      <Modal open={!!cancelandoId} onClose={() => setCancelandoId(null)} title="Cancelar movimentação">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Deseja cancelar esta movimentação?</p>
        <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 mb-6">
          ⚠️ A unidade será reativada no estoque automaticamente.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setCancelandoId(null)}>Voltar</Button>
          <Button variant="danger" loading={cancelando} onClick={cancelar}>Confirmar cancelamento</Button>
        </div>
      </Modal>
    </div>
  )
}
