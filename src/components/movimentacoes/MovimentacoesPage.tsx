'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ArrowDownCircle, ArrowUpCircle, Download } from 'lucide-react'
import { Button, Badge, Table, Select } from '@/components/ui'
import { formatMoeda, formatDataHora, exportarCSV } from '@/lib/utils'
import type { Movimentacao, Ativo } from '@/types'

export function MovimentacoesPage() {
  const [movs, setMovs] = useState<Movimentacao[]>([])
  const [ativos, setAtivos] = useState<Ativo[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState('')

  const buscar = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (filtroTipo) p.set('tipo', filtroTipo)
    if (filtroAtivo) p.set('ativoId', filtroAtivo)
    const res = await fetch(`/api/movimentacoes?${p}`)
    setMovs(await res.json()); setLoading(false)
  }, [filtroTipo, filtroAtivo])

  useEffect(() => { buscar(); fetch('/api/ativos').then(r => r.json()).then(setAtivos) }, [buscar])

  const exportar = () => exportarCSV(movs.map(m => ({
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
          <p className="text-sm text-gray-500 mt-1">{movs.length} registro{movs.length !== 1 ? 's' : ''}</p>
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

      <Table headers={['Tipo', 'Produto', 'Qtd', 'Valor Unit.', 'Fornecedor / Setor', 'Responsável', 'Data']} empty={movs.length === 0}>
        {movs.map(m => (
          <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <td className="px-4 py-3">
              {m.tipo === 'ENTRADA'
                ? <Badge variant="success"><ArrowDownCircle className="w-3 h-3 mr-1" />Entrada</Badge>
                : <Badge variant="warning"><ArrowUpCircle className="w-3 h-3 mr-1" />Saída</Badge>}
            </td>
            <td className="px-4 py-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{m.ativo?.nome}</p>
              <p className="text-xs text-gray-400 font-mono">{m.ativo?.codigo}</p>
            </td>
            <td className="px-4 py-3">
              <span className={`text-sm font-bold ${m.tipo === 'ENTRADA' ? 'text-green-600' : 'text-amber-600'}`}>{m.tipo === 'ENTRADA' ? '+' : '-'}{m.quantidade}</span>
            </td>
            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{formatMoeda(m.valorUnitario)}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{m.tipo === 'ENTRADA' ? (m.fornecedor?.nome ?? '—') : (m.setor?.nome ?? '—')}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{m.responsavel ?? m.usuario?.nome ?? '—'}</td>
            <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDataHora(m.data)}</td>
          </tr>
        ))}
      </Table>
    </div>
  )
}
