'use client'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { ArrowDownCircle, ArrowUpCircle, Download, FileText, XCircle, Trash2 } from 'lucide-react'
import { Button, Badge, Table, Select, Modal, LoadingState, ErrorState, PageHeader, Pagination, Input } from '@/components/ui'
import { formatMoeda, formatDataHora, exportarCSV } from '@/lib/utils'
import { fetchCachedList } from '@/lib/http/fetch-cached-list'
import type { Movimentacao, Produto } from '@/types'
import { DateRangeFilter, FilterBar, SelectFilter, TextFilter } from '@/components/ui/filters'

export function MovimentacoesPage() {
  const { data: session } = useSession()
  const [movs, setMovs] = useState<Movimentacao[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [opcoesResponsaveis, setOpcoesResponsaveis] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroProduto, setFiltroProduto] = useState('')
  const [filtroResponsavel, setFiltroResponsavel] = useState('')
  const [filtroEtiqueta, setFiltroEtiqueta] = useState('')
  const [filtroEtiquetaDebounced, setFiltroEtiquetaDebounced] = useState('')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const [cancelandoId, setCancelandoId] = useState<string | null>(null)
  const [cancelando, setCancelando] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<{ page: number; limit: number; total: number; totalPages: number } | null>(null)
  const debounceRef = useRef<NodeJS.Timeout>()
  const isAdmin = session?.user.perfil === 'admin'

  const buscar = useCallback(async () => {
    setLoading(true)
    setError('')
    const p = new URLSearchParams()
    if (filtroTipo) p.set('tipo', filtroTipo)
    if (filtroProduto) p.set('produtoId', filtroProduto)
    if (filtroResponsavel) p.set('responsavel', filtroResponsavel)
    if (filtroEtiquetaDebounced) p.set('etiqueta', filtroEtiquetaDebounced)
    if (filtroDataInicio) p.set('dataInicio', filtroDataInicio)
    if (filtroDataFim) p.set('dataFim', filtroDataFim)

    // Se houver ordenação, buscar todos os itens para ordenar localmente
    if (sort) {
      p.set('limit', '10000')
    } else {
      p.set('page', currentPage.toString())
      p.set('limit', '50')
    }

    try {
      const res = await fetch(`/api/movimentacoes?${p}`)
      if (!res.ok) throw new Error('Não foi possível carregar movimentações.')
      const data = await res.json()
      setMovs(data.data || data)
      setPagination(data.pagination || null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro inesperado ao carregar movimentações.')
    } finally {
      setLoading(false)
    }
  }, [filtroTipo, filtroProduto, filtroResponsavel, filtroEtiquetaDebounced, filtroDataInicio, filtroDataFim, currentPage, sort])

  useEffect(() => {
    setCurrentPage(1)
  }, [filtroTipo, filtroProduto, filtroResponsavel, filtroEtiqueta, filtroDataInicio, filtroDataFim])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setFiltroEtiquetaDebounced(filtroEtiqueta)
    }, 500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [filtroEtiqueta])

  useEffect(() => {
    buscar()
  }, [buscar])

  useEffect(() => {
    fetchCachedList<Produto>('/api/produtos?limit=10000')
      .then(setProdutos)
      .catch(() => setProdutos([]))
  }, [])

  useEffect(() => {
    fetch("/api/movimentacoes/filtros")
      .then(r => r.ok ? r.json() : { responsaveis: [] })
      .then(data => setOpcoesResponsaveis(Array.isArray(data.responsaveis) ? data.responsaveis : []))
      .catch(() => setOpcoesResponsaveis([]))
  }, [])

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

  const gerarRelatorioPDF = () => {
    const registros = movimentacoesFiltradas.filter((m) => !m.cancelado)

    const filtrosAtivos = [
      filtroTipo ? `Tipo: ${filtroTipo}` : 'Tipo: Todos',
      filtroProduto
        ? `Produto: ${produtos.find((p) => p.id === filtroProduto)?.nome ?? 'Selecionado'}`
        : 'Produto: Todos',
      filtroResponsavel.trim() ? `Responsável: ${filtroResponsavel.trim()}` : 'Responsável: Todos',
      filtroEtiqueta.trim() ? `Etiqueta: ${filtroEtiqueta.trim()}` : 'Etiqueta: Todas',
      filtroDataInicio ? `Período de: ${filtroDataInicio}` : 'Período de: Início',
      filtroDataFim ? `Período até: ${filtroDataFim}` : 'Período até: Hoje',
    ]

    const linhas = registros.map((m) => `
      <tr>
        <td>${m.tipo === 'ENTRADA' ? 'Entrada' : m.subtipo === 'DESCARTE' ? 'Descarte' : 'Saída'}</td>
        <td>${m.unidade?.produto?.nome ?? '—'} / ${m.unidade?.etiqueta ?? '—'}</td>
        <td>${formatMoeda(m.valorUnitario)}</td>
        <td>${m.tipo === 'ENTRADA' ? (m.fornecedor?.nome ?? '—') : m.subtipo === 'DESCARTE' ? 'Descartado' : (m.setor?.nome ?? '—')}</td>
        <td>${m.responsavel ?? m.usuario?.nome ?? '—'}</td>
        <td>${formatDataHora(m.data)}</td>
      </tr>
    `).join('')

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Relatório de Movimentações</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
          h1 { margin: 0 0 4px; font-size: 20px; }
          p { margin: 0 0 12px; color: #4b5563; }
          .filtros { margin-bottom: 16px; font-size: 12px; display: grid; gap: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
          th { background: #f3f4f6; }
          .rodape { margin-top: 12px; font-size: 11px; color: #6b7280; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <h1>Relatório de Movimentações</h1>
        <p>Total de registros: ${registros.length}</p>
        <div class="filtros">${filtrosAtivos.map((f) => `<span>${f}</span>`).join('')}</div>
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Produto / Etiqueta</th>
              <th>Valor Unit.</th>
              <th>Destino</th>
              <th>Responsável</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>${linhas || '<tr><td colspan="6">Nenhum registro para os filtros selecionados.</td></tr>'}</tbody>
        </table>
        <div class="rodape">Gerado em ${formatDataHora(new Date())}</div>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank', 'width=1200,height=900')
    if (!printWindow) return

    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const movimentacoesFiltradas = useMemo(() => {
    // Se não há ordenação, a API já fez a paginação e filtros, retorna os dados como estão
    if (!sort) return movs

    // Se há ordenação, busca todos os itens e aplica filtros localmente
    const responsavelBusca = filtroResponsavel.trim().toLowerCase()
    const etiquetaBusca = filtroEtiqueta.trim().toLowerCase()

    const inicio = filtroDataInicio ? new Date(`${filtroDataInicio}T00:00:00`) : null
    const fim = filtroDataFim ? new Date(`${filtroDataFim}T23:59:59.999`) : null

    const dadosFiltrados = movs.filter((m) => {
      const responsavel = (m.responsavel ?? m.usuario?.nome ?? '').toLowerCase()
      const atendeResponsavel = !responsavelBusca || responsavel === responsavelBusca

      const etiqueta = (m.unidade?.etiqueta ?? '').toLowerCase()
      const atendeEtiqueta = !etiquetaBusca || etiqueta.includes(etiquetaBusca)

      const dataMovimentacao = new Date(m.data)
      const atendeInicio = !inicio || dataMovimentacao >= inicio
      const atendeFim = !fim || dataMovimentacao <= fim

      return atendeResponsavel && atendeEtiqueta && atendeInicio && atendeFim
    })

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
  }, [movs, filtroResponsavel, filtroEtiqueta, filtroDataInicio, filtroDataFim, sort])

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
        description={`${pagination?.total || movs.filter(m => !m.cancelado).length} registro${(pagination?.total || movs.filter(m => !m.cancelado).length) !== 1 ? 's' : ''}`}
        actions={
          <>
            <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} onClick={exportar}>CSV</Button>
            <Button variant="secondary" size="sm" icon={<FileText className="w-4 h-4" />} onClick={gerarRelatorioPDF}>PDF</Button>
            <Link href="/movimentacoes/entrada"><Button size="sm" icon={<ArrowDownCircle className="w-4 h-4" />} variant="secondary">Entrada</Button></Link>
            <Link href="/movimentacoes/saida"><Button size="sm" icon={<ArrowUpCircle className="w-4 h-4" />}>Saída</Button></Link>
          </>
        }
      />

      {error && <ErrorState message={error} />}

      <FilterBar>
        <SelectFilter label="Tipo" value={filtroTipo} onChange={setFiltroTipo} allLabel="Todos os tipos" options={[
          { value: 'ENTRADA', label: 'Entradas' },
          { value: 'SAIDA', label: 'Saídas' },
        ]} />
        <SelectFilter label="Produto" value={filtroProduto} onChange={setFiltroProduto} allLabel="Todos os produtos" options={produtos.map((produto) => ({ value: produto.id, label: produto.nome }))} />
        <SelectFilter label="Responsável" value={filtroResponsavel} onChange={setFiltroResponsavel} allLabel="Todos os responsáveis" options={opcoesResponsaveis.map((nome) => ({ value: nome, label: nome }))} />
        <TextFilter label="Etiqueta" value={filtroEtiqueta} onChange={setFiltroEtiqueta} placeholder="Filtrar por etiqueta" />
        <DateRangeFilter startDate={filtroDataInicio} endDate={filtroDataFim} onStartDateChange={setFiltroDataInicio} onEndDateChange={setFiltroDataFim} />
      </FilterBar>

      <Table headers={['Tipo', 'Produto / Etiqueta', 'Valor Unit.', 'Destino', 'Responsável', 'Usuário', 'Data', ...(isAdmin ? [''] : [])]} empty={movimentacoesFiltradas.length === 0} sort={sort} onSort={alternarOrdenacao}>
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
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{m.responsavel ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{m.usuario?.nome ?? m.usuario?.email ?? '—'}</td>
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

      {pagination && (
        <Pagination
          currentPage={currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.total}
          itemsPerPage={pagination.limit}
          onPageChange={setCurrentPage}
        />
      )}

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
