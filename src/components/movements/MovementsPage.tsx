'use client'

import { useEffect, useState, useCallback } from 'react'
import { ArrowDownCircle, ArrowUpCircle, Download } from 'lucide-react'
import { Badge, Button, Table, Select } from '@/components/ui'
import { formatCurrency, formatDateTime, exportToCSV } from '@/lib/utils'
import type { Movimentacao } from '@/types'

export function MovementsPage() {
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('')

  const buscar = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filtroTipo) params.set('tipo', filtroTipo)
    params.set('limite', '200')
    const res = await fetch(`/api/movements?${params}`)
    const data = await res.json()
    setMovimentacoes(data)
    setLoading(false)
  }, [filtroTipo])

  useEffect(() => { buscar() }, [buscar])

  const handleExportar = () => {
    const dados = movimentacoes.map(m => ({
      Tipo: m.tipo === 'ENTRADA' ? 'Entrada' : 'Saída',
      Produto: m.ativo?.nome ?? '',
      Quantidade: m.quantidade,
      'Valor Unit.': m.valorUnitario,
      Total: m.quantidade * m.valorUnitario,
      Data: formatDateTime(m.data),
      Fornecedor: m.fornecedor?.nome ?? '',
      Setor: m.setor?.nome ?? '',
      Usuário: m.usuario?.nome ?? '',
      Responsável: m.responsavel ?? '',
      Observações: m.observacoes ?? '',
    }))
    exportToCSV(dados, 'movimentacoes-ti')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Movimentações</h1>
          <p className="text-sm text-gray-500 mt-1">Histórico completo de entradas e saídas</p>
        </div>
        <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExportar}>
          Exportar CSV
        </Button>
      </div>

      <div className="flex gap-3">
        <Select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="w-52">
          <option value="">Todas as movimentações</option>
          <option value="ENTRADA">Somente Entradas</option>
          <option value="SAIDA">Somente Saídas</option>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600" />
        </div>
      ) : (
        <Table
          headers={['Tipo', 'Produto', 'Qtd', 'Valor Unit.', 'Total', 'Data', 'Setor / Usuário', 'Obs.']}
          empty={movimentacoes.length === 0}
        >
          {movimentacoes.map(m => (
            <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {m.tipo === 'ENTRADA' ? (
                    <ArrowDownCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <ArrowUpCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  )}
                  <Badge variant={m.tipo === 'ENTRADA' ? 'success' : 'warning'}>
                    {m.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
                  </Badge>
                </div>
              </td>
              <td className="px-4 py-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{m.ativo?.nome}</p>
                <p className="text-xs text-gray-400 font-mono">{m.ativo?.codigo}</p>
              </td>
              <td className="px-4 py-3">
                <span className={`text-sm font-bold ${m.tipo === 'ENTRADA' ? 'text-green-600' : 'text-amber-600'}`}>
                  {m.tipo === 'ENTRADA' ? '+' : '-'}{m.quantidade}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                {formatCurrency(m.valorUnitario)}
              </td>
              <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                {formatCurrency(m.quantidade * m.valorUnitario)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                {formatDateTime(m.data)}
              </td>
              <td className="px-4 py-3">
                {m.tipo === 'SAIDA' ? (
                  <div>
                    {m.setor && <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{m.setor.nome}</p>}
                    {m.usuario && <p className="text-xs text-gray-400">{m.usuario.nome}</p>}
                    {m.responsavel && !m.usuario && <p className="text-xs text-gray-400">{m.responsavel}</p>}
                  </div>
                ) : (
                  <div>
                    {m.fornecedor && <p className="text-xs text-gray-600 dark:text-gray-400">{m.fornecedor.nome}</p>}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-gray-400 max-w-32 truncate">{m.observacoes ?? '—'}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  )
}
