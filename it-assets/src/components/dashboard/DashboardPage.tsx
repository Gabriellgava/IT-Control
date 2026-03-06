'use client'

import { useEffect, useState } from 'react'
import { Package, AlertTriangle, TrendingUp, DollarSign, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { StatCard, Card } from '@/components/ui'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { DashboardStats } from '@/types'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    )
  }

  if (!stats) return <p className="text-gray-500">Erro ao carregar dados.</p>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Visão geral do estoque e ativos de TI</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total de Produtos"
          value={stats.totalAssets}
          icon={<Package className="w-5 h-5" />}
          color="blue"
          sub="ativos cadastrados"
        />
        <StatCard
          label="Itens em Estoque"
          value={stats.totalItems}
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
          sub="unidades disponíveis"
        />
        <StatCard
          label="Valor do Estoque"
          value={formatCurrency(stats.totalValue)}
          icon={<DollarSign className="w-5 h-5" />}
          color="purple"
          sub="valor total"
        />
        <StatCard
          label="Estoque Baixo"
          value={stats.lowStockCount}
          icon={<AlertTriangle className="w-5 h-5" />}
          color={stats.lowStockCount > 0 ? 'red' : 'green'}
          sub={stats.lowStockCount > 0 ? 'requerem reposição' : 'tudo ok'}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Movement chart */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Movimentações — Últimos 7 dias</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.movementChart} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="in" name="Entradas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="out" name="Saídas" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Supplier pie chart */}
        <Card className="p-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Distribuição por Fornecedor</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={stats.supplierDistribution}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={40}
              >
                {stats.supplierDistribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top products */}
        <Card className="p-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Top Produtos — Maior Saída</h3>
          {stats.topAssets.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma saída registrada</p>
          ) : (
            <div className="space-y-3">
              {stats.topAssets.map((a, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white font-medium truncate">{a.name}</p>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full mt-1">
                      <div
                        className="h-1.5 bg-brand-500 rounded-full"
                        style={{ width: `${Math.min(100, (a.outCount / (stats.topAssets[0]?.outCount || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300 flex-shrink-0">{a.outCount}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent movements */}
        <Card className="p-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Últimas Movimentações</h3>
          <div className="space-y-2">
            {stats.recentMovements.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma movimentação registrada</p>
            ) : stats.recentMovements.slice(0, 6).map(m => (
              <div key={m.id} className="flex items-center gap-3 py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
                <div className={`p-1.5 rounded-lg flex-shrink-0 ${m.type === 'IN' ? 'bg-green-50 dark:bg-green-900/20 text-green-500' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-500'}`}>
                  {m.type === 'IN' ? <ArrowDownCircle className="w-3.5 h-3.5" /> : <ArrowUpCircle className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{m.asset?.name}</p>
                  <p className="text-xs text-gray-400">{m.type === 'IN' ? 'Entrada' : `Saída → ${m.sector?.name ?? ''}`} · {formatDateTime(m.date)}</p>
                </div>
                <span className={`text-xs font-bold ${m.type === 'IN' ? 'text-green-600' : 'text-amber-600'}`}>
                  {m.type === 'IN' ? '+' : '-'}{m.quantity}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
