import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const categorias = await prisma.categoria.findMany({
      orderBy: { nome: 'asc' },
      include: { _count: { select: { produtos: true } } },
    })
    return NextResponse.json(categorias)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar categorias' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.perfil !== 'admin')
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  try {
    const body = await request.json()
    if (!body.nome) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })

    const categoria = await prisma.categoria.create({
      data: {
        nome: body.nome.trim(),
        estoqueMinimo: parseInt(body.estoqueMinimo) || 0,
      },
    })
    return NextResponse.json(categoria, { status: 201 })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002')
      return NextResponse.json({ error: 'Categoria já existe' }, { status: 400 })
    return NextResponse.json({ error: 'Erro ao criar categoria' }, { status: 500 })
  }
}
