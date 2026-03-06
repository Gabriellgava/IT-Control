'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Search, Plus, ExternalLink, Edit2, Trash2, AlertTriangle,
  ChevronUp, ChevronDown, Download, Filter, RefreshCw
} from 'lucide-react'
import { Button, Badge, Table, Input, Select, Modal } from '@/components/ui'
import { formatCurrency, formatDate, isLowStock, exportToCSV } from '@/lib/utils'
import type { Asset, Supplier } from '@/types'
import { AssetForm } from './AssetForm'

type SortField = 'name' | 'code' | 'quantity' | 'unitValue' | 'createdAt'
type SortDir = 'asc' | 'desc'

export function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSupplier, setFilterSupplier] = useState('')
  const [filterLow, setFilterLow] = useState(false)
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)
  const [editAsset, setEditAsset] = useState<Asset | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const PER_PAGE = 10

  const fetchAssets = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filterSupplier) params.set('supplierId', filterSupplier)
    if (filterLow) params.set('lowStock', 'true')
    const res = await fetch(`/api/assets?${params}`)
    const data = await res.json()
    setAssets(data)
    setPage(1)
    setLoading(false)
  }, [search, filterSupplier, filterLow])

  useEffect(() => {
    fetchAssets()
    fetch('/api/suppliers').then(r => r.json()).then(setSuppliers)
  }, [fetchAssets])

  const sorted = [...assets].sort((a, b) => {
    let av: string | number = a[sortField] as string | number ?? ''
    let bv: string | number = b[sortField] as string | number ?? ''
    if (sortDir === 'asc') return av > bv ? 1 : -1
    return av < bv ? 1 : -1
  })

  const total = sorted.length
  const pages = Math.ceil(total / PER_PAGE)
  const paginated = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await fetch(`/api/assets/${deleteId}`, { method: 'DELETE' })
    setDeleteId(null)
    fetchAssets()
  }

  const handleExport = () => {
    const data = assets.map(a => ({
      Nome: a.name,
      Código: a.code,
      Etiqueta: a.tag ?? '',
      Fornecedor: a.supplier?.name ?? '',
      'Valor Unitário': a.unitValue,
      Quantidade: a.quantity,
      'Estoque Mínimo': a.minStock,
      Status: isLowStock(a.quantity, a.minStock) ? 'Baixo' : 'OK',
      'Data Cadastro': formatDate(a.createdAt),
    }))
    exportToCSV(data, 'ativos-ti')
  }

  const SortIcon = ({ field }: { field: SortField }) => (
    sortField === field
      ? sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      : <ChevronDown className="w-3 h-3 opacity-30" />
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ativos de TI</h1>
          <p className="text-sm text-gray-500 mt-1">{total} produto{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExport}>CSV</Button>
          <Link href="/assets/new">
            <Button size="sm" icon={<Plus className="w-4 h-4" />}>Adicionar Ativo</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Buscar por nome, código ou etiqueta..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          icon={<Search className="w-4 h-4" />}
          className="sm:w-72"
        />
        <Select
          value={filterSupplier}
          onChange={e => setFilterSupplier(e.target.value)}
          className="sm:w-48"
        >
          <option value="">Todos fornecedores</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Button
          variant={filterLow ? 'danger' : 'secondary'}
          size="sm"
          icon={<AlertTriangle className="w-4 h-4" />}
          onClick={() => setFilterLow(v => !v)}
        >
          Estoque Baixo
        </Button>
        <Button variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={fetchAssets}>
          Atualizar
        </Button>
      </div>

      {/* Table */}
      <Table
        headers={['Produto', 'Código / Etiqueta', 'Fornecedor', 'Valor Unit.', 'Estoque', 'Status', 'Ações']}
        empty={paginated.length === 0}
      >
        {paginated.map(asset => {
          const low = isLowStock(asset.quantity, asset.minStock)
          return (
            <tr
              key={asset.id}
              className={`transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${low ? 'bg-red-50/50 dark:bg-red-900/5' : ''}`}
            >
              <td className="px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{asset.name}</p>
                  {asset.purchaseDate && (
                    <p className="text-xs text-gray-400">Compra: {formatDate(asset.purchaseDate)}</p>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <p className="text-sm font-mono text-gray-700 dark:text-gray-300">{asset.code}</p>
                {asset.tag && <p className="text-xs text-gray-400 font-mono">{asset.tag}</p>}
              </td>
              <td className="px-4 py-3">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{asset.supplier?.name ?? '—'}</p>
                  {asset.purchaseLink && (
                    <a
                      href={asset.purchaseLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-600 hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <ExternalLink className="w-3 h-3" /> Ver compra
                    </a>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                {formatCurrency(asset.unitValue)}
              </td>
              <td className="px-4 py-3">
                <p className={`text-sm font-bold ${low ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                  {asset.quantity}
                </p>
                <p className="text-xs text-gray-400">mín: {asset.minStock}</p>
              </td>
              <td className="px-4 py-3">
                {low ? (
                  <Badge variant="danger">
                    <AlertTriangle className="w-3 h-3 mr-1" /> Baixo
                  </Badge>
                ) : (
                  <Badge variant="success">OK</Badge>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditAsset(asset)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(asset.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          )
        })}
      </Table>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} de {total}
          </p>
          <div className="flex gap-1">
            {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg text-sm transition-colors ${
                  p === page
                    ? 'bg-brand-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editAsset && (
        <Modal open={!!editAsset} onClose={() => setEditAsset(null)} title="Editar Ativo">
          <AssetForm
            asset={editAsset}
            suppliers={suppliers}
            onSuccess={() => { setEditAsset(null); fetchAssets() }}
            onCancel={() => setEditAsset(null)}
          />
        </Modal>
      )}

      {/* Delete Confirm */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Confirmar exclusão">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Tem certeza que deseja excluir este ativo? Esta ação não pode ser desfeita e irá remover todo o histórico de movimentações.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete}>Excluir</Button>
        </div>
      </Modal>
    </div>
  )
}
