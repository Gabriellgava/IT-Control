'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Input, Select, Badge } from '@/components/ui'
import { Edit2, Trash2, Check, X } from 'lucide-react'
import { useCrud } from '@/hooks/useCrud'
import { GenericCrudPage } from '@/components/admin/GenericCrudPage'

interface Setor { id: string; nome: string }
interface Funcionario { id: string; nome: string; email?: string | null; setorId: string; setor: Setor; ativo: boolean; criadoEm: string }

export default function AdminFuncionariosPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [setores, setSetores] = useState<Setor[]>([])
  const [form, setForm] = useState({ nome: '', email: '', setorId: '', ativo: true })
  const [erro, setErro] = useState('')

  const {
    data: funcionarios,
    loading,
    error,
    modalOpen,
    editingItem,
    deletingId,
    saving,
    openCreate,
    openEdit,
    closeModal,
    openDelete,
    closeDelete,
    update,
    delete: deletar
  } = useCrud<Funcionario>({
    fetchUrl: '/api/funcionarios',
  })

  useEffect(() => {
    if (session && session.user.perfil !== 'admin') router.push('/dashboard')
  }, [session, router])

  const buscarSetores = () => fetch('/api/setores').then(r => r.json()).then(setSetores)
  useEffect(() => { buscarSetores() }, [])

  const abrirNovo = () => {
    setForm({ nome: '', email: '', setorId: '', ativo: true })
    setErro('')
    openCreate()
  }

  const abrirEditar = (f: Funcionario) => {
    setForm({ nome: f.nome, email: f.email ?? '', setorId: f.setorId, ativo: f.ativo })
    setErro('')
    openEdit(f)
  }

  const salvar = async () => {
    if (!form.nome.trim()) return setErro('Nome completo é obrigatório')
    if (!form.setorId) return setErro('Setor é obrigatório')

    if (editingItem) {
      await update(editingItem.id, { nome: form.nome.trim(), email: form.email.trim(), setorId: form.setorId, ativo: form.ativo })
    }
  }

  const handleDelete = async (id: string) => {
    await deletar(id)
  }

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div></AppLayout>

  return (
    <AppLayout>
      <GenericCrudPage<Funcionario>
        title="Funcionários"
        description={`${funcionarios.length} cadastrado${funcionarios.length !== 1 ? 's' : ''}`}
        data={funcionarios}
        loading={loading}
        error={error}
        modalOpen={modalOpen}
        editingItem={editingItem}
        deletingId={deletingId}
        saving={saving}
        tableHeaders={['Nome Completo', 'E-mail', 'Setor', 'Status', 'Ações']}
        renderRow={(f) => (
          <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{f.nome}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{f.email ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{f.setor?.nome ?? '—'}</td>
            <td className="px-4 py-3">{f.ativo ? <Badge variant="success"><Check className="w-3 h-3 mr-1" />Ativo</Badge> : <Badge variant="danger"><X className="w-3 h-3 mr-1" />Inativo</Badge>}</td>
            <td className="px-4 py-3">
              <div className="flex gap-1">
                <button onClick={() => abrirEditar(f)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => openDelete(f.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </td>
          </tr>
        )}
        renderForm={(item, onSave, onCancel) => (
          <div className="space-y-4">
            {erro && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600">{erro}</div>}
            <Input label="Nome Completo *" value={form.nome} onChange={e => setForm(v => ({ ...v, nome: e.target.value }))} placeholder="Nome completo do funcionário" />
            <Input label="E-mail do funcionário" type="email" value={form.email} onChange={e => setForm(v => ({ ...v, email: e.target.value }))} placeholder="nome@empresa.com" />
            <Select label="Setor *" value={form.setorId} onChange={e => setForm(v => ({ ...v, setorId: e.target.value }))}>
              <option value="">Selecionar setor</option>
              {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </Select>
            <Select label="Situação" value={form.ativo ? 'true' : 'false'} onChange={e => setForm(v => ({ ...v, ativo: e.target.value === 'true' }))}>
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </Select>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
              <Button loading={saving} onClick={salvar}>{item ? 'Salvar' : 'Cadastrar'}</Button>
            </div>
          </div>
        )}
        onCreate={abrirNovo}
        onEdit={abrirEditar}
        onDelete={handleDelete}
        onCloseModal={closeModal}
        onCloseDelete={closeDelete}
        deleteMessage="Deseja excluir este funcionário?"
        newItemButtonText="Novo Funcionário"
      />
    </AppLayout>
  )
}
