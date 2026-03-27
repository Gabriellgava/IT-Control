'use client'
import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Globe, Mail, Phone } from 'lucide-react'
import { Button, Card, Modal, Input, PageHeader, LoadingState, ErrorState } from '@/components/ui'
import { mascaraTelefone } from '@/lib/mascaras'
import type { Fornecedor } from '@/types'

export function FornecedoresPage() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Fornecedor | null>(null)
  const [deletandoId, setDeletandoId] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [error, setError] = useState('')
  const [erros, setErros] = useState<Record<string, string>>({})
  const [form, setForm] = useState({ nome: '', contato: '', email: '', telefone: '', site: '' })
  const s = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setErros(e => ({ ...e, [k]: '' })) }

  const buscar = async () => {
    setError('')
    try {
      const res = await fetch('/api/fornecedores')
      if (!res.ok) throw new Error('Não foi possível carregar fornecedores.')
      const data = await res.json()
      setFornecedores(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro inesperado ao carregar fornecedores.')
    } finally {
      setLoading(false)
    }
  }
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
    setError('')
    try {
      const res = await fetch(editando ? `/api/fornecedores/${editando.id}` : '/api/fornecedores', {
        method: editando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Não foi possível salvar o fornecedor.')
      setModal(false)
      await buscar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro inesperado ao salvar fornecedor.')
    } finally {
      setSalvando(false)
    }
  }

  const deletar = async () => {
    if (!deletandoId) return
    setError('')
    try {
      const res = await fetch(`/api/fornecedores/${deletandoId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Não foi possível excluir o fornecedor.')
      setDeletandoId(null)
      await buscar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro inesperado ao excluir fornecedor.')
    }
  }

  if (loading) return <LoadingState message="Carregando fornecedores..." />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fornecedores"
        description={`${fornecedores.length} cadastrado${fornecedores.length !== 1 ? 's' : ''}`}
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={abrirNovo}>Novo Fornecedor</Button>}
      />

      {error && <ErrorState message={error} />}

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
