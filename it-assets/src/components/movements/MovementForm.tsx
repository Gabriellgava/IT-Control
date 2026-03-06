'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Input, Select, Textarea } from '@/components/ui'
import type { Asset, Supplier, Sector, User } from '@/types'

export function MovementForm({ type }: { type: 'IN' | 'OUT' }) {
  const router = useRouter()
  const [assets, setAssets] = useState<Asset[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)

  const [form, setForm] = useState({
    assetId: '',
    quantity: '1',
    unitValue: '',
    date: new Date().toISOString().split('T')[0],
    supplierId: '',
    sectorId: '',
    userId: '',
    responsible: '',
    notes: '',
  })

  useEffect(() => {
    fetch('/api/assets').then(r => r.json()).then(setAssets)
    fetch('/api/suppliers').then(r => r.json()).then(setSuppliers)
    fetch('/api/sectors').then(r => r.json()).then(setSectors)
    fetch('/api/users').then(r => r.json()).then(setUsers)
  }, [])

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  const handleAssetChange = (id: string) => {
    set('assetId', id)
    const asset = assets.find(a => a.id === id)
    setSelectedAsset(asset || null)
    if (asset) set('unitValue', asset.unitValue.toString())
  }

  const handleSubmit = async () => {
    if (!form.assetId || !form.quantity) { setError('Produto e quantidade são obrigatórios'); return }
    if (type === 'OUT' && !form.sectorId) { setError('Setor é obrigatório para saída'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, type }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao registrar'); setLoading(false); return }
      setSuccess(true)
      setTimeout(() => router.push('/movements'), 1500)
    } catch {
      setError('Erro ao registrar movimentação')
      setLoading(false)
    }
  }

  const isIn = type === 'IN'
  const title = isIn ? 'Entrada de Estoque' : 'Saída de Estoque'
  const color = isIn ? 'text-green-600' : 'text-amber-600'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${color}`}>{title}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {isIn ? 'Registrar recebimento de produtos no estoque' : 'Registrar saída de produtos para um setor/usuário'}
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-5">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-600 dark:text-green-400">
              ✅ Movimentação registrada! Redirecionando...
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Select label="Produto *" value={form.assetId} onChange={e => handleAssetChange(e.target.value)}>
                <option value="">Selecionar produto</option>
                {assets.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.code}) — Estoque: {a.quantity}
                  </option>
                ))}
              </Select>
              {selectedAsset && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs text-gray-500 grid grid-cols-3 gap-2">
                  <span>Estoque atual: <strong className="text-gray-900 dark:text-white">{selectedAsset.quantity}</strong></span>
                  <span>Mínimo: <strong className="text-gray-900 dark:text-white">{selectedAsset.minStock}</strong></span>
                  <span>Valor unit.: <strong className="text-gray-900 dark:text-white">R$ {selectedAsset.unitValue}</strong></span>
                </div>
              )}
            </div>

            <Input
              label="Quantidade *"
              type="number"
              min="1"
              value={form.quantity}
              onChange={e => set('quantity', e.target.value)}
            />
            <Input
              label="Valor Unitário (R$)"
              type="number"
              step="0.01"
              min="0"
              value={form.unitValue}
              onChange={e => set('unitValue', e.target.value)}
              placeholder="0.00"
            />
            <Input
              label="Data *"
              type="date"
              value={form.date}
              onChange={e => set('date', e.target.value)}
            />

            {isIn && (
              <Select label="Fornecedor" value={form.supplierId} onChange={e => set('supplierId', e.target.value)}>
                <option value="">Selecionar fornecedor</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            )}

            {!isIn && (
              <>
                <Select label="Setor Destino *" value={form.sectorId} onChange={e => set('sectorId', e.target.value)}>
                  <option value="">Selecionar setor</option>
                  {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
                <Select label="Usuário Responsável" value={form.userId} onChange={e => set('userId', e.target.value)}>
                  <option value="">Selecionar usuário</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </Select>
                <Input
                  label="Responsável (texto livre)"
                  value={form.responsible}
                  onChange={e => set('responsible', e.target.value)}
                  placeholder="Nome do responsável"
                />
              </>
            )}

            <div className="sm:col-span-2">
              <Textarea
                label="Observações"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Informações adicionais..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => router.back()}>Cancelar</Button>
            <Button
              loading={loading}
              variant={isIn ? 'primary' : 'secondary'}
              className={!isIn ? '!bg-amber-500 hover:!bg-amber-600 !text-white' : ''}
              onClick={handleSubmit}
            >
              {isIn ? 'Registrar Entrada' : 'Registrar Saída'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
