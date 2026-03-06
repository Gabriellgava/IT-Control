'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  Truck,
  Users,
  Settings,
  Monitor,
  ChevronRight,
  Moon,
  Sun,
} from 'lucide-react'
import { useState, useEffect } from 'react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/assets', label: 'Ativos', icon: Package },
  { href: '/assets/new', label: 'Adicionar Ativo', icon: PlusCircle },
  { href: '/movements', label: 'Movimentações', icon: ArrowDownCircle },
  { href: '/movements/in', label: 'Entrada de Estoque', icon: ArrowDownCircle, indent: true },
  { href: '/movements/out', label: 'Saída de Estoque', icon: ArrowUpCircle, indent: true },
  { href: '/suppliers', label: 'Fornecedores', icon: Truck },
]

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') { document.documentElement.classList.add('dark'); setDark(true) }
  }, [])

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    if (next) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark') }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light') }
  }

  return (
    <aside className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 w-64">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 dark:border-gray-800">
        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shadow-md">
          <Monitor className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-700 text-gray-900 dark:text-white font-bold leading-tight">Fast Storage TI</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Controle de Estoque</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, indent }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group
                ${indent ? 'ml-4 text-xs' : ''}
                ${active
                  ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              <Icon className={`flex-shrink-0 ${indent ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-100 dark:border-gray-800 space-y-1">
        <button
          onClick={toggleDark}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {dark ? 'Modo Claro' : 'Modo Escuro'}
        </button>
      </div>
    </aside>
  )
}
