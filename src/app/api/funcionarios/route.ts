import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const funcionarios = await prisma.funcionario.findMany({
      include: { setor: true },
      orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
    })
    return NextResponse.json(funcionarios)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar funcionários' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.nome?.trim()) return NextResponse.json({ error: 'Nome completo é obrigatório' }, { status: 400 })
    if (!body.setorId) return NextResponse.json({ error: 'Setor é obrigatório' }, { status: 400 })

    const funcionario = await prisma.funcionario.create({
      data: {
        nome: body.nome.trim(),
        setorId: body.setorId,
        ativo: body.ativo ?? true,
      },
      include: { setor: true },
    })

    return NextResponse.json(funcionario, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Não foi possível cadastrar o funcionário' }, { status: 400 })
  }
}
