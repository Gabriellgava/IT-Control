import { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { Button, Table, Modal, PageHeader, LoadingState, ErrorState } from '@/components/ui'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal'

interface GenericCrudPageProps<T extends { id: string }> {
  title: string
  description: string
  data: T[]
  loading: boolean
  error: string
  modalOpen: boolean
  editingItem: T | null
  deletingId: string | null
  saving: boolean
  tableHeaders: string[]
  renderRow: (item: T) => ReactNode
  renderForm: (item: T | null, onSave: (data: Partial<T>) => void, onCancel: () => void) => ReactNode
  onCreate: () => void
  onEdit: (item: T) => void
  onDelete: (id: string) => void
  onCloseModal: () => void
  onCloseDelete: () => void
  deleteMessage?: string
  newItemButtonText?: string
  emptyMessage?: string
}

export function GenericCrudPage<T extends { id: string }>({
  title,
  description,
  data,
  loading,
  error,
  modalOpen,
  editingItem,
  deletingId,
  saving,
  tableHeaders,
  renderRow,
  renderForm,
  onCreate,
  onEdit,
  onDelete,
  onCloseModal,
  onCloseDelete,
  deleteMessage,
  newItemButtonText = `Novo ${title}`,
  emptyMessage = `Nenhum ${title.toLowerCase()} encontrado`
}: GenericCrudPageProps<T>) {
  if (loading) {
    return <LoadingState message="Carregando..." />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={onCreate}>{newItemButtonText}</Button>}
      />

      {error && <ErrorState message={error} />}

      <Table headers={tableHeaders} empty={data.length === 0}>
        {data.map(renderRow)}
      </Table>

      <Modal open={modalOpen} onClose={onCloseModal} title={editingItem ? `Editar ${title}` : `Novo ${title}`}>
        {renderForm(editingItem, () => {}, onCloseModal)}
      </Modal>

      <ConfirmDeleteModal
        open={!!deletingId}
        onClose={onCloseDelete}
        onConfirm={() => deletingId && onDelete(deletingId)}
        message={deleteMessage}
        loading={saving}
      />
    </div>
  )
}
