'use client'

import { useEffect, useMemo, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge, Input, Table } from '@/components/ui'
import { PackageSearch, Search } from 'lucide-react'

interface ItemInventario {
  id: string
  etiqueta: string
  marca: string
  modelo: string
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const carregar = async () => {
      try {
        const res = await fetch('/api/inventario')
        const data = await res.json()
        setItens(Array.isArray(data) ? data : [])
      } finally {
        setLoading(false)
      }
    }

    carregar()
  }, [])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return itens

    return itens.filter((item) =>
      [item.etiqueta, item.marca, item.modelo, item.responsavel, item.setor]
        .join(' ')
        .toLowerCase()
        .includes(termo),
    )
  }, [itens, busca])

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

        <div className="max-w-xl">
          <Input
            placeholder="Buscar por etiqueta, marca, modelo, responsável ou setor..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <Table headers={['Etiqueta', 'Marca', 'Modelo', 'Situação']} empty={filtrados.length === 0}>
            {filtrados.map((item) => {
              const emEstoque = estaEmEstoque(item)

              return (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-gray-700 dark:text-gray-300">{item.etiqueta}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.marca || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.modelo || '—'}</td>
                  <td className="px-4 py-3">
                    {emEstoque ? (
                      <Badge variant="warning">Em estoque</Badge>
                    ) : (
                      <Badge variant="success">Com {item.responsavel}</Badge>
                    )}
                  </td>
                </tr>
              )
            })}
          </Table>
        )}
      </div>
    </AppLayout>
  )
}
