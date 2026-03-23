'use client'
import { useEffect, useState } from 'react'
import { Package, AlertTriangle, TrendingUp, DollarSign, ArrowDownCircle, ArrowUpCircle, Trash2 } from 'lucide-react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { StatCard, Card } from '@/components/ui'
import { formatMoeda, formatDataHora } from '@/lib/utils'
import type { DashboardStats } from '@/types'

const CORES = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard', { cache: 'no-store' }).then(r => r.json()).then(d => { setStats(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
  if (!stats) return <p className="text-gray-500">Erro ao carregar dados.</p>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Visão geral do estoque e ativos de TI</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total de Produtos" value={stats.totalProdutos} icon={<Package className="w-5 h-5" />} color="blue" sub="modelos cadastrados" />
        <StatCard label="Unidades em Estoque" value={stats.totalUnidades} icon={<TrendingUp className="w-5 h-5" />} color="green" sub="itens ativos" />
        <StatCard label="Valor do Estoque" value={formatMoeda(stats.valorTotal)} icon={<DollarSign className="w-5 h-5" />} color="purple" sub="valor total" />
        <StatCard label="Estoque Baixo" value={stats.estoqueBaixoCount} icon={<AlertTriangle className="w-5 h-5" />} color={stats.estoqueBaixoCount > 0 ? 'red' : 'green'} sub={stats.estoqueBaixoCount > 0 ? 'categorias abaixo do mínimo' : 'tudo ok'} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-1 xl:grid-cols-1 gap-4">
        <StatCard label="Descartes no Mês" value={stats.descartesDoMes.count} icon={<Trash2 className="w-5 h-5" />} color="amber" sub="itens descartados" />
      </div>

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
              <Bar dataKey="descartes" name="Descartes" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Por Categoria</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={stats.distribuicaoCategoria} dataKey="quantidade" nameKey="nome" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                {stats.distribuicaoCategoria.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
              </Pie>
              <Tooltip />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Top Produtos — Maior Saída</h3>
          {stats.topProdutos.length === 0 ? <p className="text-sm text-gray-400">Nenhuma saída registrada</p> : (
            <div className="space-y-3">
              {stats.topProdutos.map((a, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{a.nome}</p>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full mt-1">
                      <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (a.totalSaida / (stats.topProdutos[0]?.totalSaida || 1)) * 100)}%` }} />
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
            {stats.ultimasMovimentacoes.length === 0 ? <p className="text-sm text-gray-400">Nenhuma movimentação</p> :
              stats.ultimasMovimentacoes.slice(0, 6).map(m => (
                <div key={m.id} className="flex items-center gap-3 py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <div className={`p-1.5 rounded-lg flex-shrink-0 ${
                    m.tipo === 'ENTRADA' ? 'bg-green-50 dark:bg-green-900/20 text-green-500'
                    : m.subtipo === 'DESCARTE' ? 'bg-red-50 dark:bg-red-900/20 text-red-500'
                    : 'bg-amber-50 dark:bg-amber-900/20 text-amber-500'
                  }`}>
                    {m.tipo === 'ENTRADA' ? <ArrowDownCircle className="w-3.5 h-3.5" />
                      : m.subtipo === 'DESCARTE' ? <Trash2 className="w-3.5 h-3.5" />
                      : <ArrowUpCircle className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{m.unidade?.produto?.nome ?? '—'}</p>
                    <p className="text-xs text-gray-400">
                      {m.tipo === 'ENTRADA' ? `Entrada · ${m.unidade?.etiqueta}`
                        : m.subtipo === 'DESCARTE' ? `Descarte · ${m.unidade?.etiqueta}`
                        : `Saída → ${m.setor?.nome ?? ''}`} · {formatDataHora(m.data)}
                    </p>
                  </div>
                  <span className={`text-xs font-bold ${m.tipo === 'ENTRADA' ? 'text-green-600' : m.subtipo === 'DESCARTE' ? 'text-red-600' : 'text-amber-600'}`}>
                    {m.tipo === 'ENTRADA' ? '+1' : '-1'}
                  </span>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
