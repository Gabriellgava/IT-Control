'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge, Button, Input, Modal, Table } from '@/components/ui'
import { Edit2, KeyRound, Plus, Search, Trash2 } from 'lucide-react'

interface LicencaItem {
  id: string
  solicitante: string
  setor: string
  tipoLicenca: string
  codigoLicenca?: string | null
  provedor?: string | null
  status: string
  observacoes?: string | null
  criadoEm: string
}

const FORM_INICIAL = {
  solicitante: '',
  setor: '',
  tipoLicenca: '',
  codigoLicenca: '',
  provedor: '',
  status: 'ATIVA',
  observacoes: '',
}

export default function LicencasPage() {
  // Estados da listagem de licenças/assinaturas.
  const [licencas, setLicencas] = useState<LicencaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [setorFiltro, setSetorFiltro] = useState('')

  // Estados de formulário e modais.
  const [modalForm, setModalForm] = useState(false)
  const [modalDelete, setModalDelete] = useState(false)
  const [editando, setEditando] = useState<LicencaItem | null>(null)
  const [deletandoId, setDeletandoId] = useState<string | null>(null)
  const [form, setForm] = useState(FORM_INICIAL)
  const [erroForm, setErroForm] = useState('')
  const [loadingForm, setLoadingForm] = useState(false)

  const carregarLicencas = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (busca) p.set('search', busca)
      if (setorFiltro) p.set('setor', setorFiltro)

      const res = await fetch(`/api/licencas?${p}`)
      if (!res.ok) throw new Error('Falha ao buscar licenças')
      setLicencas(await res.json())
    } finally {
      setLoading(false)
    }
  }, [busca, setorFiltro])

  useEffect(() => {
    carregarLicencas()
  }, [carregarLicencas])

  const setores = useMemo(() => [...new Set(licencas.map((l) => l.setor))].sort(), [licencas])

  const abrirNovo = () => {
    setEditando(null)
    setForm(FORM_INICIAL)
    setErroForm('')
    setModalForm(true)
  }

  const abrirEditar = (item: LicencaItem) => {
    setEditando(item)
    setForm({
      solicitante: item.solicitante,
      setor: item.setor,
      tipoLicenca: item.tipoLicenca,
      codigoLicenca: item.codigoLicenca ?? '',
      provedor: item.provedor ?? '',
      status: item.status,
      observacoes: item.observacoes ?? '',
    })
    setErroForm('')
    setModalForm(true)
  }

  const salvar = async () => {
    if (!form.solicitante.trim() || !form.setor.trim() || !form.tipoLicenca.trim()) {
      setErroForm('Preencha solicitante, setor e tipo de licença.')
      return
    }

    setLoadingForm(true)
    setErroForm('')

    const url = editando ? `/api/licencas/${editando.id}` : '/api/licencas'
    const method = editando ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()
    if (!res.ok) {
      setErroForm(data.error || 'Erro ao salvar licença/assinatura')
      setLoadingForm(false)
      return
    }

    setModalForm(false)
    setLoadingForm(false)
    carregarLicencas()
  }

  const confirmarRemocao = (id: string) => {
    setDeletandoId(id)
    setModalDelete(true)
  }

  const deletar = async () => {
    if (!deletandoId) return

    await fetch(`/api/licencas/${deletandoId}`, { method: 'DELETE' })
    setModalDelete(false)
    setDeletandoId(null)
    carregarLicencas()
  }

  const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' => {
    if (status === 'ATIVA') return 'success'
    if (status === 'EXPIRADA') return 'warning'
    if (status === 'CANCELADA') return 'danger'
    return 'default'
  }

  const atualizarCampo = (campo: keyof typeof FORM_INICIAL, valor: string) => {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Licenças e Assinaturas</h1>
            <p className="text-sm text-gray-500 mt-1">Cadastro separado das licenças de software e assinaturas de IA.</p>
          </div>
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={abrirNovo}>
            Nova licença
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Buscar por solicitante, tipo ou código..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>

          <select
            value={setorFiltro}
            onChange={(e) => setSetorFiltro(e.target.value)}
            className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os setores</option>
            {setores.map((setor) => (
              <option key={setor} value={setor}>
                {setor}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <Table
            headers={['Solicitante', 'Setor', 'Tipo de licença', 'Código', 'Status', 'Ações']}
            empty={licencas.length === 0}
          >
            {licencas.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.solicitante}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.setor}</td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{item.tipoLicenca}</p>
                  {item.provedor && <p className="text-xs text-gray-500">{item.provedor}</p>}
                </td>
                <td className="px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-300">{item.codigoLicenca || '—'}</td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => abrirEditar(item)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => confirmarRemocao(item.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}

        <Modal open={modalForm} onClose={() => setModalForm(false)} title={editando ? 'Editar licença/assinatura' : 'Nova licença/assinatura'}>
          <div className="space-y-4">
            {erroForm && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{erroForm}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Solicitante *" value={form.solicitante} onChange={(e) => atualizarCampo('solicitante', e.target.value)} />
              <Input label="Setor *" value={form.setor} onChange={(e) => atualizarCampo('setor', e.target.value)} />
              <Input label="Tipo de licença *" value={form.tipoLicenca} onChange={(e) => atualizarCampo('tipoLicenca', e.target.value)} placeholder="Ex.: Windows Pro, Microsoft 365, ChatGPT Team" />
              <Input label="Código da licença" value={form.codigoLicenca} onChange={(e) => atualizarCampo('codigoLicenca', e.target.value)} placeholder="Opcional" />
              <Input label="Fornecedor/Plataforma" value={form.provedor} onChange={(e) => atualizarCampo('provedor', e.target.value)} placeholder="Ex.: Microsoft, OpenAI" />

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => atualizarCampo('status', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ATIVA">ATIVA</option>
                  <option value="EXPIRADA">EXPIRADA</option>
                  <option value="CANCELADA">CANCELADA</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">Observações</label>
                <textarea
                  rows={3}
                  value={form.observacoes}
                  onChange={(e) => atualizarCampo('observacoes', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setModalForm(false)}>
                Cancelar
              </Button>
              <Button loading={loadingForm} icon={<KeyRound className="w-4 h-4" />} onClick={salvar}>
                {editando ? 'Salvar alterações' : 'Cadastrar licença'}
              </Button>
            </div>
          </div>
        </Modal>

        <Modal open={modalDelete} onClose={() => setModalDelete(false)} title="Confirmar exclusão">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Tem certeza que deseja remover este cadastro?</p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setModalDelete(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={deletar}>
              Remover
            </Button>
          </div>
        </Modal>
      </div>
    </AppLayout>
  )
}
