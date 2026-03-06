'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Select, Textarea } from '@/components/ui'
import type { Ativo, Fornecedor } from '@/types'

interface AssetFormProps {
  ativo?: Ativo
  fornecedores: Fornecedor[]
  onSuccess?: () => void
  onCancel?: () => void
}

export function AssetForm({ ativo, fornecedores, onSuccess, onCancel }: AssetFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [form, setForm] = useState({
    nome: ativo?.nome ?? '',
    codigo: ativo?.codigo ?? '',
    etiqueta: ativo?.etiqueta ?? '',
    fornecedorId: ativo?.fornecedorId ?? '',
    linkCompra: ativo?.linkCompra ?? '',
    valorUnitario: ativo?.valorUnitario?.toString() ?? '',
    quantidade: ativo?.quantidade?.toString() ?? '0',
    estoqueMinimo: ativo?.estoqueMinimo?.toString() ?? '5',
    dataCompra: ativo?.dataCompra ? ativo.dataCompra.split('T')[0] : '',
    observacoes: ativo?.observacoes ?? '',
  })

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async () => {
    if (!form.nome || !form.codigo) { setErro('Nome e código são obrigatórios'); return }
    setLoading(true); setErro('')
    try {
      const url = ativo ? `/api/assets/${ativo.id}` : '/api/assets'
      const method = ativo ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.error || 'Erro ao salvar'); setLoading(false); return }
      if (onSuccess) onSuccess()
      else router.push('/assets')
    } catch {
      setErro('Erro ao salvar ativo')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {erro && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
          {erro}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Input label="Nome do Produto *" value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Notebook Dell Latitude 5520" />
        </div>
        <Input label="Código do Produto *" value={form.codigo} onChange={e => set('codigo', e.target.value)} placeholder="Ex: NOTE-001" />
        <Input label="Etiqueta (Tag)" value={form.etiqueta} onChange={e => set('etiqueta', e.target.value)} placeholder="Ex: ETQ-0001" />
        <Select label="Fornecedor" value={form.fornecedorId} onChange={e => set('fornecedorId', e.target.value)}>
          <option value="">Selecionar fornecedor</option>
          {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </Select>
        <Input label="Data da Compra" type="date" value={form.dataCompra} onChange={e => set('dataCompra', e.target.value)} />
        <Input label="Valor Unitário (R$)" type="number" step="0.01" min="0" value={form.valorUnitario} onChange={e => set('valorUnitario', e.target.value)} placeholder="0.00" />
        <Input label="Link de Compra" value={form.linkCompra} onChange={e => set('linkCompra', e.target.value)} placeholder="https://..." />
        {!ativo && (
          <Input label="Quantidade Inicial" type="number" min="0" value={form.quantidade} onChange={e => set('quantidade', e.target.value)} />
        )}
        <Input label="Estoque Mínimo" type="number" min="0" value={form.estoqueMinimo} onChange={e => set('estoqueMinimo', e.target.value)} />
        <div className="sm:col-span-2">
          <Textarea label="Observações" value={form.observacoes} onChange={e => set('observacoes', e.target.value)} placeholder="Informações adicionais..." rows={3} />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && <Button variant="secondary" onClick={onCancel}>Cancelar</Button>}
        <Button loading={loading} onClick={handleSubmit}>
          {ativo ? 'Salvar alterações' : 'Cadastrar Ativo'}
        </Button>
      </div>
    </div>
  )
}
