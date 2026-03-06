'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Select, Textarea } from '@/components/ui'
import type { Asset, Supplier } from '@/types'

interface AssetFormProps {
  asset?: Asset
  suppliers: Supplier[]
  onSuccess?: () => void
  onCancel?: () => void
  inline?: boolean
}

export function AssetForm({ asset, suppliers, onSuccess, onCancel, inline }: AssetFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: asset?.name ?? '',
    code: asset?.code ?? '',
    tag: asset?.tag ?? '',
    supplierId: asset?.supplierId ?? '',
    purchaseLink: asset?.purchaseLink ?? '',
    unitValue: asset?.unitValue?.toString() ?? '',
    quantity: asset?.quantity?.toString() ?? '0',
    minStock: asset?.minStock?.toString() ?? '5',
    purchaseDate: asset?.purchaseDate ? asset.purchaseDate.split('T')[0] : '',
    notes: asset?.notes ?? '',
  })

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async () => {
    if (!form.name || !form.code) { setError('Nome e código são obrigatórios'); return }
    setLoading(true); setError('')
    try {
      const url = asset ? `/api/assets/${asset.id}` : '/api/assets'
      const method = asset ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao salvar'); setLoading(false); return }
      if (onSuccess) onSuccess()
      else router.push('/assets')
    } catch {
      setError('Erro ao salvar ativo')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Input label="Nome do Produto *" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Notebook Dell Latitude 5520" />
        </div>
        <Input label="Código do Produto *" value={form.code} onChange={e => set('code', e.target.value)} placeholder="Ex: NOTE-001" />
        <Input label="Etiqueta (Tag)" value={form.tag} onChange={e => set('tag', e.target.value)} placeholder="Ex: ETQ-0001" />
        <Select label="Fornecedor" value={form.supplierId} onChange={e => set('supplierId', e.target.value)}>
          <option value="">Selecionar fornecedor</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Input label="Data da Compra" type="date" value={form.purchaseDate} onChange={e => set('purchaseDate', e.target.value)} />
        <Input label="Valor Unitário (R$)" type="number" step="0.01" min="0" value={form.unitValue} onChange={e => set('unitValue', e.target.value)} placeholder="0.00" />
        <Input label="Link de Compra" value={form.purchaseLink} onChange={e => set('purchaseLink', e.target.value)} placeholder="https://..." />
        {!asset && (
          <Input label="Quantidade Inicial" type="number" min="0" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
        )}
        <Input label="Estoque Mínimo" type="number" min="0" value={form.minStock} onChange={e => set('minStock', e.target.value)} />
        <div className="sm:col-span-2">
          <Textarea label="Observações" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Informações adicionais..." rows={3} />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && <Button variant="secondary" onClick={onCancel}>Cancelar</Button>}
        <Button loading={loading} onClick={handleSubmit}>
          {asset ? 'Salvar alterações' : 'Cadastrar Ativo'}
        </Button>
      </div>
    </div>
  )
}
