'use client'

import { useEffect, useMemo, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge, Button, Input, Modal, Table } from '@/components/ui'
import { Smartphone, Search, Edit2 } from 'lucide-react'

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
}

const TIPOS_MOBILE = ['celular', 'smartphone', 'tablet']

export default function SmartphonesPage() {
  const [itens, setItens] = useState<ItemSmartphone[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [modalForm, setModalForm] = useState(false)
  const [editando, setEditando] = useState<ItemSmartphone | null>(null)
  const [loadingForm, setLoadingForm] = useState(false)
  const [erroForm, setErroForm] = useState('')
  const [form, setForm] = useState({ setor: '', responsavel: '', tipo: '', marca: '', modelo: '', etiqueta: '', numero: '', observacoes: '' })

  useEffect(() => {
    const carregar = async () => {
      const res = await fetch('/api/inventario')
      const data = await res.json()
      setItens(Array.isArray(data) ? data : [])
      setLoading(false)
    }
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
    if (!editando) return
    setLoadingForm(true)
    setErroForm('')
    const res = await fetch(`/api/inventario/${editando.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) {
      setErroForm(data?.error || 'Erro ao salvar alterações')
      setLoadingForm(false)
      return
    }
    setItens((prev) => prev.map((item) => (item.id === editando.id ? { ...item, ...form } : item)))
    setModalForm(false)
    setEditando(null)
    setLoadingForm(false)
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
            headers={['Setor', 'Responsável', 'Tipo', 'Marca / Modelo', 'Etiqueta', 'Número em uso', 'Ações']}
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
