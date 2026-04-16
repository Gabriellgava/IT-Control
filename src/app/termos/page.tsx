'use client'

import Link from 'next/link'
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
  observacoes?: string | null
  criadoEm: string
}

interface ResponsavelAgrupado {
  nome: string
  totalEquipamentos: number
  setores: string[]
  equipamentos: InventarioItem[]
}

const RESPONSABILIDADES_PADRAO = [
  'Utilizar os equipamentos exclusivamente para atividades profissionais autorizadas.',
  'Zelar pela integridade física e lógica de todos os equipamentos recebidos.',
  'Não compartilhar credenciais ou acessos corporativos sem autorização.',
  'Comunicar imediatamente qualquer incidente, perda, roubo ou dano aos equipamentos.',
  'Devolver todos os equipamentos em caso de desligamento ou troca de função.',
]

const hojeISO = new Date().toISOString().slice(0, 10)

const formatarDataBR = (data: string) => {
  if (!data) return '—'
  return new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR')
}

export default function TermosPage() {
  const [itens, setItens] = useState<InventarioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [responsavelSelecionado, setResponsavelSelecionado] = useState('')

  const [empresa, setEmpresa] = useState('Minha Empresa LTDA')
  const [dataEntrega, setDataEntrega] = useState(hojeISO)
  const [dataDevolucao, setDataDevolucao] = useState('')
  const [observacoesTermo, setObservacoesTermo] = useState('')

  useEffect(() => {
    const carregar = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/inventario')
        if (!res.ok) throw new Error('Falha ao buscar itens de inventário')
        const data = (await res.json()) as InventarioItem[]
        setItens(data)

        const primeiroResponsavel = data[0]?.responsavel
        if (primeiroResponsavel) setResponsavelSelecionado(primeiroResponsavel)
      } catch {
        setErro('Não foi possível carregar o inventário para gerar o termo.')
      } finally {
        setLoading(false)
      }
    }

    carregar()
  }, [])

  const responsaveisAgrupados = useMemo<ResponsavelAgrupado[]>(() => {
    const mapa = new Map<string, ResponsavelAgrupado>()

    itens.forEach((item) => {
      const chave = item.responsavel.trim()
      const atual = mapa.get(chave)

      if (atual) {
        atual.totalEquipamentos += 1
        atual.equipamentos.push(item)
        if (!atual.setores.includes(item.setor)) atual.setores.push(item.setor)
      } else {
        mapa.set(chave, {
          nome: chave,
          totalEquipamentos: 1,
          setores: [item.setor],
          equipamentos: [item],
        })
      }
    })

    return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome))
  }, [itens])

  const responsaveisFiltrados = useMemo(() => {
    if (!busca.trim()) return responsaveisAgrupados
    const termo = busca.toLowerCase()

    return responsaveisAgrupados.filter((resp) => {
      const chaveBusca = `${resp.nome} ${resp.setores.join(' ')} ${resp.equipamentos
        .map((eq) => `${eq.etiqueta} ${eq.tipo} ${eq.marca} ${eq.modelo}`)
        .join(' ')}`.toLowerCase()
      return chaveBusca.includes(termo)
    })
  }, [responsaveisAgrupados, busca])

  const responsavelAtivo = useMemo(
    () => responsaveisAgrupados.find((resp) => resp.nome === responsavelSelecionado) ?? null,
    [responsaveisAgrupados, responsavelSelecionado]
  )

  const imprimir = () => {
    window.print()
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Termo de Responsabilidade</h1>
            <p className="text-sm text-gray-500 mt-1">Geração por pessoa com todos os equipamentos atualmente vinculados.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/inventario">
              <Button variant="secondary">Ir para Inventário</Button>
            </Link>
            <Link href="/licencas-assinaturas">
              <Button variant="secondary">Ir para Licenças e Assinaturas</Button>
            </Link>
            <Button icon={<Printer className="w-4 h-4" />} onClick={imprimir} disabled={!responsavelAtivo}>
              Imprimir termo
            </Button>
          </div>
        </div>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">1) Selecionar pessoa</h2>

            <Input
              placeholder="Buscar por responsável, etiqueta, marca..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />

            {erro && <p className="text-sm text-red-600">{erro}</p>}

            {loading ? (
              <p className="text-sm text-gray-500">Carregando inventário...</p>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                {responsaveisFiltrados.length === 0 && <p className="text-sm text-gray-500">Nenhuma pessoa encontrada.</p>}
                {responsaveisFiltrados.map((resp) => {
                  const ativo = resp.nome === responsavelSelecionado
                  return (
                    <button
                      key={resp.nome}
                      onClick={() => setResponsavelSelecionado(resp.nome)}
                      className={`w-full text-left border rounded-lg p-3 transition-colors ${
                        ativo
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-800 hover:border-blue-300'
                      }`}
                    >
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{resp.nome}</p>
                      <p className="text-xs text-gray-500">{resp.totalEquipamentos} equipamento(s) vinculado(s)</p>
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {resp.setores.map((setor) => (
                          <Badge key={setor}>{setor}</Badge>
                        ))}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="xl:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">2) Dados do termo</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)} />
              <Input label="Data de entrega" type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} />
              <Input label="Data prevista de devolução" type="date" value={dataDevolucao} onChange={(e) => setDataDevolucao(e.target.value)} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">Observações adicionais</label>
              <textarea
                rows={3}
                value={observacoesTermo}
                onChange={(e) => setObservacoesTermo(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex.: colaborador recebeu também mochila e carregadores extras."
              />
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 sm:p-6 print:border-none print:shadow-none">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Pré-visualização do termo</h2>
          </div>

          {!responsavelAtivo ? (
            <p className="text-sm text-gray-500">Selecione uma pessoa para montar o termo.</p>
          ) : (
            <article className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                <strong>TERMO DE RESPONSABILIDADE DE ATIVOS DE TI</strong>
              </p>
              <p>
                Pelo presente termo, a empresa <strong>{empresa || '____________________'}</strong> entrega ao colaborador{' '}
                <strong>{responsavelAtivo.nome}</strong>, vinculado ao(s) setor(es) <strong>{responsavelAtivo.setores.join(', ')}</strong>, os equipamentos abaixo especificados,
                para uso profissional.
              </p>

              <p><strong>Relação de equipamentos vinculados</strong></p>
              <ul>
                {responsavelAtivo.equipamentos.map((equipamento) => (
                  <li key={equipamento.id}>
                    {equipamento.tipo} • {equipamento.marca} {equipamento.modelo} • Etiqueta: {equipamento.etiqueta} • Setor: {equipamento.setor}
                  </li>
                ))}
              </ul>

              <p><strong>Dados de vigência</strong></p>
              <ul>
                <li>Data de entrega: {formatarDataBR(dataEntrega)}</li>
                <li>Data prevista de devolução: {formatarDataBR(dataDevolucao)}</li>
              </ul>

              <p><strong>Responsabilidades do colaborador</strong></p>
              <ol>
                {RESPONSABILIDADES_PADRAO.map((resp) => (
                  <li key={resp}>{resp}</li>
                ))}
              </ol>

              {observacoesTermo && (
                <>
                  <p><strong>Observações</strong></p>
                  <p>{observacoesTermo}</p>
                </>
              )}

              <p>
                Por estarem de acordo, as partes assinam este termo em {formatarDataBR(dataEntrega)}.
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
