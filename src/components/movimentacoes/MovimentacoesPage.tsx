'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { ArrowDownCircle, ArrowUpCircle, Download, XCircle } from 'lucide-react'
import { Button, Badge, Table, Select, Modal } from '@/components/ui'
import { formatMoeda, formatDataHora, exportarCSV } from '@/lib/utils'
import type { Movimentacao, Ativo } from '@/types'

export function MovimentacoesPage() {
  const { data: session } = useSession()
  const [movs, setMovs] = useState<Movimentacao[]>([])
  const [ativos, setAtivos] = useState<Ativo[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState('')
  const [cancelandoId, setCancelandoId] = useState<string | null>(null)
  const [cancelando, setCancelando] = useState(false)
  const isAdmin = session?.user.perfil === 'admin'

  const buscar = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (filtroTipo) p.set('tipo', filtroTipo)
    if (filtroAtivo) p.set('ativoId', filtroAtivo)
    const res = await fetch(`/api/movimentacoes?${p}`)
    setMovs(await res.json()); setLoading(false)
  }, [filtroTipo, filtroAtivo])

  useEffect(() => { buscar(); fetch('/api/ativos').then(r => r.json()).then(setAtivos) }, [buscar])

  const cancelar = async () => {
    if (!cancelandoId) return
    setCancelando(true)
    await fetch(`/api/movimentacoes/${cancelandoId}`, { method: 'DELETE' })
    setCancelando(false); setCancelandoId(null); buscar()
  }

  const exportar = () => exportarCSV(movs.filter(m => !m.cancelado).map(m => ({
    Tipo: m.tipo, Produto: m.ativo?.nome ?? '', Código: m.ativo?.codigo ?? '',
    Quantidade: m.quantidade, 'Valor Unitário': m.valorUnitario,
    Fornecedor: m.fornecedor?.nome ?? '', Setor: m.setor?.nome ?? '',
    Responsável: m.responsavel ?? '', Data: formatDataHora(m.data), Observações: m.observacoes ?? '',
  })), 'movimentacoes-ti')

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Movimentações</h1>
          <p className="text-sm text-gray-500 mt-1">{movs.filter(m => !m.cancelado).length} registro{movs.filter(m => !m.cancelado).length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} onClick={exportar}>CSV</Button>
          <Link href="/movimentacoes/entrada"><Button size="sm" icon={<ArrowDownCircle className="w-4 h-4" />} variant="secondary">Entrada</Button></Link>
          <Link href="/movimentacoes/saida"><Button size="sm" icon={<ArrowUpCircle className="w-4 h-4" />}>Saída</Button></Link>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="w-44">
          <option value="">Todos os tipos</option>
          <option value="ENTRADA">Entradas</option>
          <option value="SAIDA">Saídas</option>
        </Select>
        <Select value={filtroAtivo} onChange={e => setFiltroAtivo(e.target.value)} className="w-60">
          <option value="">Todos os produtos</option>
          {ativos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </Select>
      </div>

      <Table headers={['Tipo', 'Produto', 'Qtd', 'Valor Unit.', 'Fornecedor / Setor', 'Responsável', 'Data', ...(isAdmin ? [''] : [])]} empty={movs.length === 0}>
        {movs.map(m => (
          <tr key={m.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${m.cancelado ? 'opacity-40' : ''}`}>
            <td className="px-4 py-3">
              <div className="flex flex-col gap-1">
                {m.tipo === 'ENTRADA'
                  ? <Badge variant="success"><ArrowDownCircle className="w-3 h-3 mr-1" />Entrada</Badge>
                  : <Badge variant="warning"><ArrowUpCircle className="w-3 h-3 mr-1" />Saída</Badge>}
                {m.cancelado && <Badge variant="error">Cancelada</Badge>}
              </div>
            </td>
            <td className="px-4 py-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{m.ativo?.nome ?? '(deletado)'}</p>
              <p className="text-xs text-gray-400 font-mono">{m.ativo?.codigo}</p>
            </td>
            <td className="px-4 py-3">
              <span className={`text-sm font-bold ${m.tipo === 'ENTRADA' ? 'text-green-600' : 'text-amber-600'}`}>{m.tipo === 'ENTRADA' ? '+' : '-'}{m.quantidade}</span>
            </td>
            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{formatMoeda(m.valorUnitario)}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{m.tipo === 'ENTRADA' ? (m.fornecedor?.nome ?? '—') : (m.setor?.nome ?? '—')}</td>
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
          ⚠️ A quantidade será estornada no estoque automaticamente.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setCancelandoId(null)}>Voltar</Button>
          <Button variant="danger" loading={cancelando} onClick={cancelar}>Confirmar cancelamento</Button>
        </div>
      </Modal>
    </div>
  )
}
