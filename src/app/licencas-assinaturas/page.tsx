'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge, Button, Input, Select, Table } from '@/components/ui'
import { AlertCircle, CheckCircle, Plus, Trash2, Upload } from 'lucide-react'
import { corrigirMojibake, decodificarCsvComFallback } from '@/lib/csv'

interface InventarioItem {
  id: string
  setor: string
  responsavel: string
  etiqueta?: string
  tipo?: string
  modelo?: string
}

type TipoRegistro = 'licenca' | 'assinatura'

interface RegistroLicencaAssinatura {
  id: string
  tipoRegistro: TipoRegistro
  // Campos de licença
  solicitadoPor: string
  maquinaEtiqueta: string
  produtoLicenca: string
  codigoLicenca: string
  // Campos de assinatura
  plataformaAssinatura: string
  setorAssinatura: string
  periodoAssinatura: string
  emailAssinatura: string
  criadoEm: string
}

const STORAGE_KEY = 'licencas-assinaturas-registros-v1'
const ORDEM_CSV_SEM_CABECALHO = ['solicitadoPor', 'maquinaEtiqueta', 'produtoLicenca', 'codigoLicenca'] as const

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
  const [registros, setRegistros] = useState<RegistroLicencaAssinatura[]>([])
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  const [tipoRegistro, setTipoRegistro] = useState<TipoRegistro>('licenca')
  const [solicitadoPor, setSolicitadoPor] = useState('')
  const [maquinaEtiqueta, setMaquinaEtiqueta] = useState('')
  const [produtoLicenca, setProdutoLicenca] = useState('')
  const [codigoLicenca, setCodigoLicenca] = useState('')
  const [plataformaAssinatura, setPlataformaAssinatura] = useState('')
  const [setorAssinatura, setSetorAssinatura] = useState('')
  const [periodoAssinatura, setPeriodoAssinatura] = useState('')
  const [emailAssinatura, setEmailAssinatura] = useState('')
  const [erro, setErro] = useState('')
  const [importando, setImportando] = useState(false)
  const [importStatus, setImportStatus] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null)
  const inputFileRef = useRef<HTMLInputElement>(null)

  const registrosOrdenados = useMemo(() => {
    if (!sort) return registros

    const mapaCampos: Record<string, (r: RegistroLicencaAssinatura) => string | number> = {
      Tipo: (r) => r.tipoRegistro,
      Dados: (r) => r.tipoRegistro === 'licenca' 
        ? `${r.solicitadoPor} ${r.maquinaEtiqueta} ${r.produtoLicenca}`
        : `${r.plataformaAssinatura} ${r.setorAssinatura} ${r.periodoAssinatura}`,
      'Código / E-mail': (r) => r.tipoRegistro === 'licenca' ? r.codigoLicenca : r.emailAssinatura,
      Data: (r) => new Date(r.criadoEm).getTime(),
    }

    const selector = mapaCampos[sort.key]
    if (!selector) return registros

    return [...registros].sort((a, b) => {
      const aValor = selector(a)
      const bValor = selector(b)
      const comparacao = typeof aValor === 'number' && typeof bValor === 'number'
        ? aValor - bValor
        : String(aValor).localeCompare(String(bValor), 'pt-BR', { numeric: true, sensitivity: 'base' })
      return sort.direction === 'asc' ? comparacao : -comparacao
    })
  }, [registros, sort])

  const alternarOrdenacao = (header: string) => {
    setSort((atual) => {
      if (!atual || atual.key !== header) return { key: header, direction: 'asc' }
      return { key: header, direction: atual.direction === 'asc' ? 'desc' : 'asc' }
    })
  }

  useEffect(() => {
    const carregarInventario = async () => {
      try {
        const res = await fetch('/api/inventario?limit=10000')
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
      const data = JSON.parse(salvo) as RegistroLicencaAssinatura[]
      if (Array.isArray(data)) {
        setRegistros(
          data.map((registro) => ({
            ...registro,
            tipoRegistro: registro.tipoRegistro === 'assinatura' ? 'assinatura' : 'licenca',
            solicitadoPor: normalizarTexto(registro.solicitadoPor),
            maquinaEtiqueta: normalizarTexto(registro.maquinaEtiqueta),
            produtoLicenca: normalizarTexto(registro.produtoLicenca),
            codigoLicenca: normalizarTexto(registro.codigoLicenca),
            plataformaAssinatura: normalizarTexto(registro.plataformaAssinatura),
            setorAssinatura: normalizarTexto(registro.setorAssinatura),
            periodoAssinatura: normalizarTexto(registro.periodoAssinatura),
            emailAssinatura: normalizarTexto(registro.emailAssinatura),
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

  const opcoesSetorAssinatura = useMemo(() => {
    const setores = Array.from(new Set(inventario.map((item) => normalizarTexto(item.setor)).filter(Boolean)))
    return setores.sort((a, b) => a.localeCompare(b))
  }, [inventario])

  const cadastrar = () => {
    if (tipoRegistro === 'licenca' && (!solicitadoPor.trim() || !maquinaEtiqueta.trim() || !produtoLicenca.trim())) {
      setErro('Preencha solicitado por, máquina e produto da licença.')
      return
    }

    if (tipoRegistro === 'assinatura' && (!plataformaAssinatura.trim() || !setorAssinatura.trim() || !periodoAssinatura.trim() || !emailAssinatura.trim())) {
      setErro('Preencha plataforma, setor, período e e-mail da assinatura.')
      return
    }

    const novo: RegistroLicencaAssinatura = {
      id: gerarId(),
      tipoRegistro,
      solicitadoPor: normalizarTexto(solicitadoPor),
      maquinaEtiqueta: normalizarTexto(maquinaEtiqueta),
      produtoLicenca: normalizarTexto(produtoLicenca),
      codigoLicenca: normalizarTexto(codigoLicenca),
      plataformaAssinatura: normalizarTexto(plataformaAssinatura),
      setorAssinatura: normalizarTexto(setorAssinatura),
      periodoAssinatura: normalizarTexto(periodoAssinatura),
      emailAssinatura: normalizarTexto(emailAssinatura),
      criadoEm: new Date().toISOString(),
    }

    setRegistros((atual) => [novo, ...atual])
    setErro('')
    if (tipoRegistro === 'licenca') {
      setMaquinaEtiqueta('')
      setProdutoLicenca('')
      setCodigoLicenca('')
    } else {
      setPlataformaAssinatura('')
      setSetorAssinatura('')
      setPeriodoAssinatura('')
      setEmailAssinatura('')
    }
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
      const validos: RegistroLicencaAssinatura[] = []
      let ignorados = 0

      for (const linha of linhas) {
        const cols = parseCsvLine(linha, delimitador)
        const registro = Object.fromEntries(
          ORDEM_CSV_SEM_CABECALHO.map((campo, index) => [campo, normalizarTexto(cols[index] ?? '')])
        ) as Record<(typeof ORDEM_CSV_SEM_CABECALHO)[number], string>

        if (!registro.solicitadoPor || !registro.maquinaEtiqueta || !registro.produtoLicenca) {
          ignorados++
          continue
        }

        validos.push({
          id: gerarId(),
          tipoRegistro: 'licenca',
          solicitadoPor: registro.solicitadoPor,
          maquinaEtiqueta: registro.maquinaEtiqueta,
          produtoLicenca: registro.produtoLicenca,
          codigoLicenca: registro.codigoLicenca,
          plataformaAssinatura: '',
          setorAssinatura: '',
          periodoAssinatura: '',
          emailAssinatura: '',
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
          <p className="text-sm text-gray-500 mt-1">Cadastro separado de licenças (vinculadas à máquina) e assinaturas (vinculadas ao setor/e-mail).</p>
        </div>

        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Novo cadastro</h2>

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <div className="space-y-2">
            <p className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Tipo de cadastro</p>
            <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-gray-800/60">
              <button
                type="button"
                onClick={() => setTipoRegistro('licenca')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  tipoRegistro === 'licenca'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700'
                }`}
              >
                Licença
              </button>
              <button
                type="button"
                onClick={() => setTipoRegistro('assinatura')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  tipoRegistro === 'assinatura'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700'
                }`}
              >
                Assinatura
              </button>
            </div>
          </div>

          {tipoRegistro === 'licenca' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-blue-50/70 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-3">
              <Select label="Solicitado por" value={solicitadoPor} onChange={(e) => setSolicitadoPor(e.target.value)}>
                <option value="">Selecionar responsável</option>
                {opcoesResponsaveis.map((nome) => (
                  <option key={nome} value={nome}>{nome}</option>
                ))}
              </Select>
              <Select label="Máquina vinculada" value={maquinaEtiqueta} onChange={(e) => setMaquinaEtiqueta(e.target.value)}>
                <option value="">Selecionar máquina</option>
                {inventario.map((item) => (
                  <option key={item.id} value={item.etiqueta ?? ''}>
                    {item.etiqueta || item.id} — {item.tipo || 'Equipamento'} {item.modelo ? `(${item.modelo})` : ''}
                  </option>
                ))}
              </Select>
              <Input label="Produto da licença" value={produtoLicenca} onChange={(e) => setProdutoLicenca(e.target.value)} placeholder="Ex.: Office 365, Windows 11 Pro" />
              <Input label="Código da licença (opcional)" value={codigoLicenca} onChange={(e) => setCodigoLicenca(e.target.value)} placeholder="Ex.: ABCD-1234" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-emerald-50/70 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-3">
              <Input label="Plataforma" value={plataformaAssinatura} onChange={(e) => setPlataformaAssinatura(e.target.value)} placeholder="Ex.: ChatGPT Team" />
              <Select label="Setor" value={setorAssinatura} onChange={(e) => setSetorAssinatura(e.target.value)}>
                <option value="">Selecionar setor</option>
                {opcoesSetorAssinatura.map((setorNome) => (
                  <option key={setorNome} value={setorNome}>{setorNome}</option>
                ))}
              </Select>
              <Input label="Período de disponibilidade" value={periodoAssinatura} onChange={(e) => setPeriodoAssinatura(e.target.value)} placeholder="Ex.: 12 meses (06/2026 a 06/2027)" />
              <Input label="E-mail vinculado" value={emailAssinatura} onChange={(e) => setEmailAssinatura(e.target.value)} placeholder="Ex.: equipe@empresa.com" />
            </div>
          )}

          <div className="flex justify-end">
            <Button icon={<Plus className="w-4 h-4" />} onClick={cadastrar}>
              {tipoRegistro === 'licenca' ? 'Cadastrar licença' : 'Cadastrar assinatura'}
            </Button>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-3">
            <p className="text-xs text-gray-500">
              Importe aqui o CSV de licenças (não depende da tela de Inventário). Aceita arquivo <strong>sem cabeçalho</strong> na ordem:
              <strong> Solicitado por, Máquina (etiqueta), Produto da licença, Código</strong>.
            </p>
            <input
              ref={inputFileRef}
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
            <Button
              type="button"
              icon={<Upload className="w-4 h-4" />}
              variant="secondary"
              loading={importando}
              onClick={() => inputFileRef.current?.click()}
            >
              Subir CSV de licenças
            </Button>

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

          <Table headers={['Tipo', 'Dados', 'Código / E-mail', 'Data', 'Ações']} empty={registrosOrdenados.length === 0} sort={sort} onSort={alternarOrdenacao}>
            {registrosOrdenados.map((registro) => (
              <tr key={registro.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                <td className="px-4 py-3">
                  <Badge variant={registro.tipoRegistro === 'licenca' ? 'info' : 'success'}>
                    {registro.tipoRegistro === 'licenca' ? 'Licença' : 'Assinatura'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm">
                  {registro.tipoRegistro === 'licenca' ? (
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{registro.produtoLicenca}</p>
                      <p className="text-xs text-gray-500">Solicitante: {registro.solicitadoPor || '—'}</p>
                      <p className="text-xs text-gray-500">Máquina: {registro.maquinaEtiqueta || '—'}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{registro.plataformaAssinatura}</p>
                      <p className="text-xs text-gray-500">Setor: {registro.setorAssinatura || '—'}</p>
                      <p className="text-xs text-gray-500">Período: {registro.periodoAssinatura || '—'}</p>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">{registro.tipoRegistro === 'licenca' ? (registro.codigoLicenca || '—') : (registro.emailAssinatura || '—')}</td>
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
