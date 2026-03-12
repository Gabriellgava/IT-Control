import { NextResponse } from 'next/server'

export const dynamic = "force-dynamic"
export const revalidate = 0
import { prisma } from '@/lib/prisma'
import { subDays, format } from 'date-fns'

export async function GET() {
  try {
    const ativos = await prisma.ativo.findMany({
      where: { deletado: false },
      include: { fornecedor: true },
    })

    const totalAtivos = ativos.length
    const totalItens = ativos.reduce((s, a) => s + a.quantidade, 0)
    const valorTotal = ativos.reduce((s, a) => s + a.quantidade * a.valorUnitario, 0)
    const estoqueBaixoCount = ativos.filter(a => a.quantidade <= a.estoqueMinimo).length

    const ultimasMovimentacoes = await prisma.movimentacao.findMany({
      take: 10,
      where: { cancelado: false },
      orderBy: { criadoEm: 'desc' },
      include: { ativo: true, fornecedor: true, setor: true, usuario: true },
    })

    const topAtivosRaw = await prisma.movimentacao.groupBy({
      by: ['ativoId'],
      where: { tipo: 'SAIDA', cancelado: false },
      _sum: { quantidade: true },
      orderBy: { _sum: { quantidade: 'desc' } },
      take: 5,
    })

    const topAtivos = (await Promise.all(
      topAtivosRaw.map(async (r) => {
        const ativo = await prisma.ativo.findUnique({ where: { id: r.ativoId } })
        if (!ativo || ativo.deletado) return null
        return { nome: ativo.nome, totalSaida: r._sum.quantidade ?? 0 }
      })
    )).filter(Boolean) as { nome: string; totalSaida: number }[]

    const dist = ativos.reduce((acc, a) => {
      const key = a.fornecedor?.nome ?? 'Sem Fornecedor'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    const distribuicaoFornecedor = Object.entries(dist).map(([nome, quantidade]) => ({ nome, quantidade }))

    const graficoMovimentacoes = []
    for (let i = 6; i >= 0; i--) {
      const dia = subDays(new Date(), i)
      const inicio = new Date(dia); inicio.setHours(0, 0, 0, 0)
      const fim = new Date(dia); fim.setHours(23, 59, 59, 999)
      const entradas = await prisma.movimentacao.aggregate({
        where: { tipo: 'ENTRADA', cancelado: false, data: { gte: inicio, lte: fim } },
        _sum: { quantidade: true },
      })
      const saidas = await prisma.movimentacao.aggregate({
        where: { tipo: 'SAIDA', cancelado: false, data: { gte: inicio, lte: fim } },
        _sum: { quantidade: true },
      })
      graficoMovimentacoes.push({
        data: format(inicio, 'dd/MM'),
        entradas: entradas._sum.quantidade ?? 0,
        saidas: saidas._sum.quantidade ?? 0,
      })
        }

    return NextResponse.json({ totalAtivos, totalItens, valorTotal, estoqueBaixoCount, ultimasMovimentacoes, topAtivos, distribuicaoFornecedor, graficoMovimentacoes })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
  }
}
