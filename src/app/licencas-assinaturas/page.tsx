'use client'

import { useEffect, useMemo, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge, Button, Input, Select, Table } from '@/components/ui'
import { AlertCircle, CheckCircle, Plus, Trash2, Upload } from 'lucide-react'
import { corrigirMojibake, decodificarCsvComFallback } from '@/lib/csv'

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
const ORDEM_CSV_SEM_CABECALHO = ['solicitadoPor', 'setor', 'tipoLicenca', 'codigoLicenca'] as const

const gerarId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const normalizarTexto = (valor: string) => corrigirMojibake(valor ?? '').trim()

const formatarDataHora = (iso: string) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR')
}

const parseCsvLine = (linha: string, delimitador: ',' | ';' | '\t' = ',') => {
  const cols: string[] = []
  let atual = ''
  let emAspas = false

  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i]
    if (ch === '"') {
      if (emAspas && linha[i + 1] === '"') {
        atual += '"'
        i++
      } else {
        emAspas = !emAspas
      }
      continue
    }
    if (ch === delimitador && !emAspas) {
      cols.push(atual.trim())
      atual = ''
      continue
    }
    atual += ch
  }
  cols.push(atual.trim())

  return cols.map((c) => corrigirMojibake(c.replace(/^["']|["']$/g, '').trim()))
}

const detectarDelimitador = (linha: string) => {
  const candidatos: Array<',' | ';' | '\t'> = [',', ';', '\t']
  let melhor: ',' | ';' | '\t' = ','
  let melhorContagem = -1

  for (const d of candidatos) {
    const partes = parseCsvLine(linha, d)
    if (partes.length > melhorContagem) {
      melhor = d
      melhorContagem = partes.length
    }
  }

  return melhor
}

export default function LicencasAssinaturasPage() {
  const [inventario, setInventario] = useState<InventarioItem[]>([])
  const [registros, setRegistros] = useState<RegistroLicenca[]>([])

  const [solicitadoPor, setSolicitadoPor] = useState('')
  const [setor, setSetor] = useState('')
  const [tipoLicenca, setTipoLicenca] = useState('')
  const [codigoLicenca, setCodigoLicenca] = useState('')
  const [erro, setErro] = useState('')
  const [importando, setImportando] = useState(false)
  const [importStatus, setImportStatus] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null)

  useEffect(() => {
    const carregarInventario = async () => {
      try {
        const res = await fetch('/api/inventario')
        if (!res.ok) return
        const data = (await res.json()) as InventarioItem[]
        setInventario(
          data.map((item) => ({
            ...item,
            setor: normalizarTexto(item.setor),
            responsavel: normalizarTexto(item.responsavel),
          }))
        )
      } catch {
        // fallback silencioso: a tela funciona mesmo sem inventário carregado
      }
    }

    carregarInventario()

    try {
      const salvo = localStorage.getItem(STORAGE_KEY)
      if (!salvo) return
      const data = JSON.parse(salvo) as RegistroLicenca[]
      if (Array.isArray(data)) {
        setRegistros(
          data.map((registro) => ({
            ...registro,
            solicitadoPor: normalizarTexto(registro.solicitadoPor),
            setor: normalizarTexto(registro.setor),
            tipoLicenca: normalizarTexto(registro.tipoLicenca),
            codigoLicenca: normalizarTexto(registro.codigoLicenca),
          }))
        )
      }
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
      solicitadoPor: normalizarTexto(solicitadoPor),
      setor: normalizarTexto(setor),
      tipoLicenca: normalizarTexto(tipoLicenca),
      codigoLicenca: normalizarTexto(codigoLicenca),
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

  const importarCsvSemCabecalho = async (file: File) => {
    setImportando(true)
    setImportStatus(null)

    try {
      const texto = await decodificarCsvComFallback(file)
      const linhas = texto.replace(/^\uFEFF/, '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

      if (linhas.length === 0) {
        setImportStatus({ tipo: 'erro', msg: 'Arquivo vazio. Inclua os dados na ordem: Solicitado por, Setor, Tipo, Código.' })
        return
      }

      const delimitador = detectarDelimitador(linhas[0])
      const validos: RegistroLicenca[] = []
      let ignorados = 0

      for (const linha of linhas) {
        const cols = parseCsvLine(linha, delimitador)
        const registro = Object.fromEntries(
          ORDEM_CSV_SEM_CABECALHO.map((campo, index) => [campo, normalizarTexto(cols[index] ?? '')])
        ) as Record<(typeof ORDEM_CSV_SEM_CABECALHO)[number], string>

        if (!registro.solicitadoPor || !registro.setor || !registro.tipoLicenca) {
          ignorados++
          continue
        }

        validos.push({
          id: gerarId(),
          solicitadoPor: registro.solicitadoPor,
          setor: registro.setor,
          tipoLicenca: registro.tipoLicenca,
          codigoLicenca: registro.codigoLicenca,
          criadoEm: new Date().toISOString(),
        })
      }

      if (validos.length === 0) {
        setImportStatus({ tipo: 'erro', msg: 'Nenhuma linha válida encontrada. Garanta a ordem correta sem cabeçalho.' })
        return
      }

      setRegistros((atual) => [...validos, ...atual])
      setImportStatus({
        tipo: ignorados > 0 ? 'erro' : 'ok',
        msg: `${validos.length} licença(s) importada(s)${ignorados > 0 ? `, ${ignorados} linha(s) ignorada(s)` : ''}.`,
      })
    } catch {
      setImportStatus({ tipo: 'erro', msg: 'Não foi possível ler o CSV. Verifique o arquivo e tente novamente.' })
    } finally {
      setImportando(false)
    }
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

          <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-3">
            <p className="text-xs text-gray-500">
              Importe aqui o CSV de licenças (não depende da tela de Inventário). Aceita arquivo <strong>sem cabeçalho</strong> na ordem:
              <strong> Solicitado por, Setor, Tipo da licença, Código</strong>.
            </p>
            <label className="inline-flex">
              <input
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  importarCsvSemCabecalho(file)
                  e.currentTarget.value = ''
                }}
              />
              <span>
                <Button icon={<Upload className="w-4 h-4" />} variant="secondary" loading={importando}>
                  Subir CSV de licenças
                </Button>
              </span>
            </label>

            {importStatus && (
              <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${importStatus.tipo === 'ok'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              }`}>
                {importStatus.tipo === 'ok' ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                <span>{importStatus.msg}</span>
              </div>
            )}
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
