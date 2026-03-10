'use client'
import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { Loader2, X } from 'lucide-react'

export function Badge({ children, variant = 'default' }: { children: ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' }) {
  const s = { default: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${s[variant]}`}>{children}</span>
}

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; size?: 'sm' | 'md' | 'lg'; loading?: boolean; icon?: ReactNode }
export function Button({ children, variant = 'primary', size = 'md', loading, icon, className = '', ...props }: BtnProps) {
  const v = { primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm', secondary: 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600', danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm', ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400' }
  const sz = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' }
  return <button {...props} disabled={loading || props.disabled} className={`inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${v[variant]} ${sz[size]} ${className}`}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}{children}</button>
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm ${className}`}>{children}</div>
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string; icon?: ReactNode }
export function Input({ label, error, icon, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{label}</label>}
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>}
        <input {...props} className={`w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${icon ? 'pl-9 pr-3' : 'px-3'} ${error ? 'border-red-400' : ''} ${className}`} />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> { label?: string }
export function Select({ label, children, className = '', ...props }: SelectProps) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{label}</label>}
      <select {...props} className={`w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${className}`}>{children}</select>
    </div>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> { label?: string }
export function Textarea({ label, className = '', ...props }: TextareaProps) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{label}</label>}
      <textarea {...props} className={`w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none ${className}`} />
    </div>
  )
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl animate-fade-in max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
      </div>
    </div>
  )
}

export function Table({ headers, children, empty }: { headers: string[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
      <table className="w-full text-sm">
        <thead><tr className="bg-gray-50 dark:bg-gray-800/50">{headers.map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {empty ? <tr><td colSpan={headers.length} className="px-4 py-12 text-center text-gray-400 text-sm">Nenhum registro encontrado</td></tr> : children}
        </tbody>
      </table>
    </div>
  )
}

export function StatCard({ label, value, icon, color = 'blue', sub }: { label: string; value: string | number; icon: ReactNode; color?: string; sub?: string }) {
  const colors: Record<string, string> = { blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400', green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400', amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400', red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400', purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' }
  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl ${colors[color]}`}>{icon}</div>
      </div>
    </Card>
  )
}
