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
  const [erros, setErros] = useState<Record<string, string>>({})
  const [ativos, setAtivos] = useState<Ativo[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [setores, setSetores] = useState<Setor[]>([])
  const [form, setForm] = useState({
    ativoId: '',
    quantidade: '',
    valorUnitario: '',
    data: new Date().toISOString().split('T')[0],
    fornecedorId: '',
    setorId: '',
    funcionarioRecebe: '',
    observacoes: '',
  })
  const s = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    setErros(e => ({ ...e, [k]: '' }))
  }

  useEffect(() => {
    fetch('/api/ativos').then(r => r.json()).then(setAtivos)
    fetch('/api/fornecedores').then(r => r.json()).then(setFornecedores)
    fetch('/api/setores').then(r => r.json()).then(setSetores)
  }, [])

  const ativoSel = ativos.find(a => a.id === form.ativoId)

  const validar = () => {
    const novosErros: Record<string, string> = {}
    if (!form.ativoId) novosErros.ativoId = 'Selecione um produto'
    if (!form.quantidade || parseInt(form.quantidade) < 1) novosErros.quantidade = 'Quantidade deve ser maior que zero'
    if (!form.data) novosErros.data = 'Informe a data'
    if (tipo === 'SAIDA') {
      if (!form.setorId) novosErros.setorId = 'Selecione o setor destino'
      if (!form.funcionarioRecebe.trim()) novosErros.funcionarioRecebe = 'Informe o funcionário que receberá o ativo'
      if (ativoSel && parseInt(form.quantidade) > ativoSel.quantidade) {
        novosErros.quantidade = `Estoque insuficiente (disponível: ${ativoSel.quantidade})`
      }
    }
    if (tipo === 'ENTRADA') {
      if (!form.valorUnitario || parseFloat(form.valorUnitario) <= 0) novosErros.valorUnitario = 'Informe o valor unitário'
    }
    setErros(novosErros)
    return Object.keys(novosErros).length === 0
  }

  const salvar = async () => {
    if (!validar()) return
    setLoading(true)
    const res = await fetch('/api/movimentacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        tipo,
        usuarioId: session?.user.id,
        responsavel: session?.user.name ?? session?.user.email,
        observacoes: tipo === 'SAIDA' && form.funcionarioRecebe
          ? `Recebido por: ${form.funcionarioRecebe}${form.observacoes ? ' | ' + form.observacoes : ''}`
          : form.observacoes,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setErros({ geral: data.error || 'Erro ao salvar' }); setLoading(false); return }
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
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
          {session.user.image
            ? <img src={session.user.image} className="w-7 h-7 rounded-full flex-shrink-0" alt="" />
            : <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0"><span className="text-xs font-bold text-white">{session.user.name?.charAt(0)?.toUpperCase() ?? '?'}</span></div>}
          <div>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Registrado por</p>
            <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">{session.user.name ?? session.user.email}</p>
          </div>
        </div>
      )}

      {erros.geral && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600">{erros.geral}</div>}

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-5">

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Produto *</label>
          <select
            value={form.ativoId}
            onChange={e => { s('ativoId', e.target.value); const a = ativos.find(x => x.id === e.target.value); if (a && tipo === 'ENTRADA') s('valorUnitario', a.valorUnitario.toString()) }}
            className={`w-full border bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${erros.ativoId ? 'border-red-400' : 'border-gray-300 dark:border-gray-700'}`}>
            <option value="">Selecionar produto</option>
            {ativos.map(a => <option key={a.id} value={a.id}>{a.nome} — {a.codigo} (estoque: {a.quantidade})</option>)}
          </select>
          {erros.ativoId && <p className="text-xs text-red-500">{erros.ativoId}</p>}
        </div>

        {ativoSel && tipo === 'SAIDA' && ativoSel.quantidade <= 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-xs text-amber-700 dark:text-amber-400">
            ⚠️ Atenção: este produto está com estoque baixo ({ativoSel.quantidade} unidades)
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input label="Quantidade *" type="number" min="1" value={form.quantidade} onChange={e => s('quantidade', e.target.value)} error={erros.quantidade} placeholder="0" />
          <Input label={tipo === 'ENTRADA' ? 'Valor Unitário (R$) *' : 'Valor Unitário (R$)'} type="number" step="0.01" min="0" value={form.valorUnitario} onChange={e => s('valorUnitario', e.target.value)} error={erros.valorUnitario} placeholder="0,00" />
        </div>

        <Input label="Data *" type="date" value={form.data} onChange={e => s('data', e.target.value)} error={erros.data} />

        {tipo === 'ENTRADA' && (
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Fornecedor</label>
            <select value={form.fornecedorId} onChange={e => s('fornecedorId', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all">
              <option value="">Selecionar fornecedor</option>
              {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
        )}

        {tipo === 'SAIDA' && (
          <>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Setor Destino *</label>
              <select value={form.setorId} onChange={e => s('setorId', e.target.value)}
                className={`w-full border bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${erros.setorId ? 'border-red-400' : 'border-gray-300 dark:border-gray-700'}`}>
                <option value="">Selecionar setor</option>
                {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
              {erros.setorId && <p className="text-xs text-red-500">{erros.setorId}</p>}
            </div>

            <Input
              label="Funcionário que receberá o ativo *"
              value={form.funcionarioRecebe}
              onChange={e => s('funcionarioRecebe', e.target.value)}
              error={erros.funcionarioRecebe}
              placeholder="Nome completo do funcionário"
            />
          </>
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
