import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const body = await request.json()
    const { setor, responsavel, tipo, marca, modelo, etiqueta, observacoes } = body

    if (!setor || !responsavel || !tipo || !marca || !modelo || !etiqueta)
      return NextResponse.json({ error: 'Todos os campos obrigatórios devem ser preenchidos' }, { status: 400 })

    const item = await prisma.inventario.update({
      where: { id: params.id },
      data: {
        setor: setor.trim(),
        responsavel: responsavel.trim(),
        tipo: tipo.trim(),
        marca: marca.trim(),
        modelo: modelo.trim(),
        etiqueta: etiqueta.trim(),
        observacoes: observacoes?.trim() || null,
      },
    })

    return NextResponse.json(item)
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002')
      return NextResponse.json({ error: 'Etiqueta já cadastrada no inventário' }, { status: 400 })
    return NextResponse.json({ error: 'Erro ao atualizar item' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    await prisma.inventario.delete({ where: { id: params.id } })
    return NextResponse.json({ sucesso: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao remover item' }, { status: 500 })
  }
}
