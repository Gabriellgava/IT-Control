'use client'

import { useEffect, useMemo, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge, Input, Select, Table } from '@/components/ui'
import { PackageSearch, Search } from 'lucide-react'

interface ItemInventario {
  id: string
  tipo: string
  etiqueta: string
  marca: string
  modelo: string
  numero?: string | null
  observacoes?: string | null
  responsavel: string
  setor: string
}

const estaEmEstoque = (item: ItemInventario) => {
  const responsavel = (item.responsavel || '').toLowerCase()
  const setor = (item.setor || '').toLowerCase()

  return !item.responsavel.trim() || responsavel.includes('estoque') || setor.includes('estoque')
}

export default function ConsultaProdutosPage() {
  const [itens, setItens] = useState<ItemInventario[]>([])
  const [busca, setBusca] = useState('')
  const [filtroSituacao, setFiltroSituacao] = useState<'todos' | 'estoque' | 'alocados'>('todos')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const carregar = async () => {
      try {
        const res = await fetch('/api/inventario', { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok) {
          setItens([])
          return
        }

        setItens(Array.isArray(data) ? data : [])
      } finally {
        setLoading(false)
      }
    }

    carregar()
  }, [])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    let resultado = itens

    if (filtroSituacao === 'estoque') {
      resultado = resultado.filter(estaEmEstoque)
    } else if (filtroSituacao === 'alocados') {
      resultado = resultado.filter((item) => !estaEmEstoque(item))
    }

    if (!termo) return resultado

    return resultado.filter((item) =>
      [item.etiqueta, item.marca, item.modelo, item.tipo, item.numero, item.observacoes, item.responsavel, item.setor]
        .join(' ')
        .toLowerCase()
        .includes(termo),
    )
  }, [itens, busca, filtroSituacao])

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <PackageSearch className="w-6 h-6 text-blue-600" />
            Consulta de Produtos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtrados.length} item(ns) listado(s) com etiqueta, marca, modelo e localização atual.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2">
            <Input
              label="Busca"
              placeholder="Buscar por etiqueta, marca, modelo, responsável ou setor..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          <Select
            label="Situação"
            value={filtroSituacao}
            onChange={(e) => setFiltroSituacao(e.target.value as 'todos' | 'estoque' | 'alocados')}
          >
            <option value="todos">Todas as situações</option>
            <option value="estoque">Em estoque</option>
            <option value="alocados">Com responsável</option>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <Table headers={['Etiqueta', 'Tipo', 'Marca', 'Modelo', 'Número', 'Responsável', 'Setor', 'Situação', 'Observações']} empty={filtrados.length === 0}>
            {filtrados.map((item) => {
              const emEstoque = estaEmEstoque(item)

              return (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-gray-700 dark:text-gray-300">{item.etiqueta}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.tipo || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.marca || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.modelo || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.numero || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.responsavel || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.setor || '—'}</td>
                  <td className="px-4 py-3">
                    {emEstoque ? (
                      <Badge variant="warning">Em estoque</Badge>
                    ) : (
                      <Badge variant="success">Com {item.responsavel}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.observacoes || '—'}</td>
                </tr>
              )
            })}
          </Table>
        )}
      </div>
    </AppLayout>
  )
}
