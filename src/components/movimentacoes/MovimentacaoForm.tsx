'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button, Input, Textarea } from '@/components/ui'
import { User, Trash2, Tag } from 'lucide-react'
import type { Produto, Fornecedor, Setor } from '@/types'

interface InventarioItem {
  responsavel: string
  etiqueta: string
}

export function MovimentacaoForm({ tipo }: { tipo: 'ENTRADA' | 'SAIDA' }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [setores, setSetores] = useState<Setor[]>([])
  const [subtipo, setSubtipo] = useState<'USUARIO' | 'DESCARTE'>('USUARIO')
  const [modoEntrada, setModoEntrada] = useState<'CADASTRO' | 'DEVOLUCAO'>('CADASTRO')
  const [itensInventario, setItensInventario] = useState<InventarioItem[]>([])
  const [form, setForm] = useState({
    produtoId: '',
    etiqueta: '',
    data: new Date().toISOString().split('T')[0],
    fornecedorId: '',
    setorId: '',
    funcionarioRecebe: '',
    funcionarioDevolve: '',
    observacoes: '',
    valorUnitario: '',
  })
  const s = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setErros(e => ({ ...e, [k]: '' })) }

  useEffect(() => {
    fetch('/api/produtos').then(r => r.json()).then(setProdutos)
    fetch('/api/fornecedores').then(r => r.json()).then(setFornecedores)
    fetch('/api/setores').then(r => r.json()).then(setSetores)
    fetch('/api/inventario')
      .then(r => r.ok ? r.json() : [])
      .then((dados) => {
        if (!Array.isArray(dados)) return setItensInventario([])
        setItensInventario(dados.map((item) => ({ responsavel: item.responsavel ?? '', etiqueta: item.etiqueta ?? '' })))
      })
      .catch(() => setItensInventario([]))
  }, [])

  // Preenche fornecedor e valor ao selecionar produto
  const onProdutoChange = (id: string) => {
    s('produtoId', id)
    const p = produtos.find(x => x.id === id)
    if (!p) return
    if (p.fornecedorId) setForm(f => ({ ...f, produtoId: id, fornecedorId: p.fornecedorId!, valorUnitario: p.valorUnitario.toString() }))
    else setForm(f => ({ ...f, produtoId: id, valorUnitario: p.valorUnitario.toString() }))
  }

  const produtoSel = produtos.find(p => p.id === form.produtoId)

  const validar = () => {
    const e: Record<string, string> = {}
    if (!form.etiqueta.trim() && (tipo === 'SAIDA' || modoEntrada === 'CADASTRO'))
      e.etiqueta = tipo === 'ENTRADA' ? 'Informe a etiqueta do item' : 'Informe a etiqueta do item a ser baixado'
    if (!form.data) e.data = 'Informe a data'
    if (tipo === 'ENTRADA' && modoEntrada === 'CADASTRO' && !form.produtoId) e.produtoId = 'Selecione um produto'
    if (tipo === 'ENTRADA' && modoEntrada === 'DEVOLUCAO' && !form.funcionarioDevolve.trim())
      e.funcionarioDevolve = 'Selecione o funcionário para devolver os itens'
    if (tipo === 'SAIDA' && subtipo === 'USUARIO') {
      if (!form.setorId) e.setorId = 'Selecione o setor destino'
      if (!form.funcionarioRecebe.trim()) e.funcionarioRecebe = 'Informe o funcionário que receberá o item'
    }
    if (tipo === 'SAIDA' && subtipo === 'DESCARTE') {
      if (!form.observacoes.trim()) e.observacoes = 'Informe o motivo do descarte'
    }
    setErros(e)
    return Object.keys(e).length === 0
  }

  const salvar = async () => {
    if (!validar()) return
    setLoading(true)
    const res = await fetch('/api/movimentacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo,
        subtipo: tipo === 'SAIDA' ? subtipo : (modoEntrada === 'DEVOLUCAO' ? 'DEVOLUCAO' : undefined),
        produtoId: form.produtoId,
        etiqueta: form.etiqueta.trim(),
        dataCompra: tipo === 'ENTRADA' ? form.data : undefined,
        data: form.data,
        fornecedorId: form.fornecedorId || null,
        setorId: form.setorId || null,
        funcionarioRecebe: form.funcionarioRecebe.trim() || null,
        funcionarioDevolve: form.funcionarioDevolve.trim() || null,
        valorUnitario: form.valorUnitario,
        usuarioId: session?.user.id,
        responsavel: tipo === 'SAIDA' && subtipo === 'USUARIO'
          ? form.funcionarioRecebe.trim()
          : tipo === 'ENTRADA' && modoEntrada === 'DEVOLUCAO'
            ? form.funcionarioDevolve.trim()
          : (session?.user.name ?? session?.user.email),
        observacoes: tipo === 'ENTRADA' && modoEntrada === 'DEVOLUCAO'
          ? `Devolução de itens de: ${form.funcionarioDevolve.trim()}${form.observacoes ? ' | ' + form.observacoes : ''}`
          : tipo === 'SAIDA' && subtipo === 'USUARIO' && form.funcionarioRecebe
          ? `Registrado por: ${session?.user.name ?? session?.user.email}${form.observacoes ? ' | ' + form.observacoes : ''}`
          : form.observacoes,
      }),
    })
  const data = await res.json()
  if (!res.ok) { setErros({ geral: data.error || 'Erro ao salvar' }); setLoading(false); return }
    if (tipo === 'ENTRADA' && modoEntrada === 'DEVOLUCAO' && data?.pendencias?.length) {
      setErros({
        geral: `Devolução concluída com ${data.quantidadeDevolvida} item(ns). Pendências: ${data.pendencias.map((p: { etiqueta: string, motivo: string }) => `${p.etiqueta} (${p.motivo})`).join(', ')}`,
      })
    }
    router.push('/movimentacoes')
  }

  const responsaveisInventario = [...new Set(
    itensInventario
      .map(item => item.responsavel?.trim())
      .filter(Boolean),
  )].sort((a, b) => a.localeCompare(b, 'pt-BR'))

  const itensParaDevolver = itensInventario.filter(
    item => item.responsavel.trim().toLowerCase() === form.funcionarioDevolve.trim().toLowerCase(),
  )

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {tipo === 'ENTRADA' ? '📥 Entrada de Estoque' : '📤 Saída de Estoque'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {tipo === 'ENTRADA' ? 'Registre a chegada de um item com sua etiqueta' : 'Registre a saída ou descarte de um item'}
        </p>
      </div>

      {session?.user && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
          {session.user.image
            ? <img src={session.user.image} className="w-7 h-7 rounded-full flex-shrink-0" alt="" />
            : <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center"><span className="text-xs font-bold text-white">{session.user.name?.charAt(0)?.toUpperCase() ?? '?'}</span></div>}
          <div>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Registrado por</p>
            <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">{session.user.name ?? session.user.email}</p>
          </div>
        </div>
      )}

      {erros.geral && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600">{erros.geral}</div>}

      {/* Toggle saída/descarte */}
      {tipo === 'ENTRADA' && (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => { setModoEntrada('CADASTRO'); setErros({}) }}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${modoEntrada === 'CADASTRO' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'}`}>
            <Tag className="w-4 h-4" /> Entrada Individual
          </button>
          <button onClick={() => { setModoEntrada('DEVOLUCAO'); setErros({}) }}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${modoEntrada === 'DEVOLUCAO' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'}`}>
            <User className="w-4 h-4" /> Devolução por Funcionário
          </button>
        </div>
      )}

      {tipo === 'SAIDA' && (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => { setSubtipo('USUARIO'); setErros({}) }}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${subtipo === 'USUARIO' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'}`}>
            <User className="w-4 h-4" /> Saída para Usuário
          </button>
          <button onClick={() => { setSubtipo('DESCARTE'); setErros({}) }}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${subtipo === 'DESCARTE' ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'}`}>
            <Trash2 className="w-4 h-4" /> Descarte
          </button>
        </div>
      )}

      {tipo === 'SAIDA' && subtipo === 'DESCARTE' && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          ⚠️ O item será marcado como descartado e removido do estoque ativo.
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-5">

        {/* Etiqueta — campo principal */}
        {(tipo === 'SAIDA' || modoEntrada === 'CADASTRO') && (
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              <Tag className="w-3.5 h-3.5 inline mr-1" />
              Etiqueta do Item *
            </label>
            <input
              value={form.etiqueta}
              onChange={e => s('etiqueta', e.target.value)}
              placeholder={tipo === 'ENTRADA' ? 'Ex: ETQ-0001' : 'Etiqueta do item a ser baixado'}
              className={`w-full border bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono ${erros.etiqueta ? 'border-red-400' : 'border-gray-300 dark:border-gray-700'}`}
            />
            {erros.etiqueta && <p className="text-xs text-red-500">{erros.etiqueta}</p>}
            {tipo === 'SAIDA' && <p className="text-xs text-gray-400">O produto e valor serão identificados automaticamente pela etiqueta</p>}
          </div>
        )}

        {/* Produto — só na entrada */}
        {tipo === 'ENTRADA' && modoEntrada === 'CADASTRO' && (
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Produto *</label>
            <select
              value={form.produtoId}
              onChange={e => onProdutoChange(e.target.value)}
              className={`w-full border bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${erros.produtoId ? 'border-red-400' : 'border-gray-300 dark:border-gray-700'}`}>
              <option value="">Selecionar produto</option>
              {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} — {p.codigo}</option>)}
            </select>
            {erros.produtoId && <p className="text-xs text-red-500">{erros.produtoId}</p>}
          </div>
        )}

        {/* Valor e fornecedor preenchidos automaticamente na entrada */}
        {tipo === 'ENTRADA' && modoEntrada === 'CADASTRO' && produtoSel && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Dados do produto</p>
            <p className="text-sm text-blue-800 dark:text-blue-300">Valor: <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produtoSel.valorUnitario)}</strong></p>
            {produtoSel.fornecedor && <p className="text-sm text-blue-800 dark:text-blue-300">Fornecedor: <strong>{produtoSel.fornecedor.nome}</strong></p>}
          </div>
        )}

        {tipo === 'ENTRADA' && modoEntrada === 'CADASTRO' && (
          <>
            <Input label="Data de Compra *" type="date" value={form.data} onChange={e => s('data', e.target.value)} error={erros.data} />
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Fornecedor</label>
              <select value={form.fornecedorId} onChange={e => s('fornecedorId', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                <option value="">Mesmo do produto</option>
                {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
          </>
        )}

        {tipo === 'ENTRADA' && modoEntrada === 'DEVOLUCAO' && (
          <>
            <Input label="Data da devolução *" type="date" value={form.data} onChange={e => s('data', e.target.value)} error={erros.data} />
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Funcionário *</label>
              <select
                value={form.funcionarioDevolve}
                onChange={e => s('funcionarioDevolve', e.target.value)}
                className={`w-full border bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${erros.funcionarioDevolve ? 'border-red-400' : 'border-gray-300 dark:border-gray-700'}`}>
                <option value="">Selecionar funcionário</option>
                {responsaveisInventario.map(nome => <option key={nome} value={nome}>{nome}</option>)}
              </select>
              {erros.funcionarioDevolve && <p className="text-xs text-red-500">{erros.funcionarioDevolve}</p>}
            </div>
            {form.funcionarioDevolve && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg space-y-1">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {itensParaDevolver.length} item(ns) serão devolvidos ao estoque
                </p>
                {itensParaDevolver.length > 0 && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 font-mono">
                    Etiquetas: {itensParaDevolver.map(i => i.etiqueta).join(', ')}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {tipo === 'SAIDA' && (
          <Input label="Data *" type="date" value={form.data} onChange={e => s('data', e.target.value)} error={erros.data} />
        )}

        {tipo === 'SAIDA' && subtipo === 'USUARIO' && (
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
            <Input label="Funcionário que receberá o item *" value={form.funcionarioRecebe} onChange={e => s('funcionarioRecebe', e.target.value)} error={erros.funcionarioRecebe} placeholder="Nome completo" />
          </>
        )}

        <Textarea
          label={subtipo === 'DESCARTE' ? 'Motivo do descarte *' : modoEntrada === 'DEVOLUCAO' ? 'Observações da devolução' : 'Observações'}
          value={form.observacoes}
          onChange={e => s('observacoes', e.target.value)}
          placeholder={subtipo === 'DESCARTE' ? 'Ex: Equipamento danificado, queimado, sem conserto...' : modoEntrada === 'DEVOLUCAO' ? 'Ex: colaborador desligado, fim de contrato...' : 'Informações adicionais...'}
          rows={3}
        />
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => router.back()}>Cancelar</Button>
        <Button loading={loading} variant={subtipo === 'DESCARTE' ? 'danger' : 'primary'} onClick={salvar}>
          {tipo === 'ENTRADA'
            ? (modoEntrada === 'DEVOLUCAO' ? 'Devolver Itens ao Estoque' : 'Registrar Entrada')
            : subtipo === 'DESCARTE' ? 'Confirmar Descarte' : 'Registrar Saída'}
        </Button>
      </div>
    </div>
  )
}
