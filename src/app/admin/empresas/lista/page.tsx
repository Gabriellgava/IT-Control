'use client'
import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Input, Modal, Table, Badge } from '@/components/ui'
import { Plus, Edit2, Trash2, Building2, Mail, Phone, MapPin } from 'lucide-react'
import type { Empresa } from '@/types'

export default function EmpresasListaPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Empresa | null>(null)
  const [deletandoId, setDeletandoId] = useState<string | null>(null)
  const [form, setForm] = useState({ 
    razaoSocial: '', 
    nomeFantasia: '', 
    cnpj: '', 
    endereco: '', 
    telefone: '', 
    email: '',
    logoUrl: ''
  })
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  const buscar = () => fetch('/api/empresas').then(r => r.json()).then(setEmpresas)
  useEffect(() => { buscar() }, [])

  const abrirNovo = () => { 
    setEditando(null)
    setForm({ razaoSocial: '', nomeFantasia: '', cnpj: '', endereco: '', telefone: '', email: '', logoUrl: '' })
    setErro('')
    setModal(true)
  }

  const abrirEditar = (e: Empresa) => { 
    setEditando(e)
    setForm({ 
      razaoSocial: e.razaoSocial, 
      nomeFantasia: e.nomeFantasia || '', 
      cnpj: e.cnpj, 
      endereco: e.endereco || '', 
      telefone: e.telefone || '', 
      email: e.email || '',
      logoUrl: e.logoUrl || ''
    })
    setErro('')
    setModal(true)
  }

  const salvar = async () => {
    if (!form.razaoSocial.trim()) { setErro('Razão social é obrigatória'); return }
    if (!form.cnpj.trim()) { setErro('CNPJ é obrigatório'); return }
    setLoading(true)
    setErro('')
    const url = editando ? `/api/empresas/${editando.id}` : '/api/empresas'
    const res = await fetch(url, { 
      method: editando ? 'PUT' : 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(form) 
    })
    const data = await res.json()
    if (!res.ok) { setErro(data.error || 'Erro ao salvar'); setLoading(false); return }
    setModal(false)
    setLoading(false)
    window.location.href = '/admin'
  }

  const deletar = async () => {
    if (!deletandoId) return
    const res = await fetch(`/api/empresas/${deletandoId}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { alert(data.error); return }
    setDeletandoId(null)
    buscar()
  }

  const maskCNPJ = (value: string) => {
    return value
      .replace(/\D/g, "")
      .slice(0, 14)
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2")
  }

  const maskPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11)
    if (digits.length <= 10) {
      return digits
        .replace(/^(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2")
    }
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Empresas</h1>
            <p className="text-sm text-gray-500 mt-1">{empresas.length} empresa{empresas.length !== 1 ? 's' : ''} cadastrada{empresas.length !== 1 ? 's' : ''}</p>
          </div>
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={abrirNovo}>Nova Empresa</Button>
        </div>

        <Table headers={['Empresa', 'CNPJ', 'Contato', 'Endereço', 'Ações']} empty={empresas.length === 0}>
          {empresas.map(e => (
            <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white block">{e.nomeFantasia || e.razaoSocial}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{e.razaoSocial}</span>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge variant="default">{e.cnpj}</Badge>
              </td>
              <td className="px-4 py-3">
                <div className="space-y-1">
                  {e.email && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                      <Mail className="w-3 h-3" />
                      {e.email}
                    </div>
                  )}
                  {e.telefone && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                      <Phone className="w-3 h-3" />
                      {e.telefone}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                {e.endereco ? (
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate max-w-[200px]">{e.endereco}</span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">-</span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <button onClick={() => abrirEditar(e)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => setDeletandoId(e.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          ))}
        </Table>

        <Modal open={modal} onClose={() => setModal(false)} title={editando ? 'Editar Empresa' : 'Nova Empresa'}>
          <div className="space-y-4">
            {erro && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg text-sm text-red-600">{erro}</div>}
            
            <Input 
              label="Razão Social *" 
              value={form.razaoSocial} 
              onChange={e => setForm(f => ({ ...f, razaoSocial: e.target.value }))} 
              placeholder="Ex: IT Control Tecnologia Ltda." 
            />
            
            <Input 
              label="Nome Fantasia" 
              value={form.nomeFantasia} 
              onChange={e => setForm(f => ({ ...f, nomeFantasia: e.target.value }))} 
              placeholder="Ex: IT Control" 
            />
            
            <Input 
              label="CNPJ *" 
              value={form.cnpj} 
              onChange={e => setForm(f => ({ ...f, cnpj: maskCNPJ(e.target.value) }))} 
              placeholder="00.000.000/0000-00" 
              maxLength={18}
            />
            
            <Input 
              label="E-mail" 
              type="email"
              value={form.email} 
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} 
              placeholder="contato@empresa.com.br" 
            />
            
            <Input 
              label="Telefone" 
              value={form.telefone} 
              onChange={e => setForm(f => ({ ...f, telefone: maskPhone(e.target.value) }))} 
              placeholder="(00) 00000-0000" 
              maxLength={16}
            />
            
            <Input 
              label="Endereço" 
              value={form.endereco} 
              onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} 
              placeholder="Rua, número, bairro, cidade - UF" 
            />

            <Input 
              label="URL do Logo" 
              type="url"
              value={form.logoUrl} 
              onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} 
              placeholder="https://..." 
            />
            
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
              <Button loading={loading} onClick={salvar}>{editando ? 'Salvar alterações' : 'Criar Empresa'}</Button>
            </div>
          </div>
        </Modal>

        <Modal open={!!deletandoId} onClose={() => setDeletandoId(null)} title="Confirmar exclusão">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Tem certeza que deseja excluir esta empresa? Esta ação não pode ser desfeita.</p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setDeletandoId(null)}>Cancelar</Button>
            <Button variant="danger" onClick={deletar}>Excluir</Button>
          </div>
        </Modal>
      </div>
    </AppLayout>
  )
}
