import { ReactNode, useState, useMemo } from 'react'
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
  getSortValue?: (item: T, header: string) => string | number
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
  emptyMessage = `Nenhum ${title.toLowerCase()} encontrado`,
  getSortValue,
}: GenericCrudPageProps<T>) {
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  const sortedData = useMemo(() => {
    if (!sort) return data

    return [...data].sort((a, b) => {
      const aValor = getSortValue ? getSortValue(a, sort.key) : String(a[sort.key as keyof T] || '')
      const bValor = getSortValue ? getSortValue(b, sort.key) : String(b[sort.key as keyof T] || '')
      const comparacao = typeof aValor === 'number' && typeof bValor === 'number'
        ? aValor - bValor
        : String(aValor).localeCompare(String(bValor), 'pt-BR', { numeric: true, sensitivity: 'base' })
      return sort.direction === 'asc' ? comparacao : -comparacao
    })
  }, [data, sort, getSortValue])

  const alternarOrdenacao = (header: string) => {
    setSort((atual) => {
      if (!atual || atual.key !== header) return { key: header, direction: 'asc' }
      return { key: header, direction: atual.direction === 'asc' ? 'desc' : 'asc' }
    })
  }
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

      <Table headers={tableHeaders} empty={sortedData.length === 0} sort={sort} onSort={alternarOrdenacao}>
        {sortedData.map(renderRow)}
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
