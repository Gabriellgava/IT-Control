'use client'

import { useEffect, useState, useCallback } from 'react'
import { ArrowDownCircle, ArrowUpCircle, Download } from 'lucide-react'
import { Badge, Button, Table, Select } from '@/components/ui'
import { formatCurrency, formatDateTime, exportToCSV } from '@/lib/utils'
import type { Movement } from '@/types'

export function MovementsPage() {
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('')

  const fetch_ = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (typeFilter) params.set('type', typeFilter)
    params.set('limit', '200')
    const res = await fetch(`/api/movements?${params}`)
    const data = await res.json()
    setMovements(data)
    setLoading(false)
  }, [typeFilter])

  useEffect(() => { fetch_() }, [fetch_])

  const handleExport = () => {
    const data = movements.map(m => ({
      Tipo: m.type === 'IN' ? 'Entrada' : 'Saída',
      Produto: m.asset?.name ?? '',
      Quantidade: m.quantity,
      'Valor Unit.': m.unitValue,
      'Total': m.quantity * m.unitValue,
      Data: formatDateTime(m.date),
      Fornecedor: m.supplier?.name ?? '',
      Setor: m.sector?.name ?? '',
      Usuário: m.user?.name ?? '',
      Responsável: m.responsible ?? '',
      Observações: m.notes ?? '',
    }))
    exportToCSV(data, 'movimentacoes-ti')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Movimentações</h1>
          <p className="text-sm text-gray-500 mt-1">Histórico completo de entradas e saídas</p>
        </div>
        <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExport}>
          Exportar CSV
        </Button>
      </div>

      <div className="flex gap-3">
        <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-48">
          <option value="">Todas movimentações</option>
          <option value="IN">Somente Entradas</option>
          <option value="OUT">Somente Saídas</option>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600" />
        </div>
      ) : (
        <Table
          headers={['Tipo', 'Produto', 'Qtd', 'Valor Unit.', 'Total', 'Data', 'Setor / Usuário', 'Obs.']}
          empty={movements.length === 0}
        >
          {movements.map(m => (
            <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {m.type === 'IN' ? (
                    <ArrowDownCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <ArrowUpCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  )}
                  <Badge variant={m.type === 'IN' ? 'success' : 'warning'}>
                    {m.type === 'IN' ? 'Entrada' : 'Saída'}
                  </Badge>
                </div>
              </td>
              <td className="px-4 py-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{m.asset?.name}</p>
                <p className="text-xs text-gray-400 font-mono">{m.asset?.code}</p>
              </td>
              <td className="px-4 py-3">
                <span className={`text-sm font-bold ${m.type === 'IN' ? 'text-green-600' : 'text-amber-600'}`}>
                  {m.type === 'IN' ? '+' : '-'}{m.quantity}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                {formatCurrency(m.unitValue)}
              </td>
              <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                {formatCurrency(m.quantity * m.unitValue)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                {formatDateTime(m.date)}
              </td>
              <td className="px-4 py-3">
                {m.type === 'OUT' ? (
                  <div>
                    {m.sector && <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{m.sector.name}</p>}
                    {m.user && <p className="text-xs text-gray-400">{m.user.name}</p>}
                    {m.responsible && !m.user && <p className="text-xs text-gray-400">{m.responsible}</p>}
                  </div>
                ) : (
                  <div>
                    {m.supplier && <p className="text-xs text-gray-600 dark:text-gray-400">{m.supplier.name}</p>}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-gray-400 max-w-32 truncate">{m.notes ?? '—'}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  )
}
