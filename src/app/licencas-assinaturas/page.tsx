'use client'

import { useEffect, useMemo, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge, Button, Input, Select, Table } from '@/components/ui'
import { Plus, Trash2 } from 'lucide-react'

interface InventarioItem {
  id: string
  setor: string
  responsavel: string
}

interface RegistroLicenca {
  id: string
  solicitadoPor: string
  setor: string
  tipoLicenca: string
  codigoLicenca: string
  criadoEm: string
}

const STORAGE_KEY = 'licencas-assinaturas-registros-v1'

const gerarId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const formatarDataHora = (iso: string) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR')
}

export default function LicencasAssinaturasPage() {
  const [inventario, setInventario] = useState<InventarioItem[]>([])
  const [registros, setRegistros] = useState<RegistroLicenca[]>([])

  const [solicitadoPor, setSolicitadoPor] = useState('')
  const [setor, setSetor] = useState('')
  const [tipoLicenca, setTipoLicenca] = useState('')
  const [codigoLicenca, setCodigoLicenca] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    const carregarInventario = async () => {
      try {
        const res = await fetch('/api/inventario')
        if (!res.ok) return
        const data = (await res.json()) as InventarioItem[]
        setInventario(data)
      } catch {
        // fallback silencioso: a tela funciona mesmo sem inventário carregado
      }
    }

    carregarInventario()

    try {
      const salvo = localStorage.getItem(STORAGE_KEY)
      if (!salvo) return
      const data = JSON.parse(salvo) as RegistroLicenca[]
      if (Array.isArray(data)) setRegistros(data)
    } catch {
      // ignora dados inválidos no localStorage
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registros))
  }, [registros])

  const opcoesResponsaveis = useMemo(() => {
    const nomes = Array.from(new Set(inventario.map((item) => item.responsavel).filter(Boolean)))
    return nomes.sort((a, b) => a.localeCompare(b))
  }, [inventario])

  const opcoesSetor = useMemo(() => {
    const setores = Array.from(new Set(inventario.map((item) => item.setor).filter(Boolean)))
    return setores.sort((a, b) => a.localeCompare(b))
  }, [inventario])

  const cadastrar = () => {
    if (!solicitadoPor.trim() || !setor.trim() || !tipoLicenca.trim()) {
      setErro('Preencha solicitado por, setor e tipo de licença.')
      return
    }

    const novo: RegistroLicenca = {
      id: gerarId(),
      solicitadoPor: solicitadoPor.trim(),
      setor: setor.trim(),
      tipoLicenca: tipoLicenca.trim(),
      codigoLicenca: codigoLicenca.trim(),
      criadoEm: new Date().toISOString(),
    }

    setRegistros((atual) => [novo, ...atual])
    setErro('')
    setTipoLicenca('')
    setCodigoLicenca('')
  }

  const remover = (id: string) => {
    setRegistros((atual) => atual.filter((registro) => registro.id !== id))
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Licenças e Assinaturas</h1>
          <p className="text-sm text-gray-500 mt-1">Cadastro separado para licenças de software e assinaturas de IA, vinculando quem solicitou e setor.</p>
        </div>

        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Novo cadastro</h2>

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Select label="Solicitado por" value={solicitadoPor} onChange={(e) => setSolicitadoPor(e.target.value)}>
              <option value="">Selecionar responsável</option>
              {opcoesResponsaveis.map((nome) => (
                <option key={nome} value={nome}>{nome}</option>
              ))}
            </Select>

            <Select label="Setor" value={setor} onChange={(e) => setSetor(e.target.value)}>
              <option value="">Selecionar setor</option>
              {opcoesSetor.map((setorNome) => (
                <option key={setorNome} value={setorNome}>{setorNome}</option>
              ))}
            </Select>

            <Input
              label="Tipo de licença/assinatura"
              value={tipoLicenca}
              onChange={(e) => setTipoLicenca(e.target.value)}
              placeholder="Ex.: Microsoft 365, ChatGPT Team"
            />

            <Input
              label="Código da licença (opcional)"
              value={codigoLicenca}
              onChange={(e) => setCodigoLicenca(e.target.value)}
              placeholder="Ex.: ABCD-1234"
            />
          </div>

          <div className="flex justify-end">
            <Button icon={<Plus className="w-4 h-4" />} onClick={cadastrar}>Cadastrar licença/assinatura</Button>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Registros cadastrados</h2>
            <Badge variant="info">{registros.length} registro(s)</Badge>
          </div>

          <Table headers={['Solicitado por', 'Setor', 'Tipo', 'Código', 'Data', 'Ações']} empty={registros.length === 0}>
            {registros.map((registro) => (
              <tr key={registro.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{registro.solicitadoPor}</td>
                <td className="px-4 py-3"><Badge>{registro.setor}</Badge></td>
                <td className="px-4 py-3">{registro.tipoLicenca}</td>
                <td className="px-4 py-3">{registro.codigoLicenca || '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{formatarDataHora(registro.criadoEm)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => remover(registro.id)}
                    className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remover
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        </section>
      </div>
    </AppLayout>
  )
}
