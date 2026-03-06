import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const sectors = await prisma.sector.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json(sectors)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar setores' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const sector = await prisma.sector.create({ data: { name: body.name } })
    return NextResponse.json(sector, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Setor já existe ou erro ao criar' }, { status: 500 })
  }
}
