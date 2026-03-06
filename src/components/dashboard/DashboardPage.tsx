'use client'

import { useEffect, useState } from 'react'
import { Package, AlertTriangle, TrendingUp, DollarSign, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { StatCard, Card } from '@/components/ui'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { DashboardStats } from '@/types'

const CORES = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

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

      {/* Cards de indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total de Produtos"
          value={stats.totalAtivos}
          icon={<Package className="w-5 h-5" />}
          color="blue"
          sub="ativos cadastrados"
        />
        <StatCard
          label="Itens em Estoque"
          value={stats.totalItens}
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
          sub="unidades disponíveis"
        />
        <StatCard
          label="Valor do Estoque"
          value={formatCurrency(stats.valorTotal)}
          icon={<DollarSign className="w-5 h-5" />}
          color="purple"
          sub="valor total"
        />
        <StatCard
          label="Estoque Baixo"
          value={stats.estoqueBaixoCount}
          icon={<AlertTriangle className="w-5 h-5" />}
          color={stats.estoqueBaixoCount > 0 ? 'red' : 'green'}
          sub={stats.estoqueBaixoCount > 0 ? 'requerem reposição' : 'tudo ok'}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Movimentações — Últimos 7 dias</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.graficoMovimentacoes} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="data" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="entradas" name="Entradas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="saidas" name="Saídas" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Distribuição por Fornecedor</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={stats.distribuicaoFornecedor}
                dataKey="quantidade"
                nameKey="nome"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={40}
              >
                {stats.distribuicaoFornecedor.map((_, i) => (
                  <Cell key={i} fill={CORES[i % CORES.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Linha inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Top Produtos — Maior Saída</h3>
          {stats.topAtivos.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma saída registrada</p>
          ) : (
            <div className="space-y-3">
              {stats.topAtivos.map((a, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white font-medium truncate">{a.nome}</p>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full mt-1">
                      <div
                        className="h-1.5 bg-brand-500 rounded-full"
                        style={{ width: `${Math.min(100, (a.totalSaida / (stats.topAtivos[0]?.totalSaida || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300 flex-shrink-0">{a.totalSaida}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Últimas Movimentações</h3>
          <div className="space-y-2">
            {stats.ultimasMovimentacoes.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma movimentação registrada</p>
            ) : stats.ultimasMovimentacoes.slice(0, 6).map(m => (
              <div key={m.id} className="flex items-center gap-3 py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
                <div className={`p-1.5 rounded-lg flex-shrink-0 ${m.tipo === 'ENTRADA' ? 'bg-green-50 dark:bg-green-900/20 text-green-500' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-500'}`}>
                  {m.tipo === 'ENTRADA' ? <ArrowDownCircle className="w-3.5 h-3.5" /> : <ArrowUpCircle className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{m.ativo?.nome}</p>
                  <p className="text-xs text-gray-400">
                    {m.tipo === 'ENTRADA' ? 'Entrada' : `Saída → ${m.setor?.nome ?? ''}`} · {formatDateTime(m.data)}
                  </p>
                </div>
                <span className={`text-xs font-bold ${m.tipo === 'ENTRADA' ? 'text-green-600' : 'text-amber-600'}`}>
                  {m.tipo === 'ENTRADA' ? '+' : '-'}{m.quantidade}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
