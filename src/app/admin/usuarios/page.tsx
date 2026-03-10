'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, Modal, Input, Select, Badge, Table } from '@/components/ui'
import { Plus, Shield, User, Check, X } from 'lucide-react'
import { formatData } from '@/lib/utils'

interface UsuarioAdmin {
  id: string; nome: string | null; email: string | null; perfil: string; ativo: boolean; criadoEm: string; image: string | null
}

export default function AdminUsuariosPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: 'usuario' })
  const s = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (session && session.user.perfil !== 'admin') router.push('/dashboard')
  }, [session, router])

  const buscar = () => fetch('/api/admin/usuarios').then(r => r.json()).then(d => { setUsuarios(d); setLoading(false) })
  useEffect(() => { buscar() }, [])

  const salvar = async () => {
    if (!form.nome || !form.email || !form.senha) return
    setSalvando(true)
    await fetch('/api/admin/usuarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSalvando(false); setModal(false); buscar()
  }

  const toggleAtivo = async (id: string, ativo: boolean) => {
    await fetch(`/api/admin/usuarios/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ativo: !ativo }) })
    buscar()
  }

  const alterarPerfil = async (id: string, perfil: string) => {
    await fetch(`/api/admin/usuarios/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ perfil }) })
    buscar()
  }

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div></AppLayout>

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Usuários</h1>
            <p className="text-sm text-gray-500 mt-1">{usuarios.length} cadastrado{usuarios.length !== 1 ? 's' : ''}</p>
          </div>
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setModal(true)}>Novo Usuário</Button>
        </div>

        <Table headers={['Usuário', 'Email', 'Perfil', 'Status', 'Cadastro', 'Ações']} empty={usuarios.length === 0}>
          {usuarios.map(u => (
            <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {u.image ? <img src={u.image} className="w-8 h-8 rounded-full" alt="" /> : <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"><User className="w-4 h-4 text-blue-600" /></div>}
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{u.nome ?? '—'}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{u.email}</td>
              <td className="px-4 py-3">
                <select value={u.perfil} onChange={e => alterarPerfil(u.id, e.target.value)} disabled={u.id === session?.user.id}
                  className="text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg px-2 py-1">
                  <option value="usuario">Usuário</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
              <td className="px-4 py-3">{u.ativo ? <Badge variant="success"><Check className="w-3 h-3 mr-1" />Ativo</Badge> : <Badge variant="danger"><X className="w-3 h-3 mr-1" />Inativo</Badge>}</td>
              <td className="px-4 py-3 text-xs text-gray-500">{formatData(u.criadoEm)}</td>
              <td className="px-4 py-3">
                {u.id !== session?.user.id && (
                  <Button variant={u.ativo ? 'danger' : 'secondary'} size="sm" onClick={() => toggleAtivo(u.id, u.ativo)}>
                    {u.ativo ? 'Desativar' : 'Ativar'}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </Table>

        <Modal open={modal} onClose={() => setModal(false)} title="Novo Usuário">
          <div className="space-y-4">
            <Input label="Nome *" value={form.nome} onChange={e => s('nome', e.target.value)} placeholder="Nome completo" />
            <Input label="Email *" type="email" value={form.email} onChange={e => s('email', e.target.value)} placeholder="email@empresa.com" />
            <Input label="Senha *" type="password" value={form.senha} onChange={e => s('senha', e.target.value)} placeholder="Mínimo 6 caracteres" />
            <Select label="Perfil" value={form.perfil} onChange={e => s('perfil', e.target.value)}>
              <option value="usuario">Usuário</option>
              <option value="admin">Admin</option>
            </Select>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
              <Button loading={salvando} icon={<Shield className="w-4 h-4" />} onClick={salvar}>Criar Usuário</Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  )
}
