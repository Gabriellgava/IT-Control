'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Modal, Input, Select, Table, Badge } from '@/components/ui'
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react'

interface Setor { id: string; nome: string }
interface Funcionario { id: string; nome: string; setorId: string; setor: Setor; ativo: boolean; criadoEm: string }

export default function AdminFuncionariosPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [setores, setSetores] = useState<Setor[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Funcionario | null>(null)
  const [deletandoId, setDeletandoId] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [form, setForm] = useState({ nome: '', setorId: '', ativo: true })

  useEffect(() => {
    if (session && session.user.perfil !== 'admin') router.push('/dashboard')
  }, [session, router])

  const buscar = () => fetch('/api/funcionarios').then(r => r.json()).then(d => { setFuncionarios(d); setLoading(false) })
  const buscarSetores = () => fetch('/api/setores').then(r => r.json()).then(setSetores)

  useEffect(() => { buscar(); buscarSetores() }, [])

  const abrirNovo = () => {
    setEditando(null)
    setErro('')
    setForm({ nome: '', setorId: '', ativo: true })
    setModal(true)
  }

  const abrirEditar = (f: Funcionario) => {
    setEditando(f)
    setErro('')
    setForm({ nome: f.nome, setorId: f.setorId, ativo: f.ativo })
    setModal(true)
  }

  const salvar = async () => {
    if (!form.nome.trim()) return setErro('Nome completo é obrigatório')
    if (!form.setorId) return setErro('Setor é obrigatório')

    setSalvando(true)
    const res = await fetch(editando ? `/api/funcionarios/${editando.id}` : '/api/funcionarios', {
      method: editando ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: form.nome.trim(), setorId: form.setorId, ativo: form.ativo }),
    })

    if (!res.ok) {
      const d = await res.json()
      setErro(d.error || 'Erro ao salvar funcionário')
      setSalvando(false)
      return
    }

    setSalvando(false)
    setModal(false)
    buscar()
  }

  const deletar = async () => {
    if (!deletandoId) return
    await fetch(`/api/funcionarios/${deletandoId}`, { method: 'DELETE' })
    setDeletandoId(null)
    buscar()
  }

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div></AppLayout>

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Funcionários</h1>
            <p className="text-sm text-gray-500 mt-1">{funcionarios.length} cadastrado{funcionarios.length !== 1 ? 's' : ''}</p>
          </div>
          <Button icon={<Plus className="w-4 h-4" />} onClick={abrirNovo}>Novo Funcionário</Button>
        </div>

        <Table headers={['Nome Completo', 'Setor', 'Status', 'Ações']} empty={funcionarios.length === 0}>
          {funcionarios.map(f => (
            <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{f.nome}</td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{f.setor?.nome ?? '—'}</td>
              <td className="px-4 py-3">{f.ativo ? <Badge variant="success"><Check className="w-3 h-3 mr-1" />Ativo</Badge> : <Badge variant="danger"><X className="w-3 h-3 mr-1" />Inativo</Badge>}</td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <button onClick={() => abrirEditar(f)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => setDeletandoId(f.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          ))}
        </Table>

        <Modal open={modal} onClose={() => setModal(false)} title={editando ? 'Editar Funcionário' : 'Novo Funcionário'}>
          <div className="space-y-4">
            {erro && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600">{erro}</div>}
            <Input label="Nome Completo *" value={form.nome} onChange={e => setForm(v => ({ ...v, nome: e.target.value }))} placeholder="Nome completo do funcionário" />
            <Select label="Setor *" value={form.setorId} onChange={e => setForm(v => ({ ...v, setorId: e.target.value }))}>
              <option value="">Selecionar setor</option>
              {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </Select>
            <Select label="Situação" value={form.ativo ? 'true' : 'false'} onChange={e => setForm(v => ({ ...v, ativo: e.target.value === 'true' }))}>
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </Select>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
              <Button loading={salvando} onClick={salvar}>{editando ? 'Salvar' : 'Cadastrar'}</Button>
            </div>
          </div>
        </Modal>

        <Modal open={!!deletandoId} onClose={() => setDeletandoId(null)} title="Confirmar exclusão">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Deseja excluir este funcionário?</p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setDeletandoId(null)}>Cancelar</Button>
            <Button variant="danger" onClick={deletar}>Excluir</Button>
          </div>
        </Modal>
      </div>
    </AppLayout>
  )
}
