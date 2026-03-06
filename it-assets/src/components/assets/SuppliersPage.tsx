'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, ExternalLink } from 'lucide-react'
import { Button, Card, Table, Modal, Input, Badge } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import type { Supplier } from '@/types'

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', contact: '', email: '', phone: '', website: '' })

  const fetchSuppliers = async () => {
    setLoading(true)
    const res = await fetch('/api/suppliers')
    const data = await res.json()
    setSuppliers(data)
    setLoading(false)
  }

  useEffect(() => { fetchSuppliers() }, [])

  const openAdd = () => { setForm({ name: '', contact: '', email: '', phone: '', website: '' }); setModal('add') }
  const openEdit = (s: Supplier) => {
    setEditing(s)
    setForm({ name: s.name, contact: s.contact ?? '', email: s.email ?? '', phone: s.phone ?? '', website: s.website ?? '' })
    setModal('edit')
  }

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  const handleSave = async () => {
    const url = editing ? `/api/suppliers/${editing.id}` : '/api/suppliers'
    const method = editing ? 'PUT' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setModal(null); setEditing(null)
    fetchSuppliers()
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await fetch(`/api/suppliers/${deleteId}`, { method: 'DELETE' })
    setDeleteId(null)
    fetchSuppliers()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fornecedores</h1>
          <p className="text-sm text-gray-500 mt-1">{suppliers.length} fornecedor{suppliers.length !== 1 ? 'es' : ''} cadastrado{suppliers.length !== 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={openAdd}>Adicionar</Button>
      </div>

      <Table headers={['Fornecedor', 'Contato', 'E-mail / Telefone', 'Website', 'Cadastro', 'Ações']} empty={suppliers.length === 0}>
        {suppliers.map(s => (
          <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <td className="px-4 py-3">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{s.name}</p>
            </td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{s.contact ?? '—'}</td>
            <td className="px-4 py-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">{s.email ?? '—'}</p>
              <p className="text-xs text-gray-400">{s.phone ?? ''}</p>
            </td>
            <td className="px-4 py-3">
              {s.website ? (
                <a href={s.website} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> Visitar
                </a>
              ) : '—'}
            </td>
            <td className="px-4 py-3 text-xs text-gray-400">{formatDate(s.createdAt)}</td>
            <td className="px-4 py-3">
              <div className="flex gap-1">
                <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteId(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </Table>

      <Modal open={!!modal} onClose={() => { setModal(null); setEditing(null) }} title={modal === 'edit' ? 'Editar Fornecedor' : 'Novo Fornecedor'}>
        <div className="space-y-4">
          <Input label="Nome *" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nome do fornecedor" />
          <Input label="Contato" value={form.contact} onChange={e => set('contact', e.target.value)} />
          <Input label="E-mail" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          <Input label="Telefone" value={form.phone} onChange={e => set('phone', e.target.value)} />
          <Input label="Website" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://..." />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name}>Salvar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Confirmar exclusão">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Deseja excluir este fornecedor?</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete}>Excluir</Button>
        </div>
      </Modal>
    </div>
  )
}
