import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { subDays, format } from 'date-fns'

export async function GET() {
  try {
    const ativos = await prisma.ativo.findMany({
      include: { fornecedor: true },
    })

    const totalAtivos = ativos.length
    const totalItens = ativos.reduce((sum, a) => sum + a.quantidade, 0)
    const valorTotal = ativos.reduce((sum, a) => sum + a.quantidade * a.valorUnitario, 0)
    const estoqueBaixoCount = ativos.filter(a => a.quantidade <= a.estoqueMinimo).length

    // Últimas movimentações
    const ultimasMovimentacoes = await prisma.movimentacao.findMany({
      take: 10,
      orderBy: { criadoEm: 'desc' },
      include: { ativo: true, fornecedor: true, setor: true, usuario: true },
    })

    // Top ativos por saída
    const topAtivosRaw = await prisma.movimentacao.groupBy({
      by: ['ativoId'],
      where: { tipo: 'SAIDA' },
      _sum: { quantidade: true },
      orderBy: { _sum: { quantidade: 'desc' } },
      take: 5,
    })

    const topAtivos = await Promise.all(
      topAtivosRaw.map(async (r) => {
        const ativo = await prisma.ativo.findUnique({ where: { id: r.ativoId } })
        return { nome: ativo?.nome ?? 'Desconhecido', totalSaida: r._sum.quantidade ?? 0 }
      })
    )

    // Distribuição por fornecedor
    const distFornecedor = ativos.reduce((acc, a) => {
      const key = a.fornecedor?.nome ?? 'Sem Fornecedor'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    const distribuicaoFornecedor = Object.entries(distFornecedor).map(([nome, quantidade]) => ({ nome, quantidade }))

    // Gráfico de movimentações (últimos 7 dias)
    const graficoMovimentacoes = []
    for (let i = 6; i >= 0; i--) {
      const dia = subDays(new Date(), i)
      const inicioDia = new Date(dia.setHours(0, 0, 0, 0))
      const fimDia = new Date(dia.setHours(23, 59, 59, 999))

      const entradas = await prisma.movimentacao.aggregate({
        where: { tipo: 'ENTRADA', data: { gte: inicioDia, lte: fimDia } },
        _sum: { quantidade: true },
      })
      const saidas = await prisma.movimentacao.aggregate({
        where: { tipo: 'SAIDA', data: { gte: inicioDia, lte: fimDia } },
        _sum: { quantidade: true },
      })

      graficoMovimentacoes.push({
        data: format(inicioDia, 'dd/MM'),
        entradas: entradas._sum.quantidade ?? 0,
        saidas: saidas._sum.quantidade ?? 0,
      })
    }

    return NextResponse.json({
      totalAtivos,
      totalItens,
      valorTotal,
      estoqueBaixoCount,
      ultimasMovimentacoes,
      topAtivos,
      distribuicaoFornecedor,
      graficoMovimentacoes,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar dados do dashboard' }, { status: 500 })
  }
}
