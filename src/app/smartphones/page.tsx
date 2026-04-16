'use client'

import { useEffect, useMemo, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge, Input, Table } from '@/components/ui'
import { Smartphone, Search } from 'lucide-react'

interface ItemSmartphone {
  id: string
  setor: string
  responsavel: string
  tipo: string
  marca: string
  modelo: string
  etiqueta: string
  numero?: string | null
}

const TIPOS_MOBILE = ['celular', 'smartphone', 'tablet']

export default function SmartphonesPage() {
  const [itens, setItens] = useState<ItemSmartphone[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    const carregar = async () => {
      const res = await fetch('/api/inventario')
      const data = await res.json()
      setItens(Array.isArray(data) ? data : [])
      setLoading(false)
    }
    carregar()
  }, [])

  const filtrados = useMemo(() => {
    const mobile = itens.filter((item) =>
      TIPOS_MOBILE.some((tipo) => item.tipo.toLowerCase().includes(tipo)),
    )
    if (!busca.trim()) return mobile
    const termo = busca.toLowerCase()
    return mobile.filter((item) =>
      [item.responsavel, item.modelo, item.marca, item.etiqueta, item.numero || '']
        .join(' ')
        .toLowerCase()
        .includes(termo),
    )
  }, [itens, busca])

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Smartphone className="w-6 h-6 text-blue-600" />
              Smartphones e Tablets
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {filtrados.length} dispositivo(s) móvel(is) ativo(s) no inventário
            </p>
          </div>
        </div>

        <div className="max-w-xl">
          <Input
            placeholder="Buscar por responsável, modelo, etiqueta ou número..."
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
          <Table
            headers={['Setor', 'Responsável', 'Tipo', 'Marca / Modelo', 'Etiqueta', 'Número em uso']}
            empty={filtrados.length === 0}
          >
            {filtrados.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3"><Badge variant="info">{item.setor}</Badge></td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.responsavel}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.tipo}</td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{item.marca}</p>
                  <p className="text-xs text-gray-400">{item.modelo}</p>
                </td>
                <td className="px-4 py-3"><span className="font-mono text-sm text-gray-700 dark:text-gray-300">{item.etiqueta}</span></td>
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{item.numero || 'Não informado'}</td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </AppLayout>
  )
}
