'use client'
import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="w-64 h-screen sticky top-0"><Sidebar /></div>
      </div>
      {aberto && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setAberto(false)} />
          <div className="relative w-64 z-10"><Sidebar onClose={() => setAberto(false)} /></div>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-40 flex items-center gap-4 px-4 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <button onClick={() => setAberto(true)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <span className="text-sm font-bold text-gray-900 dark:text-white">Estoque TI</span>
        </header>
        <main className="flex-1 p-4 lg:p-8 animate-fade-in">{children}</main>
      </div>
    </div>
  )
}
