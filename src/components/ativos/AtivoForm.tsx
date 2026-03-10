'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Select, Textarea } from '@/components/ui'
import type { Ativo, Fornecedor } from '@/types'

export function AtivoForm({ ativo, fornecedores, onSuccess, onCancel }: { ativo?: Ativo; fornecedores: Fornecedor[]; onSuccess?: () => void; onCancel?: () => void }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [form, setForm] = useState({
    nome: ativo?.nome ?? '', codigo: ativo?.codigo ?? '', etiqueta: ativo?.etiqueta ?? '',
    fornecedorId: ativo?.fornecedorId ?? '', linkCompra: ativo?.linkCompra ?? '',
    valorUnitario: ativo?.valorUnitario?.toString() ?? '', quantidade: ativo?.quantidade?.toString() ?? '0',
    estoqueMinimo: ativo?.estoqueMinimo?.toString() ?? '5',
    dataCompra: ativo?.dataCompra ? ativo.dataCompra.split('T')[0] : '', observacoes: ativo?.observacoes ?? '',
  })
  const s = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const salvar = async () => {
    if (!form.nome || !form.codigo) { setErro('Nome e código são obrigatórios'); return }
    setLoading(true); setErro('')
    try {
      const res = await fetch(ativo ? `/api/ativos/${ativo.id}` : '/api/ativos', {
        method: ativo ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.error || 'Erro ao salvar'); setLoading(false); return }
      if (onSuccess) onSuccess(); else router.push('/ativos')
    } catch { setErro('Erro ao salvar'); setLoading(false) }
  }

  return (
    <div className="space-y-5">
      {erro && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600">{erro}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2"><Input label="Nome do Produto *" value={form.nome} onChange={e => s('nome', e.target.value)} placeholder="Ex: Notebook Dell Latitude 5520" /></div>
        <Input label="Código *" value={form.codigo} onChange={e => s('codigo', e.target.value)} placeholder="Ex: NOTE-001" />
        <Input label="Etiqueta" value={form.etiqueta} onChange={e => s('etiqueta', e.target.value)} placeholder="Ex: ETQ-0001" />
        <Select label="Fornecedor" value={form.fornecedorId} onChange={e => s('fornecedorId', e.target.value)}>
          <option value="">Selecionar fornecedor</option>
          {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </Select>
        <Input label="Data da Compra" type="date" value={form.dataCompra} onChange={e => s('dataCompra', e.target.value)} />
        <Input label="Valor Unitário (R$)" type="number" step="0.01" min="0" value={form.valorUnitario} onChange={e => s('valorUnitario', e.target.value)} placeholder="0.00" />
        <Input label="Link de Compra" value={form.linkCompra} onChange={e => s('linkCompra', e.target.value)} placeholder="https://..." />
        {!ativo && <Input label="Quantidade Inicial" type="number" min="0" value={form.quantidade} onChange={e => s('quantidade', e.target.value)} />}
        <Input label="Estoque Mínimo" type="number" min="0" value={form.estoqueMinimo} onChange={e => s('estoqueMinimo', e.target.value)} />
        <div className="sm:col-span-2"><Textarea label="Observações" value={form.observacoes} onChange={e => s('observacoes', e.target.value)} placeholder="Informações adicionais..." rows={3} /></div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        {onCancel && <Button variant="secondary" onClick={onCancel}>Cancelar</Button>}
        <Button loading={loading} onClick={salvar}>{ativo ? 'Salvar alterações' : 'Cadastrar Ativo'}</Button>
      </div>
    </div>
  )
}
