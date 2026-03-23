'use client'
import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Input, Modal, Table, Badge } from '@/components/ui'
import { Plus, Edit2, Trash2, Tag } from 'lucide-react'
import type { Categoria } from '@/types'

export default function Page() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Categoria | null>(null)
  const [deletandoId, setDeletandoId] = useState<string | null>(null)
  const [form, setForm] = useState({ nome: '', estoqueMinimo: '0' })
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  const buscar = () => fetch('/api/categorias').then(r => r.json()).then(setCategorias)
  useEffect(() => { buscar() }, [])

  const abrirNovo = () => { setEditando(null); setForm({ nome: '', estoqueMinimo: '0' }); setErro(''); setModal(true) }
  const abrirEditar = (c: Categoria) => { setEditando(c); setForm({ nome: c.nome, estoqueMinimo: c.estoqueMinimo.toString() }); setErro(''); setModal(true) }

  const salvar = async () => {
    if (!form.nome.trim()) { setErro('Nome é obrigatório'); return }
    setLoading(true); setErro('')
    const url = editando ? `/api/categorias/${editando.id}` : '/api/categorias'
    const res = await fetch(url, { method: editando ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (!res.ok) { setErro(data.error || 'Erro ao salvar'); setLoading(false); return }
    setModal(false); buscar(); setLoading(false)
  }

  const deletar = async () => {
    if (!deletandoId) return
    const res = await fetch(`/api/categorias/${deletandoId}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { alert(data.error); return }
    setDeletandoId(null); buscar()
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Categorias</h1>
            <p className="text-sm text-gray-500 mt-1">{categorias.length} categoria{categorias.length !== 1 ? 's' : ''}</p>
          </div>
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={abrirNovo}>Nova Categoria</Button>
        </div>

        <Table headers={['Categoria', 'Estoque Mínimo', 'Ativos Vinculados', 'Ações']} empty={categorias.length === 0}>
          {categorias.map(c => (
            <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{c.nome}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge variant={c.estoqueMinimo > 0 ? 'warning' : 'default'}>{c.estoqueMinimo} unidades</Badge>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{c._count?.produtos ?? 0} produto(s)</td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <button onClick={() => abrirEditar(c)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => setDeletandoId(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          ))}
        </Table>

        <Modal open={modal} onClose={() => setModal(false)} title={editando ? 'Editar Categoria' : 'Nova Categoria'}>
          <div className="space-y-4">
            {erro && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg text-sm text-red-600">{erro}</div>}
            <Input label="Nome da Categoria *" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Teclados, Monitores, Notebooks..." />
            <Input label="Estoque Mínimo (total da categoria)" type="number" min="0" value={form.estoqueMinimo} onChange={e => setForm(f => ({ ...f, estoqueMinimo: e.target.value }))} />
            <p className="text-xs text-gray-400">O alerta será disparado quando a soma de todos os ativos desta categoria atingir ou ficar abaixo deste valor.</p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
              <Button loading={loading} onClick={salvar}>{editando ? 'Salvar alterações' : 'Criar Categoria'}</Button>
            </div>
          </div>
        </Modal>

        <Modal open={!!deletandoId} onClose={() => setDeletandoId(null)} title="Confirmar exclusão">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Tem certeza que deseja excluir esta categoria? Os ativos vinculados precisam ser removidos ou movidos antes.</p>
          <div className="flex gap-3 justify-end"><Button variant="secondary" onClick={() => setDeletandoId(null)}>Cancelar</Button><Button variant="danger" onClick={deletar}>Excluir</Button></div>
        </Modal>
      </div>
    </AppLayout>
  )
}
