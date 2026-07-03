'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Input, Badge } from '@/components/ui'
import { Edit2, Trash2 } from 'lucide-react'
import { useCrud } from '@/hooks/useCrud'
import { GenericCrudPage } from '@/components/admin/GenericCrudPage'

interface Setor { id: string; nome: string; criadoEm: string }

export default function AdminSetoresPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState('')

  const {
    data: setores,
    loading,
    error,
    modalOpen,
    editingItem,
    deletingId,
    saving,
    fetchData,
    openCreate,
    openEdit,
    closeModal,
    openDelete,
    closeDelete,
    update,
    deleteItem: deletar
  } = useCrud<Setor>({
    fetchUrl: '/api/setores',
  })

  useEffect(() => {
    if (session && session.user.perfil !== 'admin') router.push('/dashboard')
  }, [session, router])

  const abrirNovo = () => {
    setNome('')
    setErro('')
    openCreate()
  }

  const abrirEditar = (s: Setor) => {
    setNome(s.nome)
    setErro('')
    openEdit(s)
  }

  const salvar = async () => {
    if (!nome.trim()) {
      setErro('Nome é obrigatório')
      return
    }
    if (editingItem) {
      await update(editingItem.id, { nome })
    }
  }

  const handleDelete = async (id: string) => {
    await deletar(id)
  }

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div></AppLayout>

  return (
    <AppLayout>
      <GenericCrudPage<Setor>
        title="Setores"
        description={`${setores.length} cadastrado${setores.length !== 1 ? 's' : ''}`}
        data={setores}
        loading={loading}
        error={error}
        modalOpen={modalOpen}
        editingItem={editingItem}
        deletingId={deletingId}
        saving={saving}
        tableHeaders={['Nome', 'Status', 'Ações']}
        renderRow={(s) => (
          <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{s.nome}</td>
            <td className="px-4 py-3"><Badge variant="success">Ativo</Badge></td>
            <td className="px-4 py-3">
              <div className="flex gap-1">
                <button onClick={() => abrirEditar(s)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => openDelete(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </td>
          </tr>
        )}
        renderForm={(item, onSave, onCancel) => (
          <div className="space-y-4">
            {erro && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600">{erro}</div>}
            <Input label="Nome do Setor *" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: TI, Financeiro, RH..." />
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
        deleteMessage="Deseja excluir este setor?"
        newItemButtonText="Novo Setor"
      />
    </AppLayout>
  )
}
