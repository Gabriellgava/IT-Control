'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge, Table, Select, Button } from '@/components/ui'
import { ArrowDownCircle, ArrowUpCircle, Download, RefreshCw, Trash2 } from 'lucide-react'
import { formatMoeda, formatDataHora, exportarCSV } from '@/lib/utils'

interface Mov {
  id: string; tipo: string; subtipo?: string | null; quantidade: number; valorUnitario: number; data: string
  responsavel: string | null; observacoes: string | null
  ativo: { id: string; nome: string; codigo: string; categoria?: { nome: string } | null } | null
  fornecedor: { nome: string } | null
  setor: { nome: string } | null
  usuario: { id: string; nome: string | null; email: string | null } | null
}
interface Ativo { id: string; nome: string; codigo: string }
interface Usuario { id: string; nome: string | null; email: string | null }
interface Setor { id: string; nome: string }
interface Categoria { id: string; nome: string }

export default function HistoricoPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [movs, setMovs] = useState<Mov[]>([])
  const [ativos, setAtivos] = useState<Ativo[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [setores, setSetores] = useState<Setor[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [paginas, setPaginas] = useState(1)
  const [pagina, setPagina] = useState(1)
  const [filtros, setFiltros] = useState({ tipo: '', subtipo: '', produtoId: '', usuarioId: '', setorId: '', categoriaId: '' })
  const f = (k: string, v: string) => { setFiltros(p => ({ ...p, [k]: v })); setPagina(1) }

  useEffect(() => {
    if (session && session.user.perfil !== 'admin') router.push('/dashboard')
  }, [session, router])

  useEffect(() => {
    fetch('/api/ativos').then(r => r.json()).then(setAtivos)
    fetch('/api/admin/usuarios').then(r => r.json()).then(setUsuarios)
    fetch('/api/setores').then(r => r.json()).then(setSetores)
    fetch('/api/categorias').then(r => r.json()).then(setCategorias)
  }, [])

  const buscar = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (filtros.tipo) p.set('tipo', filtros.tipo)
    if (filtros.subtipo) p.set('subtipo', filtros.subtipo)
    if (filtros.produtoId) p.set('produtoId', filtros.produtoId)
    if (filtros.usuarioId) p.set('usuarioId', filtros.usuarioId)
    if (filtros.setorId) p.set('setorId', filtros.setorId)
    if (filtros.categoriaId) p.set('categoriaId', filtros.categoriaId)
    p.set('pagina', pagina.toString())
    const res = await fetch(`/api/admin/historico?${p}`)
    const data = await res.json()
    setMovs(data.movimentacoes ?? [])
    setTotal(data.total ?? 0)
    setPaginas(data.paginas ?? 1)
    setLoading(false)
  }, [filtros, pagina])

  useEffect(() => { buscar() }, [buscar])

  const exportar = () => exportarCSV(movs.map(m => ({
    Tipo: m.tipo,
    Subtipo: m.subtipo ?? '—',
    Produto: m.ativo?.nome ?? '(deletado)',
    Código: m.ativo?.codigo ?? '—',
    Categoria: m.ativo?.categoria?.nome ?? '—',
    Quantidade: m.quantidade,
    'Valor Unit.': m.valorUnitario,
    Setor: m.setor?.nome ?? '—',
    Fornecedor: m.fornecedor?.nome ?? '—',
    Usuário: m.usuario?.nome ?? m.usuario?.email ?? '—',
    Responsável: m.responsavel ?? '—',
    Observações: m.observacoes ?? '—',
    Data: formatDataHora(m.data),
  })), 'historico-movimentacoes')

  const limparFiltros = () => { setFiltros({ tipo: '', subtipo: '', produtoId: '', usuarioId: '', setorId: '', categoriaId: '' }); setPagina(1) }
  const temFiltro = Object.values(filtros).some(v => v !== '')

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Histórico de Movimentações</h1>
            <p className="text-sm text-gray-500 mt-1">{total} registro{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} onClick={exportar}>CSV</Button>
            <Button variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={buscar}>Atualizar</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <Select value={filtros.tipo} onChange={e => f('tipo', e.target.value)}>
            <option value="">Todos os tipos</option>
            <option value="ENTRADA">Entradas</option>
            <option value="SAIDA">Saídas</option>
          </Select>
          <Select value={filtros.subtipo} onChange={e => f('subtipo', e.target.value)}>
            <option value="">Todos os subtipos</option>
            <option value="USUARIO">Saída p/ Usuário</option>
            <option value="DESCARTE">Descarte</option>
          </Select>
          <Select value={filtros.categoriaId} onChange={e => f('categoriaId', e.target.value)}>
            <option value="">Todas as categorias</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
          <Select value={filtros.produtoId} onChange={e => f('produtoId', e.target.value)}>
            <option value="">Todos os produtos</option>
            {ativos.map(a => <option key={a.id} value={a.id}>{a.nome} ({a.codigo})</option>)}
          </Select>
          <Select value={filtros.usuarioId} onChange={e => f('usuarioId', e.target.value)}>
            <option value="">Todos os usuários</option>
            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome ?? u.email}</option>)}
          </Select>
          <Select value={filtros.setorId} onChange={e => f('setorId', e.target.value)}>
            <option value="">Todos os setores</option>
            {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </Select>
        </div>

        {temFiltro && (
          <button onClick={limparFiltros} className="text-xs text-blue-600 hover:underline">Limpar filtros</button>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
        ) : (
          <Table headers={['Tipo', 'Produto', 'Categoria', 'Qtd', 'Valor Unit.', 'Destino', 'Usuário', 'Data']} empty={movs.length === 0}>
            {movs.map(m => (
              <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3">
                  {m.tipo === 'ENTRADA'
                    ? <Badge variant="success"><ArrowDownCircle className="w-3 h-3 mr-1" />Entrada</Badge>
                    : m.subtipo === 'DESCARTE'
                      ? <Badge variant="danger"><Trash2 className="w-3 h-3 mr-1" />Descarte</Badge>
                      : <Badge variant="warning"><ArrowUpCircle className="w-3 h-3 mr-1" />Saída</Badge>}
                </td>
                <td className="px-4 py-3">
                  {m.ativo
                    ? <><p className="text-sm font-medium text-gray-900 dark:text-white">{m.ativo.nome}</p><p className="text-xs text-gray-400 font-mono">{m.ativo.codigo}</p></>
                    : <p className="text-sm text-gray-400 italic">(produto deletado)</p>}
                </td>
                <td className="px-4 py-3">
                  {m.ativo?.categoria
                    ? <Badge variant="info">{m.ativo.categoria.nome}</Badge>
                    : <span className="text-xs text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-sm font-bold ${m.tipo === 'ENTRADA' ? 'text-green-600' : m.subtipo === 'DESCARTE' ? 'text-red-600' : 'text-amber-600'}`}>
                    {m.tipo === 'ENTRADA' ? '+' : '-'}{m.quantidade}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{formatMoeda(m.valorUnitario)}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {m.tipo === 'ENTRADA' ? (m.fornecedor?.nome ?? '—')
                    : m.subtipo === 'DESCARTE' ? <span className="text-red-500 text-xs font-medium">Descartado</span>
                    : (m.setor?.nome ?? '—')}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{m.usuario?.nome ?? m.usuario?.email ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDataHora(m.data)}</td>
              </tr>
            ))}
          </Table>
        )}

        {paginas > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">{(pagina - 1) * 20 + 1}–{Math.min(pagina * 20, total)} de {total}</p>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(paginas, 10) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPagina(p)}
                  className={`w-8 h-8 rounded-lg text-sm transition-colors ${p === pagina ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>{p}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
