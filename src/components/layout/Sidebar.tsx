'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, PlusCircle, ArrowDownCircle, ArrowUpCircle, Truck, Monitor, Moon, Sun, List, Users, LogOut, Building2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/ativos', label: 'Ativos', icon: Package },
  { href: '/ativos/novo', label: 'Adicionar Ativo', icon: PlusCircle, sub: true },
  { href: '/movimentacoes', label: 'Movimentações', icon: List },
  { href: '/movimentacoes/entrada', label: 'Entrada de Estoque', icon: ArrowDownCircle, sub: true },
  { href: '/movimentacoes/saida', label: 'Saída de Estoque', icon: ArrowUpCircle, sub: true },
  { href: '/fornecedores', label: 'Fornecedores', icon: Truck },
]

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const path = usePathname()
  const { data: session } = useSession()
  const [dark, setDark] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('tema') === 'escuro') { document.documentElement.classList.add('dark'); setDark(true) }
  }, [])

  const toggleTema = () => {
    const next = !dark; setDark(next)
    if (next) { document.documentElement.classList.add('dark'); localStorage.setItem('tema', 'escuro') }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('tema', 'claro') }
  }

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
        {nav.map(({ href, label, icon: Icon, sub }) => {
          const active = path === href || (href !== '/dashboard' && path.startsWith(href))
          return (
            <Link key={href} href={href} onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${sub ? 'ml-4 text-xs' : ''}
                ${active ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}`}>
              <Icon className={`flex-shrink-0 ${sub ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
              <span className="flex-1">{label}</span>
            </Link>
          )
        })}

        {session?.user.perfil === 'admin' && (
          <>
            <div className="pt-2 pb-1 px-3">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Administração</p>
            </div>
            <Link href="/admin/usuarios" onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${path === '/admin/usuarios' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}`}>
              <Users className="w-4 h-4 flex-shrink-0" />
              <span>Usuários</span>
            </Link>
            <Link href="/admin/setores" onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${path === '/admin/setores' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}`}>
              <Building2 className="w-4 h-4 flex-shrink-0" />
              <span>Setores</span>
            </Link>
          </>
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
