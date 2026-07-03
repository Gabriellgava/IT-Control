'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Input, Select, Badge } from '@/components/ui'
import { User, Check, X } from 'lucide-react'
import { useCrud } from '@/hooks/useCrud'
import { GenericCrudPage } from '@/components/admin/GenericCrudPage'
import { formatData } from '@/lib/utils'

interface UsuarioAdmin {
  id: string; nome: string | null; email: string | null; perfil: string; ativo: boolean; criadoEm: string; image: string | null
}

export default function AdminUsuariosPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: 'usuario' })
  const [erro, setErro] = useState('')

  const {
    data: usuarios,
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
    create,
    update,
    deleteItem: deletar
  } = useCrud<UsuarioAdmin>({
    fetchUrl: '/api/admin/usuarios',
    createUrl: '/api/admin/usuarios',
  })

  useEffect(() => {
    if (session && session.user.perfil !== 'admin') router.push('/dashboard')
  }, [session, router])

  const abrirNovo = () => {
    setForm({ nome: '', email: '', senha: '', perfil: 'usuario' })
    setErro('')
    openCreate()
  }

  const salvar = async () => {
    if (!form.nome || !form.email || !form.senha) return setErro('Todos os campos são obrigatórios')
    
    if (editingItem) {
      await update(editingItem.id, { nome: form.nome, email: form.email, perfil: form.perfil })
    } else {
      await create(form)
    }
  }

  const toggleAtivo = async (id: string, ativo: boolean) => {
    await update(id, { ativo: !ativo })
  }

  const alterarPerfil = async (id: string, perfil: string) => {
    await update(id, { perfil })
  }

  const handleDelete = async (id: string) => {
    await deletar(id)
  }

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div></AppLayout>

  return (
    <AppLayout>
      <GenericCrudPage<UsuarioAdmin>
        title="Usuários"
        description={`${usuarios.length} cadastrado${usuarios.length !== 1 ? 's' : ''}`}
        data={usuarios}
        loading={loading}
        error={error}
        modalOpen={modalOpen}
        editingItem={editingItem}
        deletingId={deletingId}
        saving={saving}
        tableHeaders={['Usuário', 'Email', 'Perfil', 'Status', 'Cadastro', 'Ações']}
        renderRow={(u) => (
          <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <td className="px-4 py-3">
              <div className="flex items-center gap-3">
                {u.image ? <img src={u.image} className="w-8 h-8 rounded-full" alt="" /> : <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"><User className="w-4 h-4 text-blue-600" /></div>}
                <span className="text-sm font-medium text-gray-900 dark:text-white">{u.nome ?? '—'}</span>
              </div>
            </td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{u.email}</td>
            <td className="px-4 py-3">
              <select value={u.perfil} onChange={e => alterarPerfil(u.id, e.target.value)} disabled={u.id === session?.user.id}
                className="text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg px-2 py-1">
                <option value="usuario">Usuário</option>
                <option value="admin">Admin</option>
              </select>
            </td>
            <td className="px-4 py-3">{u.ativo ? <Badge variant="success"><Check className="w-3 h-3 mr-1" />Ativo</Badge> : <Badge variant="danger"><X className="w-3 h-3 mr-1" />Inativo</Badge>}</td>
            <td className="px-4 py-3 text-xs text-gray-500">{formatData(u.criadoEm)}</td>
            <td className="px-4 py-3">
              {u.id !== session?.user.id && (
                <Button variant={u.ativo ? 'danger' : 'secondary'} size="sm" onClick={() => toggleAtivo(u.id, u.ativo)}>
                  {u.ativo ? 'Desativar' : 'Ativar'}
                </Button>
              )}
            </td>
          </tr>
        )}
        renderForm={(item, onSave, onCancel) => (
          <div className="space-y-4">
            {erro && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600">{erro}</div>}
            <Input label="Nome *" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" />
            <Input label="Email *" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@empresa.com" />
            <Input label="Senha *" type="password" value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} placeholder="Mínimo 6 caracteres" />
            <Select label="Perfil" value={form.perfil} onChange={e => setForm(f => ({ ...f, perfil: e.target.value }))}>
              <option value="usuario">Usuário</option>
              <option value="admin">Admin</option>
            </Select>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
              <Button loading={saving} onClick={salvar}>Criar Usuário</Button>
            </div>
          </div>
        )}
        onCreate={abrirNovo}
        onEdit={() => {}}
        onDelete={handleDelete}
        onCloseModal={closeModal}
        onCloseDelete={closeDelete}
        deleteMessage="Deseja excluir este usuário?"
        newItemButtonText="Novo Usuário"
      />
    </AppLayout>
  )
}
