'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button, Input, Select, Textarea } from '@/components/ui'
import type { Ativo, Fornecedor, Setor } from '@/types'

export function MovimentacaoForm({ tipo }: { tipo: 'ENTRADA' | 'SAIDA' }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [ativos, setAtivos] = useState<Ativo[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [setores, setSetores] = useState<Setor[]>([])
  const [form, setForm] = useState({
    ativoId: '', quantidade: '1', valorUnitario: '',
    data: new Date().toISOString().split('T')[0],
    fornecedorId: '', setorId: '', observacoes: '',
  })
  const s = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    fetch('/api/ativos').then(r => r.json()).then(setAtivos)
    fetch('/api/fornecedores').then(r => r.json()).then(setFornecedores)
    fetch('/api/setores').then(r => r.json()).then(setSetores)
  }, [])

  const ativoSel = ativos.find(a => a.id === form.ativoId)

  const salvar = async () => {
    if (!form.ativoId || !form.quantidade) { setErro('Ativo e quantidade são obrigatórios'); return }
    setLoading(true); setErro('')
    const res = await fetch('/api/movimentacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        tipo,
        usuarioId: session?.user.id,
        responsavel: session?.user.name ?? session?.user.email,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setErro(data.error || 'Erro ao salvar'); setLoading(false); return }
    router.push('/movimentacoes')
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {tipo === 'ENTRADA' ? '📥 Entrada de Estoque' : '📤 Saída de Estoque'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {tipo === 'ENTRADA' ? 'Registre a chegada de itens no estoque' : 'Registre a saída de itens do estoque'}
        </p>
      </div>

      {session?.user && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl text-sm text-blue-700 dark:text-blue-400">
          <span className="font-semibold">Responsável:</span> {session.user.name ?? session.user.email}
        </div>
      )}

      {erro && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600">{erro}</div>}

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-5">
        <Select label="Produto *" value={form.ativoId} onChange={e => { s('ativoId', e.target.value); const a = ativos.find(x => x.id === e.target.value); if (a) s('valorUnitario', a.valorUnitario.toString()) }}>
          <option value="">Selecionar produto</option>
          {ativos.map(a => <option key={a.id} value={a.id}>{a.nome} — {a.codigo} (estoque: {a.quantidade})</option>)}
        </Select>

        {ativoSel && tipo === 'SAIDA' && ativoSel.quantidade <= ativoSel.estoqueMinimo && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-xs text-amber-700 dark:text-amber-400">
            ⚠️ Atenção: este produto está com estoque baixo ({ativoSel.quantidade} unidades)
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input label="Quantidade *" type="number" min="1" value={form.quantidade} onChange={e => s('quantidade', e.target.value)} />
          <Input label="Valor Unitário (R$)" type="number" step="0.01" min="0" value={form.valorUnitario} onChange={e => s('valorUnitario', e.target.value)} />
        </div>

        <Input label="Data" type="date" value={form.data} onChange={e => s('data', e.target.value)} />

        {tipo === 'ENTRADA' && (
          <Select label="Fornecedor" value={form.fornecedorId} onChange={e => s('fornecedorId', e.target.value)}>
            <option value="">Selecionar fornecedor</option>
            {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </Select>
        )}

        {tipo === 'SAIDA' && (
          <Select label="Setor Destino" value={form.setorId} onChange={e => s('setorId', e.target.value)}>
            <option value="">Selecionar setor</option>
            {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </Select>
        )}

        <Textarea label="Observações" value={form.observacoes} onChange={e => s('observacoes', e.target.value)} placeholder="Informações adicionais..." rows={3} />
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => router.back()}>Cancelar</Button>
        <Button loading={loading} onClick={salvar}>Registrar {tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}</Button>
      </div>
    </div>
  )
}
