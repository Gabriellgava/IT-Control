import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const movimentacoes = await prisma.movimentacao.findMany({
      where: { cancelado: false, responsavel: { not: null } },
      select: { responsavel: true },
      distinct: ['responsavel'],
      orderBy: { responsavel: 'asc' },
    })

    return NextResponse.json({
      responsaveis: movimentacoes
        .map((movimentacao) => movimentacao.responsavel?.trim())
        .filter((responsavel): responsavel is string => Boolean(responsavel)),
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar filtros de movimentacoes' }, { status: 500 })
  }
}
