'use client'
import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Globe, Mail, Phone } from 'lucide-react'
import { Button, Card, Modal, Input, Table } from '@/components/ui'
import { mascaraTelefone } from '@/lib/mascaras'
import type { Fornecedor } from '@/types'

export function FornecedoresPage() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Fornecedor | null>(null)
  const [deletandoId, setDeletandoId] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [form, setForm] = useState({ nome: '', contato: '', email: '', telefone: '', site: '' })
  const s = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setErros(e => ({ ...e, [k]: '' })) }

  const buscar = () => fetch('/api/fornecedores').then(r => r.json()).then(d => { setFornecedores(d); setLoading(false) })
  useEffect(() => { buscar() }, [])

  const abrirNovo = () => { setEditando(null); setForm({ nome: '', contato: '', email: '', telefone: '', site: '' }); setErros({}); setModal(true) }
  const abrirEditar = (f: Fornecedor) => { setEditando(f); setForm({ nome: f.nome, contato: f.contato ?? '', email: f.email ?? '', telefone: f.telefone ?? '', site: f.site ?? '' }); setErros({}); setModal(true) }

  const validar = () => {
    const e: Record<string, string> = {}
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'E-mail inválido'
    if (form.telefone && form.telefone.replace(/\D/g, '').length < 10) e.telefone = 'Telefone inválido'
    setErros(e)
    return Object.keys(e).length === 0
  }

  const salvar = async () => {
    if (!validar()) return
    setSalvando(true)
    await fetch(editando ? `/api/fornecedores/${editando.id}` : '/api/fornecedores', {
      method: editando ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSalvando(false); setModal(false); buscar()
  }

  const deletar = async () => {
    if (!deletandoId) return
    await fetch(`/api/fornecedores/${deletandoId}`, { method: 'DELETE' })
    setDeletandoId(null); buscar()
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fornecedores</h1>
          <p className="text-sm text-gray-500 mt-1">{fornecedores.length} cadastrado{fornecedores.length !== 1 ? 's' : ''}</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={abrirNovo}>Novo Fornecedor</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {fornecedores.length === 0 ? (
          <Card className="sm:col-span-2 lg:col-span-3 p-12 text-center">
            <p className="text-gray-400">Nenhum fornecedor cadastrado</p>
          </Card>
        ) : fornecedores.map(f => (
          <Card key={f.id} className="p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">{f.nome}</h3>
                {f.contato && <p className="text-xs text-gray-500 mt-0.5">{f.contato}</p>}
              </div>
              <div className="flex gap-1 ml-2">
                <button onClick={() => abrirEditar(f)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeletandoId(f.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div className="space-y-1.5">
              {f.email && <div className="flex items-center gap-2 text-xs text-gray-500"><Mail className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate">{f.email}</span></div>}
              {f.telefone && <div className="flex items-center gap-2 text-xs text-gray-500"><Phone className="w-3.5 h-3.5 flex-shrink-0" /><span>{f.telefone}</span></div>}
              {f.site && <div className="flex items-center gap-2 text-xs text-gray-500"><Globe className="w-3.5 h-3.5 flex-shrink-0" /><a href={f.site} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">{f.site}</a></div>}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editando ? 'Editar Fornecedor' : 'Novo Fornecedor'}>
        <div className="space-y-4">
          <Input label="Nome *" value={form.nome} onChange={e => s('nome', e.target.value)} placeholder="Nome da empresa" error={erros.nome} />
          <Input label="Contato" value={form.contato} onChange={e => s('contato', e.target.value)} placeholder="Nome do responsável" />
          <Input label="E-mail" type="email" value={form.email} onChange={e => s('email', e.target.value)} placeholder="contato@empresa.com" error={erros.email} />
          <Input
            label="Telefone"
            value={form.telefone}
            onChange={e => s('telefone', mascaraTelefone(e.target.value))}
            placeholder="(11) 99999-9999"
            error={erros.telefone}
            maxLength={15}
          />
          <Input label="Site" value={form.site} onChange={e => s('site', e.target.value)} placeholder="https://empresa.com" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
            <Button loading={salvando} onClick={salvar}>{editando ? 'Salvar' : 'Cadastrar'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deletandoId} onClose={() => setDeletandoId(null)} title="Confirmar exclusão">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Deseja excluir este fornecedor?</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setDeletandoId(null)}>Cancelar</Button>
          <Button variant="danger" onClick={deletar}>Excluir</Button>
        </div>
      </Modal>
    </div>
  )
}
