'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Modal, Input, Table, Badge } from '@/components/ui'
import { Plus, Edit2, Trash2 } from 'lucide-react'

interface Setor { id: string; nome: string; criadoEm: string }

export default function AdminSetoresPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [setores, setSetores] = useState<Setor[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Setor | null>(null)
  const [deletandoId, setDeletandoId] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (session && session.user.perfil !== 'admin') router.push('/dashboard')
  }, [session, router])

  const buscar = () => fetch('/api/setores').then(r => r.json()).then(d => { setSetores(d); setLoading(false) })
  useEffect(() => { buscar() }, [])

  const abrirNovo = () => { setEditando(null); setNome(''); setErro(''); setModal(true) }
  const abrirEditar = (s: Setor) => { setEditando(s); setNome(s.nome); setErro(''); setModal(true) }

  const salvar = async () => {
    if (!nome.trim()) { setErro('Nome é obrigatório'); return }
    setSalvando(true)
    const res = await fetch(editando ? `/api/setores/${editando.id}` : '/api/setores', {
      method: editando ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome }),
    })
    if (!res.ok) { const d = await res.json(); setErro(d.error || 'Erro ao salvar'); setSalvando(false); return }
    setSalvando(false); setModal(false); buscar()
  }

  const deletar = async () => {
    if (!deletandoId) return
    await fetch(`/api/setores/${deletandoId}`, { method: 'DELETE' })
    setDeletandoId(null); buscar()
  }

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div></AppLayout>

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Setores</h1>
            <p className="text-sm text-gray-500 mt-1">{setores.length} cadastrado{setores.length !== 1 ? 's' : ''}</p>
          </div>
          <Button icon={<Plus className="w-4 h-4" />} onClick={abrirNovo}>Novo Setor</Button>
        </div>

        <Table headers={['Nome', 'Status', 'Ações']} empty={setores.length === 0}>
          {setores.map(s => (
            <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{s.nome}</td>
              <td className="px-4 py-3"><Badge variant="success">Ativo</Badge></td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <button onClick={() => abrirEditar(s)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => setDeletandoId(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          ))}
        </Table>

        <Modal open={modal} onClose={() => setModal(false)} title={editando ? 'Editar Setor' : 'Novo Setor'}>
          <div className="space-y-4">
            {erro && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600">{erro}</div>}
            <Input label="Nome do Setor *" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: TI, Financeiro, RH..." />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
              <Button loading={salvando} onClick={salvar}>{editando ? 'Salvar' : 'Cadastrar'}</Button>
            </div>
          </div>
        </Modal>

        <Modal open={!!deletandoId} onClose={() => setDeletandoId(null)} title="Confirmar exclusão">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Deseja excluir este setor?</p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setDeletandoId(null)}>Cancelar</Button>
            <Button variant="danger" onClick={deletar}>Excluir</Button>
          </div>
        </Modal>
      </div>
    </AppLayout>
  )
}
