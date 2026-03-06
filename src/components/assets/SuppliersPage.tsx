'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, ExternalLink } from 'lucide-react'
import { Button, Table, Modal, Input } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import type { Fornecedor } from '@/types'

export function SuppliersPage() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editando, setEditando] = useState<Fornecedor | null>(null)
  const [deletandoId, setDeletandoId] = useState<string | null>(null)
  const [form, setForm] = useState({ nome: '', contato: '', email: '', telefone: '', site: '' })

  const buscarFornecedores = async () => {
    setLoading(true)
    const res = await fetch('/api/suppliers')
    const data = await res.json()
    setFornecedores(data)
    setLoading(false)
  }

  useEffect(() => { buscarFornecedores() }, [])

  const abrirAdd = () => { setForm({ nome: '', contato: '', email: '', telefone: '', site: '' }); setModal('add') }
  const abrirEdit = (f: Fornecedor) => {
    setEditando(f)
    setForm({ nome: f.nome, contato: f.contato ?? '', email: f.email ?? '', telefone: f.telefone ?? '', site: f.site ?? '' })
    setModal('edit')
  }

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  const handleSalvar = async () => {
    const url = editando ? `/api/suppliers/${editando.id}` : '/api/suppliers'
    const method = editando ? 'PUT' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setModal(null); setEditando(null)
    buscarFornecedores()
  }

  const handleDeletar = async () => {
    if (!deletandoId) return
    await fetch(`/api/suppliers/${deletandoId}`, { method: 'DELETE' })
    setDeletandoId(null)
    buscarFornecedores()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fornecedores</h1>
          <p className="text-sm text-gray-500 mt-1">{fornecedores.length} fornecedor{fornecedores.length !== 1 ? 'es' : ''} cadastrado{fornecedores.length !== 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={abrirAdd}>Adicionar</Button>
      </div>

      <Table headers={['Fornecedor', 'Contato', 'E-mail / Telefone', 'Site', 'Cadastro', 'Ações']} empty={fornecedores.length === 0}>
        {fornecedores.map(f => (
          <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <td className="px-4 py-3">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{f.nome}</p>
            </td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{f.contato ?? '—'}</td>
            <td className="px-4 py-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">{f.email ?? '—'}</p>
              <p className="text-xs text-gray-400">{f.telefone ?? ''}</p>
            </td>
            <td className="px-4 py-3">
              {f.site ? (
                <a href={f.site} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> Visitar
                </a>
              ) : '—'}
            </td>
            <td className="px-4 py-3 text-xs text-gray-400">{formatDate(f.criadoEm)}</td>
            <td className="px-4 py-3">
              <div className="flex gap-1">
                <button onClick={() => abrirEdit(f)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => setDeletandoId(f.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </Table>

      <Modal open={!!modal} onClose={() => { setModal(null); setEditando(null) }} title={modal === 'edit' ? 'Editar Fornecedor' : 'Novo Fornecedor'}>
        <div className="space-y-4">
          <Input label="Nome *" value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Nome do fornecedor" />
          <Input label="Contato" value={form.contato} onChange={e => set('contato', e.target.value)} />
          <Input label="E-mail" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          <Input label="Telefone" value={form.telefone} onChange={e => set('telefone', e.target.value)} />
          <Input label="Site" value={form.site} onChange={e => set('site', e.target.value)} placeholder="https://..." />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={!form.nome}>Salvar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deletandoId} onClose={() => setDeletandoId(null)} title="Confirmar exclusão">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Deseja excluir este fornecedor?</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setDeletandoId(null)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDeletar}>Excluir</Button>
        </div>
      </Modal>
    </div>
  )
}
