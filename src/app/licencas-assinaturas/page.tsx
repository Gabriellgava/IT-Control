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

interface Produto {
  id: string
  nome: string
  codigo: string
  categoria?: {
    id: string
    nome: string
  }
  unidades: Array<{
    id: string
    etiqueta: string
    status: string
  }>
}

interface Funcionario {
  id: string
  nome: string
  setorId: string
  ativo: boolean
}

interface Licenca {
  id: string
  solicitadoPor: string
  maquinaEtiqueta: string
  produtoLicenca: string
  codigoLicenca: string | null
  criadoEm: string
}

interface Assinatura {
  id: string
  plataforma: string
  setor: string
  periodo: string
  email: string
  criadoEm: string
}

type TipoRegistro = 'licenca' | 'assinatura'

export default function LicencasAssinaturasPage() {
  const [inventario, setInventario] = useState<InventarioItem[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [licencas, setLicencas] = useState<Licenca[]>([])
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([])
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const [filtroLicenca, setFiltroLicenca] = useState<'todas' | 'estoque' | 'vinculadas'>('todas')

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

  const normalizarTexto = (valor: string) => corrigirMojibake(valor ?? '').trim()

  const normalizarCodigoLicenca = (codigo: string) => {
    if (!codigo) return ''
    // Remove espaços extras e converte para maiúsculas
    return codigo.trim().toUpperCase().replace(/\s+/g, '')
  }

  const validarCodigoLicenca = (codigo: string) => {
    if (!codigo) return true // Opcional
    const normalizado = normalizarCodigoLicenca(codigo)
    // Valida formato básico: 5 grupos de 5 caracteres separados por hífen (opcional)
    const formatoValido = /^[A-Z0-9]{5}(-[A-Z0-9]{5}){4}$/.test(normalizado)
    // Ou formato simplificado: apenas caracteres alfanuméricos
    const formatoSimplificado = /^[A-Z0-9-]+$/.test(normalizado)
    return formatoValido || formatoSimplificado
  }

  const validarEmail = (email: string) => {
    if (!email) return true // Opcional
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email.trim())
  }

  const validarProdutoLicenca = (produto: string) => {
    if (!produto || produto.trim().length < 3) return false
    // Lista de produtos comuns para validação
    const produtosComuns = [
      'windows', 'office', 'microsoft', 'adobe', 'autocad', 'photoshop', 
      'illustrator', 'acrobat', 'sketch', 'figma', 'visual studio', 'vscode'
    ]
    const produtoLower = produto.toLowerCase()
    return produtosComuns.some(p => produtoLower.includes(p)) || produto.length >= 5
  }

  const formatarDataHora = (iso: string) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('pt-BR')
  }

  const registrosOrdenados = useMemo(() => {
    const licencasFiltradas = licencas.filter(l => {
      if (filtroLicenca === 'estoque') return !l.maquinaEtiqueta
      if (filtroLicenca === 'vinculadas') return !!l.maquinaEtiqueta
      return true
    })

    const todos = [
      ...licencasFiltradas.map(l => ({ ...l, tipoRegistro: 'licenca' as const })),
      ...assinaturas.map(a => ({ ...a, tipoRegistro: 'assinatura' as const }))
    ]

    if (!sort) return todos

    const mapaCampos: Record<string, (r: any) => string | number> = {
      Tipo: (r) => r.tipoRegistro,
      Dados: (r) => r.tipoRegistro === 'licenca' 
        ? `${r.solicitadoPor} ${r.maquinaEtiqueta || 'Estoque'} ${r.produtoLicenca}`
        : `${r.plataforma} ${r.setor} ${r.periodo}`,
      'Código / E-mail': (r) => r.tipoRegistro === 'licenca' ? r.codigoLicenca : r.email,
      Data: (r) => new Date(r.criadoEm).getTime(),
    }

    const selector = mapaCampos[sort.key]
    if (!selector) return todos

    return [...todos].sort((a, b) => {
      const aValor = selector(a)
      const bValor = selector(b)
      const comparacao = typeof aValor === 'number' && typeof bValor === 'number'
        ? aValor - bValor
        : String(aValor).localeCompare(String(bValor), 'pt-BR', { numeric: true, sensitivity: 'base' })
      return sort.direction === 'asc' ? comparacao : -comparacao
    })
  }, [licencas, assinaturas, sort, filtroLicenca])

  const alternarOrdenacao = (header: string) => {
    setSort((atual) => {
      if (!atual || atual.key !== header) return { key: header, direction: 'asc' }
      return { key: header, direction: atual.direction === 'asc' ? 'desc' : 'asc' }
    })
  }

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const [invRes, prodRes, licRes, assRes, funcRes] = await Promise.all([
          fetch('/api/inventario?limit=10000'),
          fetch('/api/produtos?limit=10000'),
          fetch('/api/licencas'),
          fetch('/api/assinaturas'),
          fetch('/api/funcionarios')
        ])

        if (invRes.ok) {
          const invData = await invRes.json()
          const invArray = Array.isArray(invData) ? invData : (invData.data || [])
          setInventario(
            invArray.map((item: any) => ({
              ...item,
              setor: normalizarTexto(item.setor),
              responsavel: normalizarTexto(item.responsavel),
            }))
          )
        }

        if (prodRes.ok) {
          const prodData = await prodRes.json()
          const prodArray = Array.isArray(prodData) ? prodData : (prodData.data || [])
          setProdutos(prodArray)
        }

        if (licRes.ok) {
          const licData = await licRes.json()
          const licArray = Array.isArray(licData) ? licData : (licData.data || [])
          setLicencas(licArray)
        }

        if (assRes.ok) {
          const assData = await assRes.json()
          const assArray = Array.isArray(assData) ? assData : (assData.data || [])
          setAssinaturas(assArray)
        }

        if (funcRes.ok) {
          const funcData = await funcRes.json()
          const funcArray = Array.isArray(funcData) ? funcData : (funcData.data || [])
          setFuncionarios(funcArray)
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      }
    }

    carregarDados()
  }, [])

  const opcoesResponsaveis = useMemo(() => {
    return funcionarios
      .filter(f => f.ativo)
      .map(f => f.nome)
      .sort((a, b) => a.localeCompare(b))
  }, [funcionarios])

  const opcoesSetorAssinatura = useMemo(() => {
    const setores = Array.from(new Set(inventario.map((item) => normalizarTexto(item.setor)).filter(Boolean)))
    return setores.sort((a, b) => a.localeCompare(b))
  }, [inventario])

  const opcoesMaquinas = useMemo(() => {
    const computadores = produtos.filter(p => {
      const categoriaNome = p.categoria?.nome?.toLowerCase() || ''
      const produtoNome = p.nome.toLowerCase()
      
      // Verifica se é notebook ou desktop, mas não é suporte
      const isComputador = 
        categoriaNome === 'notebook' || 
        categoriaNome === 'desktop' ||
        categoriaNome === 'desktop alta performance' ||
        (produtoNome.includes('notebook') && !produtoNome.includes('suporte')) ||
        (produtoNome.includes('desktop') && !produtoNome.includes('suporte'))
      
      return isComputador
    })
    
    return computadores.flatMap(produto =>
      (produto.unidades || []).map(unidade => ({
        etiqueta: unidade.etiqueta,
        modelo: produto.nome
      }))
    )
  }, [produtos])

  // Mapa de responsável para máquina (etiqueta) - notebooks e desktops
  const responsavelMaquinaMap = useMemo(() => {
    const map: Record<string, string> = {}
    
    // Primeiro, coletar todas as etiquetas de computadores (notebooks e desktops)
    const computadorEtiquetas = new Set(
      opcoesMaquinas.map(m => m.etiqueta)
    )
    
    inventario.forEach(item => {
      if (item.responsavel && item.etiqueta && computadorEtiquetas.has(item.etiqueta)) {
        const responsavelNormalizado = normalizarTexto(item.responsavel)
        map[responsavelNormalizado] = item.etiqueta
      }
    })
    
    return map
  }, [inventario, opcoesMaquinas])

  // Auto-preencher máquina ao selecionar responsável
  useEffect(() => {
    if (solicitadoPor && responsavelMaquinaMap[solicitadoPor]) {
      setMaquinaEtiqueta(responsavelMaquinaMap[solicitadoPor])
    }
  }, [solicitadoPor, responsavelMaquinaMap])

  const cadastrar = async () => {
    setErro('')
    
    if (tipoRegistro === 'licenca') {
      if (!produtoLicenca.trim()) {
        setErro('Preencha o produto da licença.')
        return
      }

      if (!validarProdutoLicenca(produtoLicenca)) {
        setErro('Produto da licença inválido. Use nomes como "Windows 11 Pro", "Office 365", etc.')
        return
      }

      // Se tiver máquina, solicitadoPor é obrigatório
      if (maquinaEtiqueta.trim() && !solicitadoPor.trim()) {
        setErro('Preencha o responsável quando há máquina vinculada.')
        return
      }

      // Validar código da licença se fornecido
      if (codigoLicenca.trim() && !validarCodigoLicenca(codigoLicenca)) {
        setErro('Código da licença inválido. Use formato como "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"')
        return
      }

      try {
        const res = await fetch('/api/licencas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            solicitadoPor: solicitadoPor.trim() || null,
            maquinaEtiqueta: maquinaEtiqueta.trim() || null,
            produtoLicenca: produtoLicenca.trim(),
            codigoLicenca: normalizarCodigoLicenca(codigoLicenca) || null,
          }),
        })
        
        if (!res.ok) {
          const data = await res.json()
          setErro(data.error || 'Erro ao criar licença')
          return
        }

        const novaLicenca = await res.json()
        setLicencas(atual => [novaLicenca, ...atual])
        setSolicitadoPor('')
        setMaquinaEtiqueta('')
        setProdutoLicenca('')
        setCodigoLicenca('')
      } catch (error) {
        setErro('Erro ao criar licença')
      }
    } else {
      if (!plataformaAssinatura.trim()) {
        setErro('Preencha a plataforma da assinatura.')
        return
      }

      if (!setorAssinatura.trim()) {
        setErro('Preencha o setor da assinatura.')
        return
      }

      if (!periodoAssinatura.trim()) {
        setErro('Preencha o período da assinatura.')
        return
      }

      if (emailAssinatura.trim() && !validarEmail(emailAssinatura)) {
        setErro('E-mail inválido. Use formato como "usuario@empresa.com"')
        return
      }

      try {
        const res = await fetch('/api/assinaturas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plataforma: plataformaAssinatura.trim(),
            setor: setorAssinatura.trim(),
            periodo: periodoAssinatura.trim(),
            email: emailAssinatura.trim() || null,
          }),
        })
        
        if (!res.ok) {
          const data = await res.json()
          setErro(data.error || 'Erro ao criar assinatura')
          return
        }

        const novaAssinatura = await res.json()
        setAssinaturas(atual => [novaAssinatura, ...atual])
        setPlataformaAssinatura('')
        setSetorAssinatura('')
        setPeriodoAssinatura('')
        setEmailAssinatura('')
      } catch (error) {
        setErro('Erro ao criar assinatura')
      }
    }
  }

  const remover = async (id: string, tipo: TipoRegistro) => {
    try {
      const endpoint = tipo === 'licenca' ? '/api/licencas' : '/api/assinaturas'
      const res = await fetch(`${endpoint}/${id}`, { method: 'DELETE' })
      
      if (!res.ok) {
        console.error('Erro ao remover')
        return
      }

      if (tipo === 'licenca') {
        setLicencas(atual => atual.filter(l => l.id !== id))
      } else {
        setAssinaturas(atual => atual.filter(a => a.id !== id))
      }
    } catch (error) {
      console.error('Erro ao remover:', error)
    }
  }

  const vincularLicenca = async (licencaId: string, maquina: string) => {
    try {
      const res = await fetch(`/api/licencas/${licencaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maquinaEtiqueta: maquina }),
      })
      
      if (!res.ok) {
        const data = await res.json()
        setErro(data.error || 'Erro ao vincular licença')
        return
      }

      const atualizada = await res.json()
      setLicencas(atual => atual.map(l => l.id === licencaId ? atualizada : l))
      setErro('')
    } catch (error) {
      setErro('Erro ao vincular licença')
    }
  }

  const importarCsvSemCabecalho = async (file: File) => {
    setImportando(true)
    setImportStatus(null)

    try {
      const texto = await decodificarCsvComFallback(file)
      const linhas = texto.replace(/^\uFEFF/, '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

      if (linhas.length === 0) {
        setImportStatus({ tipo: 'erro', msg: 'Arquivo vazio. Inclua os dados na ordem: Solicitado por, Máquina (etiqueta), Produto da licença, Código.' })
        return
      }

      let importadas = 0
      let ignoradas = 0

      for (const linha of linhas) {
        const cols = linha.split(',').map(c => c.trim())
        const solicitadoPor = cols[0] || ''
        const maquinaEtiqueta = cols[1] || ''
        const produtoLicenca = cols[2] || ''
        const codigoLicenca = cols[3] || ''

        if (!solicitadoPor || !maquinaEtiqueta || !produtoLicenca) {
          ignoradas++
          continue
        }

        try {
          const res = await fetch('/api/licencas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              solicitadoPor: solicitadoPor.trim(),
              maquinaEtiqueta: maquinaEtiqueta.trim(),
              produtoLicenca: produtoLicenca.trim(),
              codigoLicenca: codigoLicenca.trim() || null,
            }),
          })

          if (res.ok) {
            importadas++
          } else {
            ignoradas++
          }
        } catch {
          ignoradas++
        }
      }

      // Recarregar licenças
      const licRes = await fetch('/api/licencas')
      if (licRes.ok) {
        setLicencas(await licRes.json())
      }

      setImportStatus({
        tipo: ignoradas > 0 ? 'erro' : 'ok',
        msg: `${importadas} licença(s) importada(s)${ignoradas > 0 ? `, ${ignoradas} linha(s) ignorada(s)` : ''}.`,
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
              <Select label="Solicitado por (opcional se em estoque)" value={solicitadoPor} onChange={(e) => setSolicitadoPor(e.target.value)}>
                <option value="">Selecionar responsável</option>
                {opcoesResponsaveis.map((nome) => (
                  <option key={nome} value={nome}>{nome}</option>
                ))}
              </Select>
              <Select label="Máquina vinculada (opcional)" value={maquinaEtiqueta} onChange={(e) => setMaquinaEtiqueta(e.target.value)}>
                <option value="">Deixar em estoque</option>
                {opcoesMaquinas.map((item) => (
                  <option key={item.etiqueta} value={item.etiqueta}>
                    {item.etiqueta} — {item.modelo}
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
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Registros cadastrados</h2>
              <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50 dark:bg-gray-800/60">
                <button
                  onClick={() => setFiltroLicenca('todas')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    filtroLicenca === 'todas'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setFiltroLicenca('estoque')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    filtroLicenca === 'estoque'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  Estoque
                </button>
                <button
                  onClick={() => setFiltroLicenca('vinculadas')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    filtroLicenca === 'vinculadas'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  Vinculadas
                </button>
              </div>
            </div>
            <Badge variant="info">{licencas.length + assinaturas.length} registro(s)</Badge>
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
                      <p className="font-medium text-gray-900 dark:text-white">{registro.plataforma}</p>
                      <p className="text-xs text-gray-500">Setor: {registro.setor || '—'}</p>
                      <p className="text-xs text-gray-500">Período: {registro.periodo || '—'}</p>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">{registro.tipoRegistro === 'licenca' ? (registro.codigoLicenca || '—') : (registro.email || '—')}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{formatarDataHora(registro.criadoEm)}</td>
                <td className="px-4 py-3">
                  {registro.tipoRegistro === 'licenca' && !registro.maquinaEtiqueta ? (
                    <button
                      onClick={() => {
                        const maquina = prompt('Digite a etiqueta da máquina para vincular esta licença:')
                        if (maquina) vincularLicenca(registro.id, maquina)
                      }}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mr-2"
                    >
                      <Plus className="w-3.5 h-3.5" /> Vincular
                    </button>
                  ) : null}
                  <button
                    onClick={() => remover(registro.id, registro.tipoRegistro)}
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
