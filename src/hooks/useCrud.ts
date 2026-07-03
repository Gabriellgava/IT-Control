import { useState, useEffect, useCallback } from 'react'

interface UseCrudOptions<T> {
  fetchUrl: string
  createUrl?: string
  updateUrl?: string
  deleteUrl?: string
  transformData?: (data: any) => T
  transformPayload?: (data: Partial<T>) => any
}

interface UseCrudReturn<T> {
  data: T[]
  loading: boolean
  error: string
  modalOpen: boolean
  editingItem: T | null
  deletingId: string | null
  saving: boolean
  fetchData: () => Promise<void>
  openCreate: () => void
  openEdit: (item: T) => void
  closeModal: () => void
  openDelete: (id: string) => void
  closeDelete: () => void
  create: (data: Partial<T>) => Promise<void>
  update: (id: string, data: Partial<T>) => Promise<void>
  delete: (id: string) => Promise<void>
}

export function useCrud<T extends { id: string }>({
  fetchUrl,
  createUrl,
  updateUrl,
  deleteUrl,
  transformData,
  transformPayload
}: UseCrudOptions<T>): UseCrudReturn<T> {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<T | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(fetchUrl)
      if (!res.ok) throw new Error('Não foi possível carregar os dados.')
      const rawData = await res.json()
      setData(transformData ? rawData.map(transformData) : rawData)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro inesperado ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }, [fetchUrl, transformData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openCreate = () => {
    setEditingItem(null)
    setModalOpen(true)
    setError('')
  }

  const openEdit = (item: T) => {
    setEditingItem(item)
    setModalOpen(true)
    setError('')
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingItem(null)
    setError('')
  }

  const openDelete = (id: string) => {
    setDeletingId(id)
  }

  const closeDelete = () => {
    setDeletingId(null)
  }

  const create = async (itemData: Partial<T>) => {
    setSaving(true)
    setError('')
    try {
      const payload = transformPayload ? transformPayload(itemData) : itemData
      const res = await fetch(createUrl || fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Não foi possível criar o item.')
      }
      closeModal()
      await fetchData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro inesperado ao criar item.')
    } finally {
      setSaving(false)
    }
  }

  const update = async (id: string, itemData: Partial<T>) => {
    setSaving(true)
    setError('')
    try {
      const payload = transformPayload ? transformPayload(itemData) : itemData
      const res = await fetch(updateUrl || `${fetchUrl}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Não foi possível atualizar o item.')
      }
      closeModal()
      await fetchData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro inesperado ao atualizar item.')
    } finally {
      setSaving(false)
    }
  }

  const delete = async (id: string) => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(deleteUrl || `${fetchUrl}/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Não foi possível excluir o item.')
      }
      closeDelete()
      await fetchData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro inesperado ao excluir item.')
    } finally {
      setSaving(false)
    }
  }

  return {
    data,
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
    create,
    update,
    delete,
  }
}
