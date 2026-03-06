'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Search, Plus, ExternalLink, Edit2, Trash2, AlertTriangle,
  Download, RefreshCw
} from 'lucide-react'
import { Button, Badge, Table, Input, Select, Modal } from '@/components/ui'
import { formatCurrency, formatDate, isLowStock, exportToCSV } from '@/lib/utils'
import type { Ativo, Fornecedor } from '@/types'
import { AssetForm } from './AssetForm'

export function AssetsPage() {
  const [ativos, setAtivos] = useState<Ativo[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroFornecedor, setFiltroFornecedor] = useState('')
  const [filtroBaixo, setFiltroBaixo] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [editando, setEditando] = useState<Ativo | null>(null)
  const [deletandoId, setDeletandoId] = useState<string | null>(null)
  const POR_PAGINA = 10

  const buscarAtivos = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (busca) params.set('search', busca)
    if (filtroFornecedor) params.set('fornecedorId', filtroFornecedor)
    if (filtroBaixo) params.set('estoqueBaixo', 'true')
    const res = await fetch(`/api/assets?${params}`)
    const data = await res.json()
    setAtivos(data)
    setPagina(1)
    setLoading(false)
  }, [busca, filtroFornecedor, filtroBaixo])

  useEffect(() => {
    buscarAtivos()
    fetch('/api/suppliers').then(r => r.json()).then(setFornecedores)
  }, [buscarAtivos])

  const total = ativos.length
  const totalPaginas = Math.ceil(total / POR_PAGINA)
  const paginados = ativos.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  const handleDeletar = async () => {
    if (!deletandoId) return
    await fetch(`/api/assets/${deletandoId}`, { method: 'DELETE' })
    setDeletandoId(null)
    buscarAtivos()
  }

  const handleExportar = () => {
    const dados = ativos.map(a => ({
      Nome: a.nome,
      Código: a.codigo,
      Etiqueta: a.etiqueta ?? '',
      Fornecedor: a.fornecedor?.nome ?? '',
      'Valor Unitário': a.valorUnitario,
      Quantidade: a.quantidade,
      'Estoque Mínimo': a.estoqueMinimo,
      Status: isLowStock(a.quantidade, a.estoqueMinimo) ? 'Baixo' : 'OK',
      'Data Cadastro': formatDate(a.criadoEm),
    }))
    exportToCSV(dados, 'ativos-ti')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ativos de TI</h1>
          <p className="text-sm text-gray-500 mt-1">{total} produto{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExportar}>CSV</Button>
          <Link href="/assets/new">
            <Button size="sm" icon={<Plus className="w-4 h-4" />}>Adicionar Ativo</Button>
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Buscar por nome, código ou etiqueta..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          icon={<Search className="w-4 h-4" />}
          className="sm:w-72"
        />
        <Select value={filtroFornecedor} onChange={e => setFiltroFornecedor(e.target.value)} className="sm:w-48">
          <option value="">Todos fornecedores</option>
          {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </Select>
        <Button
          variant={filtroBaixo ? 'danger' : 'secondary'}
          size="sm"
          icon={<AlertTriangle className="w-4 h-4" />}
          onClick={() => setFiltroBaixo(v => !v)}
        >
          Estoque Baixo
        </Button>
        <Button variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={buscarAtivos}>
          Atualizar
        </Button>
      </div>

      {/* Tabela */}
      <Table
        headers={['Produto', 'Código / Etiqueta', 'Fornecedor', 'Valor Unit.', 'Estoque', 'Status', 'Ações']}
        empty={paginados.length === 0}
      >
        {paginados.map(ativo => {
          const baixo = isLowStock(ativo.quantidade, ativo.estoqueMinimo)
          return (
            <tr
              key={ativo.id}
              className={`transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${baixo ? 'bg-red-50/50 dark:bg-red-900/5' : ''}`}
            >
              <td className="px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{ativo.nome}</p>
                  {ativo.dataCompra && (
                    <p className="text-xs text-gray-400">Compra: {formatDate(ativo.dataCompra)}</p>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <p className="text-sm font-mono text-gray-700 dark:text-gray-300">{ativo.codigo}</p>
                {ativo.etiqueta && <p className="text-xs text-gray-400 font-mono">{ativo.etiqueta}</p>}
              </td>
              <td className="px-4 py-3">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{ativo.fornecedor?.nome ?? '—'}</p>
                  {ativo.linkCompra && (
                    <a href={ativo.linkCompra} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-brand-600 hover:underline flex items-center gap-1 mt-0.5">
                      <ExternalLink className="w-3 h-3" /> Ver compra
                    </a>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                {formatCurrency(ativo.valorUnitario)}
              </td>
              <td className="px-4 py-3">
                <p className={`text-sm font-bold ${baixo ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                  {ativo.quantidade}
                </p>
                <p className="text-xs text-gray-400">mín: {ativo.estoqueMinimo}</p>
              </td>
              <td className="px-4 py-3">
                {baixo ? (
                  <Badge variant="danger">
                    <AlertTriangle className="w-3 h-3 mr-1" /> Baixo
                  </Badge>
                ) : (
                  <Badge variant="success">OK</Badge>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditando(ativo)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 transition-colors" title="Editar">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeletandoId(ativo.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors" title="Excluir">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          )
        })}
      </Table>

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, total)} de {total}
          </p>
          <div className="flex gap-1">
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPagina(p)}
                className={`w-8 h-8 rounded-lg text-sm transition-colors ${p === pagina ? 'bg-brand-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {editando && (
        <Modal open={!!editando} onClose={() => setEditando(null)} title="Editar Ativo">
          <AssetForm ativo={editando} fornecedores={fornecedores} onSuccess={() => { setEditando(null); buscarAtivos() }} onCancel={() => setEditando(null)} />
        </Modal>
      )}

      {/* Confirmar exclusão */}
      <Modal open={!!deletandoId} onClose={() => setDeletandoId(null)} title="Confirmar exclusão">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Tem certeza que deseja excluir este ativo? Esta ação não pode ser desfeita e irá remover todo o histórico de movimentações.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setDeletandoId(null)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDeletar}>Excluir</Button>
        </div>
      </Modal>
    </div>
  )
}
