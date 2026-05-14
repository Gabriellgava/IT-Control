import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export const revalidate = 0
import { prisma } from '@/lib/prisma'
import { subDays, format, startOfMonth } from 'date-fns'

export async function GET() {
  try {
    const now = new Date()
    const inicioMes = startOfMonth(now)
    const inicioPeriodo = subDays(now, 6)
    inicioPeriodo.setHours(0, 0, 0, 0)

    const [totalProdutos, totalUnidades, unidadesAtivas, categorias, descartesDoMes, ultimasMovimentacoes, topRaw, produtosDist, movimentos7dias] = await Promise.all([
      prisma.produto.count(),
      prisma.unidade.count({ where: { status: 'ATIVA' } }),
      prisma.unidade.findMany({
        where: { status: 'ATIVA' },
        select: { produto: { select: { valorUnitario: true } } },
      }),
      prisma.categoria.findMany({
        include: { produtos: { include: { _count: { select: { unidades: { where: { status: 'ATIVA' } } } } } } },
      }),
      prisma.movimentacao.count({
        where: { tipo: 'SAIDA', subtipo: 'DESCARTE', cancelado: false, data: { gte: inicioMes } },
      }),
      prisma.movimentacao.findMany({
        take: 10,
        where: { cancelado: false },
        orderBy: { criadoEm: 'desc' },
        include: {
          unidade: { include: { produto: { include: { categoria: true } } } },
          fornecedor: true,
          setor: true,
          usuario: true,
        },
      }),
      prisma.movimentacao.groupBy({
        by: ['unidadeId'],
        where: { tipo: 'SAIDA', subtipo: 'USUARIO', cancelado: false },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 30,
      }),
      prisma.produto.findMany({
        include: { categoria: true, _count: { select: { unidades: { where: { status: 'ATIVA' } } } } },
      }),
      prisma.movimentacao.findMany({
        where: { cancelado: false, data: { gte: inicioPeriodo } },
        select: { tipo: true, subtipo: true, data: true },
      }),
    ])

    const valorTotal = unidadesAtivas.reduce((s, u) => s + u.produto.valorUnitario, 0)

    const estoqueBaixoCount = categorias.filter(c => {
      const total = c.produtos.reduce((s, p) => s + p._count.unidades, 0)
      return c.estoqueMinimo > 0 && total <= c.estoqueMinimo
    }).length

    const unidadeIds = [...new Set(topRaw.map(r => r.unidadeId))]
    const unidadesTop = unidadeIds.length
      ? await prisma.unidade.findMany({
          where: { id: { in: unidadeIds } },
          select: { id: true, produto: { select: { nome: true } } },
        })
      : []
    const nomePorUnidade = new Map(unidadesTop.map(u => [u.id, u.produto.nome]))

    const topMap: Record<string, number> = {}
    for (const r of topRaw) {
      const nome = nomePorUnidade.get(r.unidadeId)
      if (!nome) continue
      topMap[nome] = (topMap[nome] || 0) + r._count.id
    }
    const topProdutos = Object.entries(topMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nome, totalSaida]) => ({ nome, totalSaida }))

    const distCategoria: Record<string, number> = {}
    for (const p of produtosDist) {
      const key = p.categoria?.nome ?? 'Sem Categoria'
      distCategoria[key] = (distCategoria[key] || 0) + p._count.unidades
    }
    const distribuicaoCategoria = Object.entries(distCategoria).map(([nome, quantidade]) => ({ nome, quantidade }))

    const dias = Array.from({ length: 7 }, (_, idx) => {
      const dia = subDays(now, 6 - idx)
      return new Date(dia.getFullYear(), dia.getMonth(), dia.getDate())
    })
    const mapaDias = new Map(dias.map(d => [format(d, 'yyyy-MM-dd'), { data: format(d, 'dd/MM'), entradas: 0, saidas: 0, descartes: 0 }]))

    for (const m of movimentos7dias) {
      const key = format(new Date(m.data), 'yyyy-MM-dd')
      const dia = mapaDias.get(key)
      if (!dia) continue
      if (m.tipo === 'ENTRADA') dia.entradas += 1
      if (m.tipo === 'SAIDA' && m.subtipo === 'USUARIO') dia.saidas += 1
      if (m.tipo === 'SAIDA' && m.subtipo === 'DESCARTE') dia.descartes += 1
    }

    const graficoMovimentacoes = dias.map(d => mapaDias.get(format(d, 'yyyy-MM-dd'))!)

    return NextResponse.json({
      totalProdutos,
      totalUnidades,
      valorTotal,
      estoqueBaixoCount,
      descartesDoMes: { count: descartesDoMes },
      ultimasMovimentacoes,
      topProdutos,
      distribuicaoCategoria,
      graficoMovimentacoes,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
  }
}
