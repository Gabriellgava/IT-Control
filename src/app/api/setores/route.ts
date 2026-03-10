import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const setores = await prisma.setor.findMany({ orderBy: { nome: 'asc' } })
    return NextResponse.json(setores)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar setores' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const setor = await prisma.setor.create({ data: { nome: body.nome } })
    return NextResponse.json(setor, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar setor' }, { status: 500 })
  }
}
