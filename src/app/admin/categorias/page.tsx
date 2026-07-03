'use client'
import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Input, Badge } from '@/components/ui'
import { Edit2, Trash2, Tag } from 'lucide-react'
import { useCrud } from '@/hooks/useCrud'
import { GenericCrudPage } from '@/components/admin/GenericCrudPage'
import type { Categoria } from '@/types'

export default function Page() {
  const [form, setForm] = useState({ nome: '', estoqueMinimo: '0' })
  const [erro, setErro] = useState('')

  const {
    data: categorias,
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
  } = useCrud<Categoria>({
    fetchUrl: '/api/categorias',
  })

  const abrirNovo = () => {
    setForm({ nome: '', estoqueMinimo: '0' })
    setErro('')
    openCreate()
  }

  const abrirEditar = (c: Categoria) => {
    setForm({ nome: c.nome, estoqueMinimo: c.estoqueMinimo.toString() })
    setErro('')
    openEdit(c)
  }

  const salvar = async () => {
    if (!form.nome.trim()) {
      setErro('Nome é obrigatório')
      return
    }
    if (editingItem) {
      await update(editingItem.id, { ...form, estoqueMinimo: parseInt(form.estoqueMinimo, 10) || 0 })
    }
  }

  const handleDelete = async (id: string) => {
    await deletar(id)
  }

  return (
    <AppLayout>
      <GenericCrudPage<Categoria>
        title="Categorias"
        description={`${categorias.length} categoria${categorias.length !== 1 ? 's' : ''}`}
        data={categorias}
        loading={loading}
        error={error}
        modalOpen={modalOpen}
        editingItem={editingItem}
        deletingId={deletingId}
        saving={saving}
        tableHeaders={['Categoria', 'Estoque Mínimo', 'Ativos Vinculados', 'Ações']}
        renderRow={(c) => (
          <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{c.nome}</span>
              </div>
            </td>
            <td className="px-4 py-3">
              <Badge variant={c.estoqueMinimo > 0 ? 'warning' : 'default'}>{c.estoqueMinimo} unidades</Badge>
            </td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{c._count?.produtos ?? 0} produto(s)</td>
            <td className="px-4 py-3">
              <div className="flex gap-1">
                <button onClick={() => abrirEditar(c)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => openDelete(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </td>
          </tr>
        )}
        renderForm={(item, onSave, onCancel) => (
          <div className="space-y-4">
            {erro && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg text-sm text-red-600">{erro}</div>}
            <Input label="Nome da Categoria *" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Teclados, Monitores, Notebooks..." />
            <Input label="Estoque Mínimo (total da categoria)" type="number" min="0" value={form.estoqueMinimo} onChange={e => setForm(f => ({ ...f, estoqueMinimo: e.target.value }))} />
            <p className="text-xs text-gray-400">O alerta será disparado quando a soma de todos os ativos desta categoria atingir ou ficar abaixo deste valor.</p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
              <Button loading={saving} onClick={salvar}>{item ? 'Salvar alterações' : 'Criar Categoria'}</Button>
            </div>
          </div>
        )}
        onCreate={abrirNovo}
        onEdit={abrirEditar}
        onDelete={handleDelete}
        onCloseModal={closeModal}
        onCloseDelete={closeDelete}
        deleteMessage="Tem certeza que deseja excluir esta categoria? Os ativos vinculados precisam ser removidos ou movidos antes."
        newItemButtonText="Nova Categoria"
      />
    </AppLayout>
  )
}
