'use client'

import { useEffect, useMemo, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge, Button, Input } from '@/components/ui'
import { FileText, Plus, Printer, Search, Trash2 } from 'lucide-react'

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

interface AssinaturaIA {
  nome: string
  tipoPlano: string
  emailConta: string
}

const RESPONSABILIDADES_PADRAO = [
  'Utilizar o equipamento exclusivamente para atividades profissionais autorizadas.',
  'Zelar pela integridade física e lógica do equipamento recebido.',
  'Não compartilhar credenciais, contas ou licenças de software sem autorização.',
  'Comunicar imediatamente qualquer incidente, perda, roubo ou dano ao equipamento.',
  'Devolver o equipamento e os acessos/licenças vinculados em caso de desligamento ou troca de função.',
]

const hojeISO = new Date().toISOString().slice(0, 10)

const formatarDataBR = (data: string) => {
  if (!data) return '—'
  return new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR')
}

export default function TermosPage() {
  // Estado base da tela: inventário, busca e seleção.
  const [itens, setItens] = useState<InventarioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [itemIdSelecionado, setItemIdSelecionado] = useState('')

  // Estado do formulário do termo.
  const [empresa, setEmpresa] = useState('Minha Empresa LTDA')
  const [dataEntrega, setDataEntrega] = useState(hojeISO)
  const [dataDevolucao, setDataDevolucao] = useState('')
  const [windowsLicenca, setWindowsLicenca] = useState('')
  const [officeLicenca, setOfficeLicenca] = useState('')
  const [assinaturasIA, setAssinaturasIA] = useState<AssinaturaIA[]>([{ nome: '', tipoPlano: '', emailConta: '' }])
  const [observacoesTermo, setObservacoesTermo] = useState('')

  // Carrega inventário apenas uma vez ao abrir a página.
  useEffect(() => {
    const carregar = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/inventario')
        if (!res.ok) throw new Error('Falha ao buscar itens de inventário')
        const data = (await res.json()) as InventarioItem[]
        setItens(data)

        // Seleciona automaticamente o primeiro item para facilitar o preenchimento.
        if (data.length > 0) setItemIdSelecionado(data[0].id)
      } catch {
        setErro('Não foi possível carregar o inventário para gerar o termo.')
      } finally {
        setLoading(false)
      }
    }

    carregar()
  }, [])

  // Busca por responsável, etiqueta e equipamento para localizar rapidamente o termo.
  const itensFiltrados = useMemo(() => {
    if (!busca.trim()) return itens
    const termo = busca.toLowerCase()

    return itens.filter((item) => {
      const chave = `${item.responsavel} ${item.etiqueta} ${item.marca} ${item.modelo} ${item.tipo}`.toLowerCase()
      return chave.includes(termo)
    })
  }, [itens, busca])

  const itemSelecionado = useMemo(
    () => itens.find((item) => item.id === itemIdSelecionado) ?? null,
    [itens, itemIdSelecionado]
  )

  const adicionarAssinaturaIA = () => {
    setAssinaturasIA((atual) => [...atual, { nome: '', tipoPlano: '', emailConta: '' }])
  }

  const removerAssinaturaIA = (idx: number) => {
    setAssinaturasIA((atual) => atual.filter((_, i) => i !== idx))
  }

  const atualizarAssinaturaIA = (idx: number, campo: keyof AssinaturaIA, valor: string) => {
    setAssinaturasIA((atual) => atual.map((item, i) => (i === idx ? { ...item, [campo]: valor } : item)))
  }

  const imprimir = () => {
    window.print()
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Termo de Responsabilidade</h1>
            <p className="text-sm text-gray-500 mt-1">Geração por pessoa e equipamento, com controle de licenças de software e assinaturas de IA.</p>
          </div>
          <Button icon={<Printer className="w-4 h-4" />} onClick={imprimir} disabled={!itemSelecionado}>
            Imprimir termo
          </Button>
        </div>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">1) Selecionar pessoa e equipamento</h2>

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
                {itensFiltrados.length === 0 && <p className="text-sm text-gray-500">Nenhum item encontrado.</p>}
                {itensFiltrados.map((item) => {
                  const ativo = item.id === itemIdSelecionado
                  return (
                    <button
                      key={item.id}
                      onClick={() => setItemIdSelecionado(item.id)}
                      className={`w-full text-left border rounded-lg p-3 transition-colors ${
                        ativo
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-800 hover:border-blue-300'
                      }`}
                    >
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.responsavel}</p>
                      <p className="text-xs text-gray-500">{item.tipo} • {item.marca} {item.modelo}</p>
                      <div className="mt-2 flex gap-2 flex-wrap">
                        <Badge variant="info">{item.etiqueta}</Badge>
                        <Badge>{item.setor}</Badge>
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
              <Input label="Licença Windows" placeholder="Ex.: OEM, MAK, conta corporativa" value={windowsLicenca} onChange={(e) => setWindowsLicenca(e.target.value)} />
              <Input label="Licença Office" placeholder="Ex.: Microsoft 365 Business" value={officeLicenca} onChange={(e) => setOfficeLicenca(e.target.value)} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Assinaturas de IA vinculadas</h3>
                <Button size="sm" variant="secondary" icon={<Plus className="w-4 h-4" />} onClick={adicionarAssinaturaIA}>
                  Adicionar
                </Button>
              </div>

              <div className="space-y-2">
                {assinaturasIA.map((assinatura, idx) => (
                  <div key={idx} className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input
                      label="Ferramenta"
                      placeholder="Ex.: ChatGPT, Copilot"
                      value={assinatura.nome}
                      onChange={(e) => atualizarAssinaturaIA(idx, 'nome', e.target.value)}
                    />
                    <Input
                      label="Plano"
                      placeholder="Ex.: Team, Enterprise"
                      value={assinatura.tipoPlano}
                      onChange={(e) => atualizarAssinaturaIA(idx, 'tipoPlano', e.target.value)}
                    />
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Input
                          label="Conta/E-mail"
                          placeholder="usuario@empresa.com"
                          value={assinatura.emailConta}
                          onChange={(e) => atualizarAssinaturaIA(idx, 'emailConta', e.target.value)}
                        />
                      </div>
                      {assinaturasIA.length > 1 && (
                        <button
                          onClick={() => removerAssinaturaIA(idx)}
                          className="h-10 px-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50"
                          aria-label="Remover assinatura"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">Observações adicionais</label>
              <textarea
                rows={3}
                value={observacoesTermo}
                onChange={(e) => setObservacoesTermo(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex.: notebook com mochila, mouse e carregador original."
              />
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 sm:p-6 print:border-none print:shadow-none">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Pré-visualização do termo</h2>
          </div>

          {!itemSelecionado ? (
            <p className="text-sm text-gray-500">Selecione um item de inventário para montar o termo.</p>
          ) : (
            <article className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                <strong>TERMO DE RESPONSABILIDADE DE EQUIPAMENTO E LICENÇAS DE SOFTWARE</strong>
              </p>
              <p>
                Pelo presente termo, a empresa <strong>{empresa || '____________________'}</strong> entrega ao colaborador{' '}
                <strong>{itemSelecionado.responsavel}</strong>, do setor <strong>{itemSelecionado.setor}</strong>, o equipamento abaixo especificado,
                para uso profissional.
              </p>

              <p><strong>Dados do equipamento</strong></p>
              <ul>
                <li>Tipo: {itemSelecionado.tipo}</li>
                <li>Marca/Modelo: {itemSelecionado.marca} {itemSelecionado.modelo}</li>
                <li>Etiqueta patrimonial: {itemSelecionado.etiqueta}</li>
                <li>Data de entrega: {formatarDataBR(dataEntrega)}</li>
                <li>Data prevista de devolução: {formatarDataBR(dataDevolucao)}</li>
              </ul>

              <p><strong>Licenças vinculadas ao equipamento</strong></p>
              <ul>
                <li>Windows: {windowsLicenca || 'Não informado'}</li>
                <li>Office: {officeLicenca || 'Não informado'}</li>
              </ul>

              <p><strong>Assinaturas de IA vinculadas ao colaborador/equipamento</strong></p>
              <ul>
                {assinaturasIA.filter((a) => a.nome || a.tipoPlano || a.emailConta).length === 0 && <li>Nenhuma assinatura vinculada.</li>}
                {assinaturasIA
                  .filter((a) => a.nome || a.tipoPlano || a.emailConta)
                  .map((assinatura, idx) => (
                    <li key={`${assinatura.nome}-${idx}`}>
                      {assinatura.nome || 'Ferramenta'} • Plano: {assinatura.tipoPlano || 'N/I'} • Conta: {assinatura.emailConta || 'N/I'}
                    </li>
                  ))}
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
