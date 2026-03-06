'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Input, Select, Textarea } from '@/components/ui'
import type { Ativo, Fornecedor, Setor, Usuario } from '@/types'

export function MovementForm({ type }: { type: 'ENTRADA' | 'SAIDA' }) {
  const router = useRouter()
  const [ativos, setAtivos] = useState<Ativo[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [setores, setSetores] = useState<Setor[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [ativoSelecionado, setAtivoSelecionado] = useState<Ativo | null>(null)

  const [form, setForm] = useState({
    ativoId: '',
    quantidade: '1',
    valorUnitario: '',
    data: new Date().toISOString().split('T')[0],
    fornecedorId: '',
    setorId: '',
    usuarioId: '',
    responsavel: '',
    observacoes: '',
  })

  useEffect(() => {
    fetch('/api/assets').then(r => r.json()).then(setAtivos)
    fetch('/api/suppliers').then(r => r.json()).then(setFornecedores)
    fetch('/api/sectors').then(r => r.json()).then(setSetores)
    fetch('/api/users').then(r => r.json()).then(setUsuarios)
  }, [])

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  const handleAtivoChange = (id: string) => {
    set('ativoId', id)
    const ativo = ativos.find(a => a.id === id)
    setAtivoSelecionado(ativo || null)
    if (ativo) set('valorUnitario', ativo.valorUnitario.toString())
  }

  const handleSubmit = async () => {
    if (!form.ativoId || !form.quantidade) { setErro('Produto e quantidade são obrigatórios'); return }
    if (type === 'SAIDA' && !form.setorId) { setErro('Setor é obrigatório para saída'); return }
    setLoading(true); setErro('')
    try {
      const res = await fetch('/api/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tipo: type }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.error || 'Erro ao registrar'); setLoading(false); return }
      setSucesso(true)
      setTimeout(() => router.push('/movements'), 1500)
    } catch {
      setErro('Erro ao registrar movimentação')
      setLoading(false)
    }
  }

  const isEntrada = type === 'ENTRADA'
  const titulo = isEntrada ? 'Entrada de Estoque' : 'Saída de Estoque'
  const cor = isEntrada ? 'text-green-600' : 'text-amber-600'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${cor}`}>{titulo}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {isEntrada ? 'Registrar recebimento de produtos no estoque' : 'Registrar saída de produtos para um setor/usuário'}
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-5">
          {erro && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {erro}
            </div>
          )}
          {sucesso && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-600 dark:text-green-400">
              ✅ Movimentação registrada! Redirecionando...
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Select label="Produto *" value={form.ativoId} onChange={e => handleAtivoChange(e.target.value)}>
                <option value="">Selecionar produto</option>
                {ativos.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.nome} ({a.codigo}) — Estoque: {a.quantidade}
                  </option>
                ))}
              </Select>
              {ativoSelecionado && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs text-gray-500 grid grid-cols-3 gap-2">
                  <span>Estoque atual: <strong className="text-gray-900 dark:text-white">{ativoSelecionado.quantidade}</strong></span>
                  <span>Mínimo: <strong className="text-gray-900 dark:text-white">{ativoSelecionado.estoqueMinimo}</strong></span>
                  <span>Valor unit.: <strong className="text-gray-900 dark:text-white">R$ {ativoSelecionado.valorUnitario}</strong></span>
                </div>
              )}
            </div>

            <Input label="Quantidade *" type="number" min="1" value={form.quantidade} onChange={e => set('quantidade', e.target.value)} />
            <Input label="Valor Unitário (R$)" type="number" step="0.01" min="0" value={form.valorUnitario} onChange={e => set('valorUnitario', e.target.value)} placeholder="0.00" />
            <Input label="Data *" type="date" value={form.data} onChange={e => set('data', e.target.value)} />

            {isEntrada && (
              <Select label="Fornecedor" value={form.fornecedorId} onChange={e => set('fornecedorId', e.target.value)}>
                <option value="">Selecionar fornecedor</option>
                {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </Select>
            )}

            {!isEntrada && (
              <>
                <Select label="Setor Destino *" value={form.setorId} onChange={e => set('setorId', e.target.value)}>
                  <option value="">Selecionar setor</option>
                  {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </Select>
                <Select label="Usuário Responsável" value={form.usuarioId} onChange={e => set('usuarioId', e.target.value)}>
                  <option value="">Selecionar usuário</option>
                  {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </Select>
                <Input label="Responsável (texto livre)" value={form.responsavel} onChange={e => set('responsavel', e.target.value)} placeholder="Nome do responsável" />
              </>
            )}

            <div className="sm:col-span-2">
              <Textarea label="Observações" value={form.observacoes} onChange={e => set('observacoes', e.target.value)} placeholder="Informações adicionais..." rows={3} />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => router.back()}>Cancelar</Button>
            <Button
              loading={loading}
              variant={isEntrada ? 'primary' : 'secondary'}
              className={!isEntrada ? '!bg-amber-500 hover:!bg-amber-600 !text-white' : ''}
              onClick={handleSubmit}
            >
              {isEntrada ? 'Registrar Entrada' : 'Registrar Saída'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
