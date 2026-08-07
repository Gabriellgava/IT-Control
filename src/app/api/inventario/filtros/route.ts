import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Buscar todos os setores únicos
    const setores = await prisma.inventario.findMany({
      select: { setor: true },
      distinct: ['setor'],
      where: { setor: { not: '' } },
      orderBy: { setor: 'asc' }
    })

    // Buscar todos os tipos únicos
    const tipos = await prisma.inventario.findMany({
      select: { tipo: true },
      distinct: ['tipo'],
      where: { tipo: { not: '' } },
      orderBy: { tipo: 'asc' }
    })

    // Buscar todos os responsáveis únicos
    const responsaveis = await prisma.inventario.findMany({
      select: { responsavel: true },
      distinct: ['responsavel'],
      where: { responsavel: { not: '' } },
      orderBy: { responsavel: 'asc' }
    })

    return NextResponse.json({
      setores: setores.map(s => s.setor).filter(Boolean),
      tipos: tipos.map(t => t.tipo).filter(Boolean),
      responsaveis: responsaveis.map(r => r.responsavel).filter(Boolean),
    })
  } catch (error) {
    console.error('Erro ao buscar filtros:', error)
    return NextResponse.json({ error: 'Erro ao buscar filtros' }, { status: 500 })
  }
}
