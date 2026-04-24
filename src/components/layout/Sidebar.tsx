'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, PlusCircle, ArrowDownCircle, ArrowUpCircle, Truck, Monitor, Moon, Sun, Users, LogOut, Building2, History, ChevronDown, List, Tag, FileSignature, KeyRound, Smartphone, PackageSearch, User } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { ClipboardList } from 'lucide-react'


export function Sidebar({ onClose }: { onClose?: () => void }) {
  const path = usePathname()
  const { data: session } = useSession()
  const [dark, setDark] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (localStorage.getItem('tema') === 'escuro') { document.documentElement.classList.add('dark'); setDark(true) }
  }, [])

  useEffect(() => {
    if (path.startsWith('/produtos')) setExpanded(e => ({ ...e, produtos: true }))
    if (path.startsWith('/movimentacoes')) setExpanded(e => ({ ...e, movimentacoes: true }))
    if (path.startsWith('/admin')) setExpanded(e => ({ ...e, admin: true }))
  }, [path])

  const toggle = (key: string) => setExpanded(e => ({ ...e, [key]: !e[key] }))

  const toggleTema = () => {
    const next = !dark; setDark(next)
    if (next) { document.documentElement.classList.add('dark'); localStorage.setItem('tema', 'escuro') }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('tema', 'claro') }
  }

  const itemCls = (active: boolean) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all w-full
    ${active ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}`

  const subCls = (active: boolean) => `flex items-center gap-3 pl-9 pr-3 py-2 rounded-lg text-xs font-medium transition-all w-full
    ${active ? 'text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20' : 'text-gray-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}`

  return (
    <aside className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 w-64">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 dark:border-gray-800">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
          <Monitor className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">IT Control</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Controle de Ativos</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">

        <Link href="/dashboard" onClick={onClose} className={itemCls(path === '/dashboard')}>
          <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">Dashboard</span>
        </Link>

        {/* Produtos */}
        <div>
          <button onClick={() => toggle('produtos')} className={itemCls(path.startsWith('/produtos'))}>
            <Package className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">Produtos</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded.produtos ? 'rotate-180' : ''}`} />
          </button>
          {expanded.produtos && (
            <div className="mt-0.5 space-y-0.5">
              <Link href="/produtos" onClick={onClose} className={subCls(path === '/produtos')}>
                <List className="w-3.5 h-3.5 flex-shrink-0" />
                Listar Produtos
              </Link>
              <Link href="/produtos/novo" onClick={onClose} className={subCls(path === '/produtos/novo')}>
                <PlusCircle className="w-3.5 h-3.5 flex-shrink-0" />
                Novo Produto
              </Link>
              <Link href="/consulta-produtos" onClick={onClose} className={subCls(path === '/consulta-produtos')}>
                <PackageSearch className="w-3.5 h-3.5 flex-shrink-0" />
                Consulta Produtos
              </Link>
            </div>
          )}
        </div>

        {/* Movimentações */}
        <div>
          <button onClick={() => toggle('movimentacoes')} className={itemCls(path.startsWith('/movimentacoes'))}>
            <List className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">Movimentações</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded.movimentacoes ? 'rotate-180' : ''}`} />
          </button>
          {expanded.movimentacoes && (
            <div className="mt-0.5 space-y-0.5">
              <Link href="/movimentacoes" onClick={onClose} className={subCls(path === '/movimentacoes')}>
                <List className="w-3.5 h-3.5 flex-shrink-0" />
                Listar Movimentações
              </Link>
              <Link href="/movimentacoes/entrada" onClick={onClose} className={subCls(path === '/movimentacoes/entrada')}>
                <ArrowDownCircle className="w-3.5 h-3.5 flex-shrink-0" />
                Entrada de Estoque
              </Link>
              <Link href="/movimentacoes/saida" onClick={onClose} className={subCls(path === '/movimentacoes/saida')}>
                <ArrowUpCircle className="w-3.5 h-3.5 flex-shrink-0" />
                Saída de Estoque
              </Link>
            </div>
          )}
        </div>

        {/* Fornecedores */}
        <Link href="/fornecedores" onClick={onClose} className={itemCls(path === '/fornecedores')}>
          <Truck className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">Fornecedores</span>
        </Link>
        
        <Link href="/inventario" onClick={onClose} className={itemCls(path === '/inventario')}>
          <ClipboardList className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">Inventário</span>
        </Link>

        <Link href="/smartphones" onClick={onClose} className={itemCls(path === '/smartphones')}>
          <Smartphone className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">Smartphones</span>
        </Link>

        <Link href="/termos" onClick={onClose} className={itemCls(path === '/termos')}>
          <FileSignature className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">Termos</span>
        </Link>

        <Link href="/licencas-assinaturas" onClick={onClose} className={itemCls(path === '/licencas-assinaturas')}>
          <KeyRound className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">Licenças e Assinaturas</span>
        </Link>

        {/* Administração */}
        {session?.user.perfil === 'admin' && (
          <div>
            <button onClick={() => toggle('admin')} className={itemCls(path.startsWith('/admin'))}>
              <Users className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">Administração</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${expanded.admin ? 'rotate-180' : ''}`} />
            </button>
            {expanded.admin && (
              <div className="mt-0.5 space-y-0.5">
                <Link href="/admin/usuarios" onClick={onClose} className={subCls(path === '/admin/usuarios')}>
                  <Users className="w-3.5 h-3.5 flex-shrink-0" />
                  Usuários
                </Link>
                <Link href="/admin/historico" onClick={onClose} className={subCls(path === '/admin/historico')}>
                  <History className="w-3.5 h-3.5 flex-shrink-0" />
                  Histórico
                </Link>
                <Link href="/admin/setores" onClick={onClose} className={subCls(path === '/admin/setores')}>
                  <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                  Setores
                </Link>
                <Link href="/admin/funcionarios" onClick={onClose} className={subCls(path === '/admin/funcionarios')}>
                  <User className="w-3.5 h-3.5 flex-shrink-0" />
                  Funcionários
                </Link>
                <Link href="/admin/categorias" onClick={onClose} className={subCls(path === '/admin/categorias')}>
                  <Tag className="w-3.5 h-3.5 flex-shrink-0" />
                  Categorias
                </Link>
              </div>
            )}
          </div>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
        <button onClick={toggleTema} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {dark ? 'Modo Claro' : 'Modo Escuro'}
        </button>

        {session?.user && (
          <div className="mx-1 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              {session.user.image
                ? <img src={session.user.image} className="w-9 h-9 rounded-full flex-shrink-0 ring-2 ring-blue-100 dark:ring-blue-900" alt="" />
                : <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-white">{session.user.name?.charAt(0)?.toUpperCase() ?? '?'}</span>
                  </div>}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{session.user.name ?? '—'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{session.user.email}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-md capitalize ${session.user.perfil === 'admin' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                {session.user.perfil}
              </span>
              <button onClick={() => signOut({ callbackUrl: '/login' })} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors">
                <LogOut className="w-3.5 h-3.5" />Sair
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
