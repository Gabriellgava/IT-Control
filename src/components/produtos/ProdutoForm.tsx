'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Select, Textarea } from '@/components/ui'
import type { Produto, Categoria, Fornecedor } from '@/types'

export function ProdutoForm({ produto, categorias, fornecedores, onSuccess, onCancel }: {
  produto?: Produto
  categorias: Categoria[]
  fornecedores: Fornecedor[]
  onSuccess?: () => void
  onCancel?: () => void
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [form, setForm] = useState({
    nome: produto?.nome ?? '',
    codigo: produto?.codigo ?? '',
    categoriaId: produto?.categoriaId ?? '',
    fornecedorId: produto?.fornecedorId ?? '',
    valorUnitario: produto?.valorUnitario?.toString() ?? '',
    linkCompra: produto?.linkCompra ?? '',
    observacoes: produto?.observacoes ?? '',
  })
  const s = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const salvar = async () => {
    if (!form.nome || !form.codigo) { setErro('Nome e código são obrigatórios'); return }
    setLoading(true); setErro('')
    const res = await fetch(produto ? `/api/produtos/${produto.id}` : '/api/produtos', {
      method: produto ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setErro(data.error || 'Erro ao salvar'); setLoading(false); return }
    if (onSuccess) onSuccess(); else router.push('/produtos')
  }

  return (
    <div className="space-y-5">
      {erro && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600">{erro}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Input label="Nome do Produto *" value={form.nome} onChange={e => s('nome', e.target.value)} placeholder="Ex: Mouse com fio Pichau" />
        </div>
        <Input label="Código do Modelo *" value={form.codigo} onChange={e => s('codigo', e.target.value)} placeholder="Ex: MOUSE-001" />
        <Input label="Valor Unitário (R$)" type="number" step="0.01" min="0" value={form.valorUnitario} onChange={e => s('valorUnitario', e.target.value)} placeholder="0,00" />
        <Select label="Categoria" value={form.categoriaId} onChange={e => s('categoriaId', e.target.value)}>
          <option value="">Selecionar categoria</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nome} (mín. {c.estoqueMinimo})</option>)}
        </Select>
        <Select label="Fornecedor padrão" value={form.fornecedorId} onChange={e => s('fornecedorId', e.target.value)}>
          <option value="">Selecionar fornecedor</option>
          {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </Select>
        <div className="sm:col-span-2">
          <Input label="Link de Compra" value={form.linkCompra} onChange={e => s('linkCompra', e.target.value)} placeholder="https://..." />
        </div>
        <div className="sm:col-span-2">
          <Textarea label="Observações" value={form.observacoes} onChange={e => s('observacoes', e.target.value)} placeholder="Especificações técnicas, informações adicionais..." rows={3} />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        {onCancel && <Button variant="secondary" onClick={onCancel}>Cancelar</Button>}
        <Button loading={loading} onClick={salvar}>{produto ? 'Salvar alterações' : 'Cadastrar Produto'}</Button>
      </div>
    </div>
  )
}
