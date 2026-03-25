'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Input, Modal, Table, Badge } from '@/components/ui'
import { Search, Plus, Edit2, Trash2, Download, Upload, X, AlertCircle, CheckCircle } from 'lucide-react'
import { exportarCSV, formatData } from '@/lib/utils'

interface Item {
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

const CAMPOS_OBRIGATORIOS = ['setor', 'responsavel', 'tipo', 'marca', 'modelo', 'etiqueta'] as const
const FORM_VAZIO = { setor: '', responsavel: '', tipo: '', marca: '', modelo: '', etiqueta: '', observacoes: '' }

// Mapeamentos de colunas aceitos (PT e EN)
const MAPA_COLUNAS: Record<string, string> = {
  setor: 'setor', sector: 'setor', departamento: 'setor', department: 'setor',
  responsavel: 'responsavel', responsável: 'responsavel', responsible: 'responsavel', colaborador: 'responsavel', employee: 'responsavel',
  tipo: 'tipo', type: 'tipo', 'tipo de equipamento': 'tipo', 'equipment type': 'tipo',
  marca: 'marca', brand: 'marca', fabricante: 'marca', manufacturer: 'marca',
  modelo: 'modelo', model: 'modelo',
  etiqueta: 'etiqueta', tag: 'etiqueta', 'etiqueta interna': 'etiqueta', 'internal tag': 'etiqueta', patrimonio: 'etiqueta', patrimônio: 'etiqueta',
  observacoes: 'observacoes', observações: 'observacoes', notes: 'observacoes', obs: 'observacoes',
}

export default function InventarioPage() {
  const [itens, setItens] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroSetor, setFiltroSetor] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [modalForm, setModalForm] = useState(false)
  const [modalImport, setModalImport] = useState(false)
  const [editando, setEditando] = useState<Item | null>(null)
  const [deletandoId, setDeletandoId] = useState<string | null>(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [erroForm, setErroForm] = useState('')
  const [loadingForm, setLoadingForm] = useState(false)
  const [importStatus, setImportStatus] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null)
  const [importando, setImportando] = useState(false)
  const [previewImport, setPreviewImport] = useState<Record<string, string>[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  // Setores e tipos únicos para filtros
  const setoresUnicos = [...new Set(itens.map(i => i.setor))].sort()
  const tiposUnicos = [...new Set(itens.map(i => i.tipo))].sort()

  const buscarItens = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (busca) p.set('search', busca)
    if (filtroSetor) p.set('setor', filtroSetor)
    if (filtroTipo) p.set('tipo', filtroTipo)
    const res = await fetch(`/api/inventario?${p}`)
    setItens(await res.json())
    setLoading(false)
  }, [busca, filtroSetor, filtroTipo])

  useEffect(() => { buscarItens() }, [buscarItens])

  const abrirNovo = () => { setEditando(null); setForm(FORM_VAZIO); setErroForm(''); setModalForm(true) }
  const abrirEditar = (item: Item) => {
    setEditando(item)
    setForm({ setor: item.setor, responsavel: item.responsavel, tipo: item.tipo, marca: item.marca, modelo: item.modelo, etiqueta: item.etiqueta, observacoes: item.observacoes ?? '' })
    setErroForm('')
    setModalForm(true)
  }

  const salvar = async () => {
    for (const campo of CAMPOS_OBRIGATORIOS) {
      if (!form[campo].trim()) { setErroForm(`Campo "${campo}" é obrigatório`); return }
    }
    setLoadingForm(true); setErroForm('')
    const url = editando ? `/api/inventario/${editando.id}` : '/api/inventario'
    const res = await fetch(url, { method: editando ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (!res.ok) { setErroForm(data.error || 'Erro ao salvar'); setLoadingForm(false); return }
    setModalForm(false); buscarItens(); setLoadingForm(false)
  }

  const deletar = async () => {
    if (!deletandoId) return
    await fetch(`/api/inventario/${deletandoId}`, { method: 'DELETE' })
    setDeletandoId(null); buscarItens()
  }

  const exportar = () => exportarCSV(itens.map(i => ({
    Setor: i.setor, Responsável: i.responsavel, Tipo: i.tipo,
    Marca: i.marca, Modelo: i.modelo, Etiqueta: i.etiqueta,
    Observações: i.observacoes ?? '', 'Cadastrado em': formatData(i.criadoEm),
  })), 'inventario-ti')

  const baixarModelo = () => exportarCSV([
    { Setor: 'TI', Responsável: 'João Silva', Tipo: 'Notebook', Marca: 'Dell', Modelo: 'Latitude 5520', Etiqueta: 'ETQ-001', Observações: '' },
    { Setor: 'RH', Responsável: 'Maria Souza', Tipo: 'Mouse', Marca: 'Logitech', Modelo: 'MX Master', Etiqueta: 'ETQ-002', Observações: '' },
  ], 'modelo-inventario')

  // Lê CSV ou Excel e monta preview
  const onArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportStatus(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const texto = ev.target?.result as string
      const linhas = texto.split(/\r?\n/).filter(l => l.trim())
      if (linhas.length < 2) { setImportStatus({ tipo: 'erro', msg: 'Arquivo vazio ou sem dados' }); return }

      const cabecalho = linhas[0].split(',').map(c => c.trim().toLowerCase().replace(/['"]/g, ''))
      const mapeado = cabecalho.map(c => MAPA_COLUNAS[c] ?? c)

      const dados = linhas.slice(1).map(linha => {
        const cols = linha.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''))
        const obj: Record<string, string> = {}
        mapeado.forEach((campo, i) => { obj[campo] = cols[i] ?? '' })
        return obj
      }).filter(obj => Object.values(obj).some(v => v))

      setPreviewImport(dados)
    }
    reader.readAsText(file, 'UTF-8')
  }

  const confirmarImport = async () => {
    if (previewImport.length === 0) return
    setImportando(true); setImportStatus(null)
    const res = await fetch('/api/inventario/importar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itens: previewImport }),
    })
    const data = await res.json()
    if (!res.ok) { setImportStatus({ tipo: 'erro', msg: data.error }); setImportando(false); return }
    setImportStatus({ tipo: 'ok', msg: data.mensagem })
    setPreviewImport([])
    if (fileRef.current) fileRef.current.value = ''
    buscarItens(); setImportando(false)
  }

  const s = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventário de Ativos</h1>
            <p className="text-sm text-gray-500 mt-1">{itens.length} item{itens.length !== 1 ? 's' : ''} cadastrado{itens.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} onClick={exportar}>Exportar CSV</Button>
            <Button variant="secondary" size="sm" icon={<Upload className="w-4 h-4" />} onClick={() => { setModalImport(true); setImportStatus(null); setPreviewImport([]) }}>Importar</Button>
            <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={abrirNovo}>Adicionar Item</Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input placeholder="Buscar por responsável, etiqueta, marca ou modelo..." value={busca} onChange={e => setBusca(e.target.value)} icon={<Search className="w-4 h-4" />} />
          </div>
          <select value={filtroSetor} onChange={e => setFiltroSetor(e.target.value)}
            className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todos os setores</option>
            {setoresUnicos.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
            className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todos os tipos</option>
            {tiposUnicos.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Tabela */}
        {loading ? (
          <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
        ) : (
          <Table headers={['Setor', 'Responsável', 'Tipo', 'Marca / Modelo', 'Etiqueta', 'Ações']} empty={itens.length === 0}>
            {itens.map(item => (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3"><Badge variant="info">{item.setor}</Badge></td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.responsavel}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.tipo}</td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{item.marca}</p>
                  <p className="text-xs text-gray-400">{item.modelo}</p>
                </td>
                <td className="px-4 py-3"><span className="font-mono text-sm text-gray-700 dark:text-gray-300">{item.etiqueta}</span></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => abrirEditar(item)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => setDeletandoId(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}

        {/* Modal — Formulário */}
        <Modal open={modalForm} onClose={() => setModalForm(false)} title={editando ? 'Editar Item' : 'Adicionar Item'}>
          <div className="space-y-4">
            {erroForm && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg text-sm text-red-600">{erroForm}</div>}
            <div className="grid grid-cols-2 gap-4">
              <Input label="Setor *" value={form.setor} onChange={e => s('setor', e.target.value)} placeholder="Ex: TI, RH, Financeiro" />
              <Input label="Responsável *" value={form.responsavel} onChange={e => s('responsavel', e.target.value)} placeholder="Nome do colaborador" />
              <Input label="Tipo *" value={form.tipo} onChange={e => s('tipo', e.target.value)} placeholder="Ex: Notebook, Mouse, Monitor" />
              <Input label="Etiqueta *" value={form.etiqueta} onChange={e => s('etiqueta', e.target.value)} placeholder="Ex: ETQ-001" />
              <Input label="Marca *" value={form.marca} onChange={e => s('marca', e.target.value)} placeholder="Ex: Dell, Logitech" />
              <Input label="Modelo *" value={form.modelo} onChange={e => s('modelo', e.target.value)} placeholder="Ex: Latitude 5520" />
              <div className="col-span-2">
                <Input label="Observações" value={form.observacoes} onChange={e => s('observacoes', e.target.value)} placeholder="Informações adicionais..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setModalForm(false)}>Cancelar</Button>
              <Button loading={loadingForm} onClick={salvar}>{editando ? 'Salvar alterações' : 'Adicionar'}</Button>
            </div>
          </div>
        </Modal>

        {/* Modal — Importar */}
        <Modal open={modalImport} onClose={() => setModalImport(false)} title="Importar Planilha">
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-400">
              <p className="font-semibold mb-1">Colunas esperadas no CSV:</p>
              <p className="font-mono text-xs">Setor, Responsável, Tipo, Marca, Modelo, Etiqueta, Observações</p>
              <button onClick={baixarModelo} className="mt-2 text-xs underline hover:no-underline">Baixar modelo de planilha</button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">Arquivo CSV *</label>
              <input ref={fileRef} type="file" accept=".csv,.txt" onChange={onArquivo}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            </div>

            {/* Preview */}
            {previewImport.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">{previewImport.length} item(s) encontrado(s) — preview das primeiras linhas:</p>
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 max-h-48">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-gray-50 dark:bg-gray-800">
                      {['Setor', 'Responsável', 'Tipo', 'Marca', 'Modelo', 'Etiqueta'].map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500">{h}</th>)}
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {previewImport.slice(0, 5).map((item, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5">{item.setor}</td>
                          <td className="px-3 py-1.5">{item.responsavel}</td>
                          <td className="px-3 py-1.5">{item.tipo}</td>
                          <td className="px-3 py-1.5">{item.marca}</td>
                          <td className="px-3 py-1.5">{item.modelo}</td>
                          <td className="px-3 py-1.5 font-mono">{item.etiqueta}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewImport.length > 5 && <p className="text-xs text-gray-400 px-3 py-2">...e mais {previewImport.length - 5} item(s)</p>}
                </div>
              </div>
            )}

            {importStatus && (
              <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${importStatus.tipo === 'ok' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
                {importStatus.tipo === 'ok' ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                <span>{importStatus.msg}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setModalImport(false)}>Fechar</Button>
              <Button loading={importando} onClick={confirmarImport} disabled={previewImport.length === 0}>
                Importar {previewImport.length > 0 ? `${previewImport.length} item(s)` : ''}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal — Deletar */}
        <Modal open={!!deletandoId} onClose={() => setDeletandoId(null)} title="Confirmar exclusão">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Tem certeza que deseja remover este item do inventário?</p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setDeletandoId(null)}>Cancelar</Button>
            <Button variant="danger" onClick={deletar}>Remover</Button>
          </div>
        </Modal>
      </div>
    </AppLayout>
  )
}
