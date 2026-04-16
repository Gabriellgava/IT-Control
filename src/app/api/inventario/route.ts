import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const busca = searchParams.get('search') || ''
    const setor = searchParams.get('setor') || ''
    const tipo = searchParams.get('tipo') || ''
    const responsavel = searchParams.get('responsavel') || ''

    const itens = await prisma.inventario.findMany({
      where: {
        AND: [
          busca ? {
            OR: [
              { responsavel: { contains: busca, mode: 'insensitive' } },
              { etiqueta: { contains: busca, mode: 'insensitive' } },
              { modelo: { contains: busca, mode: 'insensitive' } },
              { marca: { contains: busca, mode: 'insensitive' } },
            ]
          } : {},
          setor ? { setor: { contains: setor, mode: 'insensitive' } } : {},
          tipo ? { tipo: { contains: tipo, mode: 'insensitive' } } : {},
          responsavel ? { responsavel: { contains: responsavel, mode: 'insensitive' } } : {},
        ],
      },
      orderBy: [{ setor: 'asc' }, { responsavel: 'asc' }],
    })

    return NextResponse.json(itens)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar inventário' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const body = await request.json()
    const { setor, responsavel, tipo, marca, modelo, etiqueta, numero, observacoes } = body

    if (!setor || !responsavel || !tipo || !marca || !modelo || !etiqueta)
      return NextResponse.json({ error: 'Todos os campos obrigatórios devem ser preenchidos' }, { status: 400 })

    const item = await prisma.inventario.create({
      data: {
        setor: setor.trim(),
        responsavel: responsavel.trim(),
        tipo: tipo.trim(),
        marca: marca.trim(),
        modelo: modelo.trim(),
        etiqueta: etiqueta.trim(),
        numero: numero?.trim() || null,
        observacoes: observacoes?.trim() || null,
      },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002')
      return NextResponse.json({ error: 'Etiqueta já cadastrada no inventário' }, { status: 400 })
    return NextResponse.json({ error: 'Erro ao cadastrar item' }, { status: 500 })
  }
}
