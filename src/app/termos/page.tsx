'use client'

import { useEffect, useMemo, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge, Button, Input } from '@/components/ui'
import { FileText, Printer, Search } from 'lucide-react'

interface InventarioItem {
  id: string
  setor: string
  responsavel: string
  tipo: string
  marca: string
  modelo: string
  etiqueta: string
}

const RESPONSABILIDADES_PADRAO = [
  'Utilizar os ativos exclusivamente para atividades profissionais autorizadas.',
  'Zelar pela conservação física dos equipamentos recebidos.',
  'Não ceder equipamentos para terceiros sem autorização formal da empresa.',
  'Comunicar imediatamente qualquer dano, perda, roubo ou mau funcionamento.',
  'Devolver todos os ativos em caso de desligamento, transferência ou solicitação do setor de TI.',
]

const hojeISO = new Date().toISOString().slice(0, 10)

const formatarDataBR = (data: string) => {
  if (!data) return '—'
  return new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR')
}

export default function TermosPage() {
  // Estados principais da tela de termo por pessoa.
  const [itens, setItens] = useState<InventarioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [responsavelSelecionado, setResponsavelSelecionado] = useState('')

  // Campos do termo (somente ativos, sem licenças/IA).
  const [empresa, setEmpresa] = useState('Minha Empresa LTDA')
  const [dataTermo, setDataTermo] = useState(hojeISO)
  const [observacoesTermo, setObservacoesTermo] = useState('')

  useEffect(() => {
    const carregar = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/inventario')
        if (!res.ok) throw new Error('Falha ao buscar inventário')
        const data = (await res.json()) as InventarioItem[]
        setItens(data)

        if (data.length > 0) {
          setResponsavelSelecionado(data[0].responsavel)
        }
      } catch {
        setErro('Não foi possível carregar os ativos para geração do termo.')
      } finally {
        setLoading(false)
      }
    }

    carregar()
  }, [])

  // Agrupa por responsável para que o termo considere todos os equipamentos da pessoa.
  const responsaveis = useMemo(() => {
    const mapa = new Map<string, { nome: string; setor: string; quantidade: number }>()

    for (const item of itens) {
      const atual = mapa.get(item.responsavel)
      if (!atual) {
        mapa.set(item.responsavel, { nome: item.responsavel, setor: item.setor, quantidade: 1 })
      } else {
        mapa.set(item.responsavel, {
          ...atual,
          quantidade: atual.quantidade + 1,
        })
      }
    }

    return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [itens])

  const responsaveisFiltrados = useMemo(() => {
    if (!busca.trim()) return responsaveis
    const termo = busca.toLowerCase()

    return responsaveis.filter((pessoa) => {
      const chave = `${pessoa.nome} ${pessoa.setor}`.toLowerCase()
      return chave.includes(termo)
    })
  }, [busca, responsaveis])

  const ativosDoResponsavel = useMemo(() => {
    if (!responsavelSelecionado) return []
    return itens
      .filter((item) => item.responsavel === responsavelSelecionado)
      .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'pt-BR'))
  }, [itens, responsavelSelecionado])

  const setorResponsavel = ativosDoResponsavel[0]?.setor || '—'

  const imprimir = () => {
    window.print()
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Termo de Responsabilidade de Ativos</h1>
            <p className="text-sm text-gray-500 mt-1">Geração por pessoa com todos os equipamentos vinculados ao colaborador.</p>
          </div>
          <Button icon={<Printer className="w-4 h-4" />} onClick={imprimir} disabled={ativosDoResponsavel.length === 0}>
            Imprimir termo
          </Button>
        </div>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">1) Selecionar colaborador</h2>

            <Input
              placeholder="Buscar por nome ou setor..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />

            {erro && <p className="text-sm text-red-600">{erro}</p>}
            {loading && <p className="text-sm text-gray-500">Carregando inventário...</p>}

            <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
              {!loading && responsaveisFiltrados.length === 0 && (
                <p className="text-sm text-gray-500">Nenhum colaborador encontrado.</p>
              )}

              {responsaveisFiltrados.map((pessoa) => {
                const ativo = pessoa.nome === responsavelSelecionado

                return (
                  <button
                    key={pessoa.nome}
                    onClick={() => setResponsavelSelecionado(pessoa.nome)}
                    className={`w-full text-left border rounded-lg p-3 transition-colors ${
                      ativo
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-800 hover:border-blue-300'
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{pessoa.nome}</p>
                    <p className="text-xs text-gray-500">Setor: {pessoa.setor}</p>
                    <div className="mt-2">
                      <Badge variant="info">{pessoa.quantidade} ativo(s)</Badge>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="xl:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">2) Dados do termo</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)} />
              <Input label="Data do termo" type="date" value={dataTermo} onChange={(e) => setDataTermo(e.target.value)} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">Observações adicionais</label>
              <textarea
                rows={3}
                value={observacoesTermo}
                onChange={(e) => setObservacoesTermo(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex.: inclui fontes, carregadores e acessórios entregues junto aos ativos."
              />
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 sm:p-6 print:border-none print:shadow-none">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Pré-visualização do termo</h2>
          </div>

          {ativosDoResponsavel.length === 0 ? (
            <p className="text-sm text-gray-500">Selecione um colaborador com ativos para gerar o termo.</p>
          ) : (
            <article className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                <strong>TERMO DE RESPONSABILIDADE DE ATIVOS DE TI</strong>
              </p>

              <p>
                Pelo presente termo, a empresa <strong>{empresa || '____________________'}</strong> entrega ao colaborador{' '}
                <strong>{responsavelSelecionado}</strong>, do setor <strong>{setorResponsavel}</strong>, os ativos listados abaixo,
                para uso profissional.
              </p>

              <p><strong>Ativos vinculados ao colaborador</strong></p>
              <ul>
                {ativosDoResponsavel.map((item) => (
                  <li key={item.id}>
                    {item.tipo} — {item.marca} {item.modelo} (Etiqueta: {item.etiqueta})
                  </li>
                ))}
              </ul>

              <p><strong>Responsabilidades do colaborador</strong></p>
              <ol>
                {RESPONSABILIDADES_PADRAO.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>

              {observacoesTermo && (
                <>
                  <p><strong>Observações</strong></p>
                  <p>{observacoesTermo}</p>
                </>
              )}

              <p>
                Por estarem de acordo, as partes assinam este termo em {formatarDataBR(dataTermo)}.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-10">
                <div>
                  <div className="border-t border-gray-400 pt-2 text-center text-xs">Assinatura do colaborador</div>
                </div>
                <div>
                  <div className="border-t border-gray-400 pt-2 text-center text-xs">Assinatura da empresa</div>
                </div>
              </div>
            </article>
          )}
        </section>
      </div>
    </AppLayout>
  )
}
