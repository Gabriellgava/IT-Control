import { NextResponse } from 'next/server'
export const dynamic = "force-dynamic"
export const revalidate = 0
import { prisma } from '@/lib/prisma'
import { subDays, format, startOfMonth } from 'date-fns'

export async function GET() {
  try {
    const totalProdutos = await prisma.produto.count()
    const totalUnidades = await prisma.unidade.count({ where: { status: 'ATIVA' } })

    // Valor total = soma das unidades ativas × valor do produto
    const unidadesAtivas = await prisma.unidade.findMany({
      where: { status: 'ATIVA' },
      include: { produto: true },
    })
    const valorTotal = unidadesAtivas.reduce((s, u) => s + u.produto.valorUnitario, 0)

    // Estoque baixo por categoria
    const categorias = await prisma.categoria.findMany({
      include: { produtos: { include: { _count: { select: { unidades: { where: { status: 'ATIVA' } } } } } } },
    })
    const estoqueBaixoCount = categorias.filter(c => {
      const total = c.produtos.reduce((s, p) => s + p._count.unidades, 0)
      return c.estoqueMinimo > 0 && total <= c.estoqueMinimo
    }).length

    // Descartes do mês
    const inicioMes = startOfMonth(new Date())
    const descartesDoMes = await prisma.movimentacao.count({
      where: { tipo: 'SAIDA', subtipo: 'DESCARTE', cancelado: false, data: { gte: inicioMes } },
    })

    // Últimas movimentações
    const ultimasMovimentacoes = await prisma.movimentacao.findMany({
      take: 10,
      where: { cancelado: false },
      orderBy: { criadoEm: 'desc' },
      include: {
        unidade: { include: { produto: { include: { categoria: true } } } },
        fornecedor: true, setor: true, usuario: true,
      },
    })

    // Top produtos com mais saídas
    const topRaw = await prisma.movimentacao.groupBy({
      by: ['unidadeId'],
      where: { tipo: 'SAIDA', subtipo: 'USUARIO', cancelado: false },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    })
    const topMap: Record<string, number> = {}
    for (const r of topRaw) {
      const u = await prisma.unidade.findUnique({ where: { id: r.unidadeId }, include: { produto: true } })
      if (!u) continue
      topMap[u.produto.nome] = (topMap[u.produto.nome] || 0) + r._count.id
    }
    const topProdutos = Object.entries(topMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nome, totalSaida]) => ({ nome, totalSaida }))

    // Distribuição por categoria
    const produtos = await prisma.produto.findMany({
      include: { categoria: true, _count: { select: { unidades: { where: { status: 'ATIVA' } } } } },
    })
    const distCategoria: Record<string, number> = {}
    for (const p of produtos) {
      const key = p.categoria?.nome ?? 'Sem Categoria'
      distCategoria[key] = (distCategoria[key] || 0) + p._count.unidades
    }
    const distribuicaoCategoria = Object.entries(distCategoria).map(([nome, quantidade]) => ({ nome, quantidade }))

    // Gráfico 7 dias
    const graficoMovimentacoes = []
    for (let i = 6; i >= 0; i--) {
      const dia = subDays(new Date(), i)
      const inicio = new Date(dia); inicio.setHours(0, 0, 0, 0)
      const fim = new Date(dia); fim.setHours(23, 59, 59, 999)
      const [entradas, saidas, descartes] = await Promise.all([
        prisma.movimentacao.count({ where: { tipo: 'ENTRADA', cancelado: false, data: { gte: inicio, lte: fim } } }),
        prisma.movimentacao.count({ where: { tipo: 'SAIDA', subtipo: 'USUARIO', cancelado: false, data: { gte: inicio, lte: fim } } }),
        prisma.movimentacao.count({ where: { tipo: 'SAIDA', subtipo: 'DESCARTE', cancelado: false, data: { gte: inicio, lte: fim } } }),
      ])
      graficoMovimentacoes.push({ data: format(inicio, 'dd/MM'), entradas, saidas, descartes })
    }

    return NextResponse.json({
      totalProdutos, totalUnidades, valorTotal, estoqueBaixoCount,
      descartesDoMes: { count: descartesDoMes },
      ultimasMovimentacoes, topProdutos, distribuicaoCategoria, graficoMovimentacoes,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
  }
}
