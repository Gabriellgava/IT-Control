'use client'

import { useEffect, useMemo, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge, Button, Input, Modal, Table } from '@/components/ui'
import { Smartphone, Search, Edit2 } from 'lucide-react'
import { FilterBar, TextFilter } from '@/components/ui/filters'

interface ItemSmartphone {
  id: string
  setor: string
  responsavel: string
  tipo: string
  marca: string
  modelo: string
  etiqueta: string
  numero?: string | null
  observacoes?: string | null
  produtoId?: string
  status?: string
}

const TIPOS_MOBILE = ['smartphone', 'smartphones', 'iphone', 'ipad']

export default function SmartphonesPage() {
  const [itens, setItens] = useState<ItemSmartphone[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [modalForm, setModalForm] = useState(false)
  const [editando, setEditando] = useState<ItemSmartphone | null>(null)
  const [loadingForm, setLoadingForm] = useState(false)
  const [erroForm, setErroForm] = useState('')
  const [form, setForm] = useState({ setor: '', responsavel: '', tipo: '', marca: '', modelo: '', etiqueta: '', numero: '', observacoes: '' })
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  useEffect(() => {
    carregar()
  }, [])

  const abrirEditar = (item: ItemSmartphone) => {
    setEditando(item)
    setForm({
      setor: item.setor,
      responsavel: item.responsavel,
      tipo: item.tipo,
      marca: item.marca,
      modelo: item.modelo,
      etiqueta: item.etiqueta,
      numero: item.numero ?? '',
      observacoes: item.observacoes ?? '',
    })
    setErroForm('')
    setModalForm(true)
  }

  const salvar = async () => {
    // Edição não suportada por enquanto - precisa de API específica
    setModalForm(false)
    setEditando(null)
    setLoadingForm(false)
  }

  const carregar = async () => {
    try {
      const res = await fetch('/api/produtos?limit=10000')
      const data = await res.json()
      const produtos = Array.isArray(data) ? data : (data.data || [])
      
      // Mapear unidades de produtos para o formato esperado
      const itensMapeados: ItemSmartphone[] = produtos
        .flatMap((produto: any) => 
          (produto.unidades || []).map((unidade: any) => ({
            id: unidade.id,
            setor: unidade.setorAtual || '',
            responsavel: unidade.localAtual || '',
            tipo: produto.categoria?.nome || '',
            marca: '',
            modelo: produto.nome || '',
            etiqueta: unidade.etiqueta || '',
            numero: null,
            observacoes: null,
            produtoId: produto.id,
            status: unidade.status,
          }))
        )
      
      setItens(itensMapeados)
    } catch (error) {
      console.error('Erro ao carregar smartphones:', error)
      setItens([])
    }
    setLoading(false)
  }

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

  const filtradosOrdenados = useMemo(() => {
    if (!sort) return filtrados

    const mapaCampos: Record<string, (i: ItemSmartphone) => string | number> = {
      Setor: (i) => i.setor,
      Responsável: (i) => i.responsavel,
      Tipo: (i) => i.tipo,
      'Marca / Modelo': (i) => `${i.marca} ${i.modelo}`,
      Etiqueta: (i) => i.etiqueta,
      'Número em uso': (i) => i.numero || '',
    }

    const selector = mapaCampos[sort.key]
    if (!selector) return filtrados

    return [...filtrados].sort((a, b) => {
      const aValor = selector(a)
      const bValor = selector(b)
      const comparacao = typeof aValor === 'number' && typeof bValor === 'number'
        ? aValor - bValor
        : String(aValor).localeCompare(String(bValor), 'pt-BR', { numeric: true, sensitivity: 'base' })
      return sort.direction === 'asc' ? comparacao : -comparacao
    })
  }, [filtrados, sort])

  const alternarOrdenacao = (header: string) => {
    setSort((atual) => {
      if (!atual || atual.key !== header) return { key: header, direction: 'asc' }
      return { key: header, direction: atual.direction === 'asc' ? 'desc' : 'asc' }
    })
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Smartphone className="w-6 h-6 text-blue-600" />
              Smartphones
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {filtrados.length} smartphone(s) ativo(s) no inventário
            </p>
          </div>
        </div>

        <FilterBar>
          <TextFilter label="Busca" value={busca} onChange={setBusca} placeholder="Buscar por responsavel, modelo, etiqueta ou numero..." className="flex-1 min-w-56" />
        </FilterBar>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <Table
            headers={['Setor', 'Responsável', 'Tipo', 'Marca / Modelo', 'Etiqueta', 'Número em uso', 'Ações']}
            empty={filtradosOrdenados.length === 0}
            sort={sort}
            onSort={alternarOrdenacao}
          >
            {filtradosOrdenados.map((item) => (
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
                <td className="px-4 py-3">
                  <Button variant="secondary" size="sm" onClick={() => abrirEditar(item)} icon={<Edit2 className="w-3.5 h-3.5" />}>
                    Editar
                  </Button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>
      <Modal open={modalForm} onClose={() => setModalForm(false)} title="Editar smartphone/tablet">
        <div className="space-y-4">
          <Input label="Setor" value={form.setor} onChange={(e) => setForm((prev) => ({ ...prev, setor: e.target.value }))} />
          <Input label="Responsável" value={form.responsavel} onChange={(e) => setForm((prev) => ({ ...prev, responsavel: e.target.value }))} />
          <Input label="Tipo" value={form.tipo} onChange={(e) => setForm((prev) => ({ ...prev, tipo: e.target.value }))} />
          <Input label="Marca" value={form.marca} onChange={(e) => setForm((prev) => ({ ...prev, marca: e.target.value }))} />
          <Input label="Modelo" value={form.modelo} onChange={(e) => setForm((prev) => ({ ...prev, modelo: e.target.value }))} />
          <Input label="Etiqueta" value={form.etiqueta} onChange={(e) => setForm((prev) => ({ ...prev, etiqueta: e.target.value }))} />
          <Input label="Número em uso" value={form.numero} onChange={(e) => setForm((prev) => ({ ...prev, numero: e.target.value }))} />
          <Input label="Observações" value={form.observacoes} onChange={(e) => setForm((prev) => ({ ...prev, observacoes: e.target.value }))} />
          {erroForm && <p className="text-sm text-red-500">{erroForm}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModalForm(false)}>Cancelar</Button>
            <Button onClick={salvar} loading={loadingForm}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}
