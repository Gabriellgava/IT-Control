'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button, Input, Textarea } from '@/components/ui'
import { User, Trash2, Tag } from 'lucide-react'
import type { Produto, Fornecedor, Funcionario } from '@/types'

interface InventarioItem {
  responsavel: string
  etiqueta: string
  modelo: string
  marca: string
  tipo: string
}

interface AtivoSaida {
  etiqueta: string
  produtoNome: string
  categoriaNome: string
}

interface UnidadeSaida {
  etiqueta: string
  status: 'ATIVA' | 'DESCARTADA'
  localAtual?: string
}

export function MovimentacaoForm({ tipo }: { tipo: 'ENTRADA' | 'SAIDA' }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [subtipo, setSubtipo] = useState<'USUARIO' | 'DESCARTE'>('USUARIO')
  const [modoEntrada, setModoEntrada] = useState<'CADASTRO' | 'DEVOLUCAO'>('CADASTRO')
  const [modoDevolucao, setModoDevolucao] = useState<'TODOS' | 'UM'>('TODOS')
  const [itensInventario, setItensInventario] = useState<InventarioItem[]>([])
  const [filtroAtivo, setFiltroAtivo] = useState<'ETIQUETA' | 'PRODUTO' | 'CATEGORIA'>('ETIQUETA')
  const [buscaAtivo, setBuscaAtivo] = useState('')
  const [ativosSelecionados, setAtivosSelecionados] = useState<AtivoSaida[]>([])
  const [form, setForm] = useState({
    produtoId: '',
    etiqueta: '',
    data: new Date().toISOString().split('T')[0],
    fornecedorId: '',
    setorId: '',
    funcionarioId: '',
    funcionarioDevolve: '',
    observacoes: '',
    valorUnitario: '',
  })
  const s = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setErros(e => ({ ...e, [k]: '' })) }

  useEffect(() => {
    fetch('/api/produtos').then(r => r.json()).then(setProdutos)
    fetch('/api/fornecedores').then(r => r.json()).then(setFornecedores)
    fetch('/api/funcionarios').then(r => r.json()).then((dados) => setFuncionarios(Array.isArray(dados) ? dados.filter((f) => f.ativo) : []))
    fetch('/api/inventario')
      .then(r => r.ok ? r.json() : [])
      .then((dados) => {
        if (!Array.isArray(dados)) return setItensInventario([])
        setItensInventario(dados.map((item) => ({
          responsavel: item.responsavel ?? '',
          etiqueta: item.etiqueta ?? '',
          modelo: item.modelo ?? '',
          marca: item.marca ?? '',
          tipo: item.tipo ?? '',
        })))
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
  const funcionarioSelecionado = funcionarios.find((f) => f.id === form.funcionarioId)
  const etiquetasSaida = ativosSelecionados.map((item) => item.etiqueta)
  const ativosDisponiveisSaida = useMemo<AtivoSaida[]>(() => (
    produtos.flatMap((produto) => (
      ((produto.unidades || []) as UnidadeSaida[])
        .filter((unidade) =>
          unidade.status === 'ATIVA' && unidade.localAtual?.toLowerCase() === 'estoque',
        )
        .map((unidade) => ({
          etiqueta: unidade.etiqueta,
          produtoNome: produto.nome,
          categoriaNome: produto.categoria?.nome || 'Sem categoria',
        }))
    ))
  ), [produtos])

  const ativosFiltrados = useMemo(() => {
    const termo = buscaAtivo.trim().toLowerCase()
    const etiquetasSelecionadas = new Set(ativosSelecionados.map((item) => item.etiqueta.toLowerCase()))

    return ativosDisponiveisSaida
      .filter((ativo) => !etiquetasSelecionadas.has(ativo.etiqueta.toLowerCase()))
      .filter((ativo) => {
        if (!termo) return true
        if (filtroAtivo === 'ETIQUETA') return ativo.etiqueta.toLowerCase().includes(termo)
        if (filtroAtivo === 'PRODUTO') return ativo.produtoNome.toLowerCase().includes(termo)
        return ativo.categoriaNome.toLowerCase().includes(termo)
      })
      .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'pt-BR'))
  }, [ativosDisponiveisSaida, ativosSelecionados, buscaAtivo, filtroAtivo])

  const adicionarAtivoSaida = (ativo: AtivoSaida) => {
    setAtivosSelecionados((atual) => {
      if (atual.some((item) => item.etiqueta.toLowerCase() === ativo.etiqueta.toLowerCase())) return atual
      return [...atual, ativo]
    })
    setErros((atual) => ({ ...atual, etiqueta: '' }))
    setBuscaAtivo('')
  }

  const removerAtivoSaida = (etiqueta: string) => {
    setAtivosSelecionados((atual) => atual.filter((item) => item.etiqueta !== etiqueta))
  }

  const validar = () => {
    const e: Record<string, string> = {}
    if (tipo === 'ENTRADA' && modoEntrada === 'CADASTRO' && !form.etiqueta.trim())
      e.etiqueta = 'Informe a etiqueta do item'
    if (!form.data) e.data = 'Informe a data'
    if (tipo === 'ENTRADA' && modoEntrada === 'CADASTRO' && !form.produtoId) e.produtoId = 'Selecione um produto'
    if (tipo === 'ENTRADA' && modoEntrada === 'DEVOLUCAO' && !form.funcionarioDevolve.trim())
      e.funcionarioDevolve = 'Selecione o funcionário para devolver os itens'
    if (tipo === 'ENTRADA' && modoEntrada === 'DEVOLUCAO' && modoDevolucao === 'UM' && !form.etiqueta.trim())
      e.etiqueta = 'Selecione o item que será devolvido'
    if (tipo === 'SAIDA' && subtipo === 'USUARIO') {
      if (!form.funcionarioId) e.funcionarioId = 'Selecione o funcionário que receberá os itens'
      if (etiquetasSaida.length === 0) e.etiqueta = 'Informe ao menos uma etiqueta'
    }
    if (tipo === 'SAIDA' && subtipo === 'DESCARTE') {
      if (etiquetasSaida.length === 0) e.etiqueta = 'Informe ao menos uma etiqueta'
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
        etiqueta: tipo === 'ENTRADA' && modoEntrada === 'DEVOLUCAO' && modoDevolucao === 'TODOS'
          ? ''
          : form.etiqueta.trim(),
        etiquetas: tipo === 'SAIDA' ? etiquetasSaida : undefined,
        dataCompra: tipo === 'ENTRADA' ? form.data : undefined,
        data: form.data,
        fornecedorId: form.fornecedorId || null,
        setorId: subtipo === 'USUARIO' ? funcionarioSelecionado?.setorId || null : form.setorId || null,
        funcionarioId: form.funcionarioId || null,
        funcionarioRecebe: funcionarioSelecionado?.nome || null,
        funcionarioDevolve: form.funcionarioDevolve.trim() || null,
        valorUnitario: form.valorUnitario,
        usuarioId: session?.user.id,
        responsavel: tipo === 'SAIDA' && subtipo === 'USUARIO'
          ? funcionarioSelecionado?.nome || null
          : tipo === 'ENTRADA' && modoEntrada === 'DEVOLUCAO'
            ? form.funcionarioDevolve.trim()
          : (session?.user.name ?? session?.user.email),
        observacoes: tipo === 'ENTRADA' && modoEntrada === 'DEVOLUCAO'
          ? `Devolução de itens de: ${form.funcionarioDevolve.trim()}${form.observacoes ? ' | ' + form.observacoes : ''}`
          : tipo === 'SAIDA' && subtipo === 'USUARIO' && funcionarioSelecionado?.nome
          ? `Registrado por: ${session?.user.name ?? session?.user.email}${form.observacoes ? ' | ' + form.observacoes : ''}`
          : form.observacoes,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      const detalhesPendencia = Array.isArray(data?.pendencias) && data.pendencias.length > 0
        ? ` Pendências: ${data.pendencias.map((p: { etiqueta: string, motivo: string }) => `${p.etiqueta} (${p.motivo})`).join(', ')}`
        : ''
      setErros({ geral: `${data.error || 'Erro ao salvar'}${detalhesPendencia}` })
      setLoading(false)
      return
    }
    if (tipo === 'ENTRADA' && modoEntrada === 'DEVOLUCAO' && data?.pendencias?.length) {
      setErros({
        geral: `Devolução concluída com ${data.quantidadeDevolvida} item(ns). Pendências: ${data.pendencias.map((p: { etiqueta: string, motivo: string }) => `${p.etiqueta} (${p.motivo})`).join(', ')}`,
      })
    }
    if (tipo === 'SAIDA' && data?.pendencias?.length) {
      setErros({
        geral: `Saída concluída com ${data.totalProcessado} item(ns). Pendências: ${data.pendencias.map((p: { etiqueta: string, motivo: string }) => `${p.etiqueta} (${p.motivo})`).join(', ')}`,
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
  const itemSelecionadoDevolucao = itensParaDevolver.find(
    item => item.etiqueta.trim().toLowerCase() === form.etiqueta.trim().toLowerCase(),
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
          <button onClick={() => { setModoEntrada('CADASTRO'); setModoDevolucao('TODOS'); setErros({}) }}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${modoEntrada === 'CADASTRO' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'}`}>
            <Tag className="w-4 h-4" /> Entrada Individual
          </button>
          <button onClick={() => { setModoEntrada('DEVOLUCAO'); setModoDevolucao('TODOS'); setErros({}) }}
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
        {modoEntrada === 'CADASTRO' && tipo === 'ENTRADA' && (
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
                onChange={e => {
                  s('funcionarioDevolve', e.target.value)
                  s('etiqueta', '')
                }}
                className={`w-full border bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${erros.funcionarioDevolve ? 'border-red-400' : 'border-gray-300 dark:border-gray-700'}`}>
                <option value="">Selecionar funcionário</option>
                {responsaveisInventario.map(nome => <option key={nome} value={nome}>{nome}</option>)}
              </select>
              {erros.funcionarioDevolve && <p className="text-xs text-red-500">{erros.funcionarioDevolve}</p>}
            </div>
            {form.funcionarioDevolve && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg space-y-1">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => { setModoDevolucao('TODOS'); s('etiqueta', '') }}
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${modoDevolucao === 'TODOS' ? 'border-emerald-500 bg-emerald-100/80 text-emerald-800 dark:text-emerald-300' : 'border-emerald-200 text-emerald-700 dark:text-emerald-400 hover:border-emerald-300'}`}>
                    Devolver todos os itens
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoDevolucao('UM')}
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${modoDevolucao === 'UM' ? 'border-emerald-500 bg-emerald-100/80 text-emerald-800 dark:text-emerald-300' : 'border-emerald-200 text-emerald-700 dark:text-emerald-400 hover:border-emerald-300'}`}>
                    Devolver apenas um item
                  </button>
                </div>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {modoDevolucao === 'TODOS'
                    ? `${itensParaDevolver.length} item(ns) serão devolvidos ao estoque`
                    : itemSelecionadoDevolucao
                      ? '1 item será devolvido ao estoque'
                      : `${itensParaDevolver.length} item(ns) disponíveis para seleção`}
                </p>
                {modoDevolucao === 'UM' && (
                  <div className="mt-2 space-y-1">
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                      Item para devolução *
                    </label>
                    <select
                      value={form.etiqueta}
                      onChange={e => s('etiqueta', e.target.value)}
                      className={`w-full border bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${erros.etiqueta ? 'border-red-400' : 'border-emerald-200 dark:border-emerald-700'}`}>
                      <option value="">Selecionar item</option>
                      {itensParaDevolver.map((item) => (
                        <option key={item.etiqueta} value={item.etiqueta}>
                          {item.etiqueta} • {item.tipo} {item.marca} {item.modelo}
                        </option>
                      ))}
                    </select>
                    {erros.etiqueta && <p className="text-xs text-red-500">{erros.etiqueta}</p>}
                  </div>
                )}
                {itensParaDevolver.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {(modoDevolucao === 'UM' && itemSelecionadoDevolucao ? [itemSelecionadoDevolucao] : itensParaDevolver).map((item) => (
                      <li key={item.etiqueta} className="text-xs text-emerald-800 dark:text-emerald-300">
                        <span className="font-mono font-medium">{item.etiqueta}</span>
                        <span className="mx-1">•</span>
                        <span>{item.tipo} {item.marca} {item.modelo}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}

        {tipo === 'SAIDA' && subtipo === 'USUARIO' && (
          <>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Funcionário *</label>
              <select
                value={form.funcionarioId}
                onChange={e => {
                  s('funcionarioId', e.target.value)
                  setAtivosSelecionados([])
                  setBuscaAtivo('')
                }}
                className={`w-full border bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${erros.funcionarioId ? 'border-red-400' : 'border-gray-300 dark:border-gray-700'}`}>
                <option value="">Selecionar funcionário</option>
                {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome} — {f.setor?.nome}</option>)}
              </select>
              {erros.funcionarioId && <p className="text-xs text-red-500">{erros.funcionarioId}</p>}
            </div>
            <Input label="Setor (vinculado ao funcionário)" value={funcionarioSelecionado?.setor?.nome || ''} readOnly placeholder="Selecione um funcionário" />
          </>
        )}

        {tipo === 'SAIDA' && (
          <>
            <Input label="Data *" type="date" value={form.data} onChange={e => s('data', e.target.value)} error={erros.data} />
            <div className={`space-y-3 rounded-lg border p-3 ${erros.etiqueta ? 'border-red-300 bg-red-50/30 dark:bg-red-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
              <div className="flex items-center justify-between gap-2">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  Ativos para saída *
                </label>
                <span className="text-xs text-gray-500 dark:text-gray-400">{ativosSelecionados.length} selecionado(s)</span>
              </div>
              {subtipo === 'USUARIO' && !form.funcionarioId ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Selecione o funcionário primeiro para liberar a seleção dos ativos.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <select
                      value={filtroAtivo}
                      onChange={(e) => setFiltroAtivo(e.target.value as 'ETIQUETA' | 'PRODUTO' | 'CATEGORIA')}
                      className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      <option value="ETIQUETA">Buscar por etiqueta</option>
                      <option value="PRODUTO">Buscar por produto</option>
                      <option value="CATEGORIA">Buscar por categoria</option>
                    </select>
                    <input
                      value={buscaAtivo}
                      onChange={(e) => setBuscaAtivo(e.target.value)}
                      placeholder={filtroAtivo === 'ETIQUETA' ? 'Digite a etiqueta...' : filtroAtivo === 'PRODUTO' ? 'Digite o nome do produto...' : 'Digite a categoria...'}
                      className="md:col-span-2 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div className="max-h-44 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    {ativosFiltrados.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">Nenhum ativo disponível com esse filtro.</p>
                    ) : (
                      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {ativosFiltrados.slice(0, 30).map((ativo) => (
                          <li key={ativo.etiqueta} className="px-3 py-2 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-mono text-gray-800 dark:text-gray-200 truncate">{ativo.etiqueta}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {ativo.produtoNome} • {ativo.categoriaNome}
                              </p>
                            </div>
                            <Button size="sm" onClick={() => adicionarAtivoSaida(ativo)}>Adicionar</Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
              {erros.etiqueta && <p className="text-xs text-red-500">{erros.etiqueta}</p>}
              {ativosSelecionados.length > 0 && (
                <div className="overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800/80">
                      <tr>
                        <th className="text-left px-3 py-2">Etiqueta</th>
                        <th className="text-left px-3 py-2">Produto</th>
                        <th className="text-left px-3 py-2">Categoria</th>
                        <th className="text-right px-3 py-2">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ativosSelecionados.map((ativo) => (
                        <tr key={ativo.etiqueta} className="border-t border-gray-200 dark:border-gray-700">
                          <td className="px-3 py-2 font-mono">{ativo.etiqueta}</td>
                          <td className="px-3 py-2">{ativo.produtoNome}</td>
                          <td className="px-3 py-2">{ativo.categoriaNome}</td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => removerAtivoSaida(ativo.etiqueta)}
                              className="text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Remover
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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
