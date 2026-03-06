import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const fornecedor = await prisma.fornecedor.update({
      where: { id: params.id },
      data: {
        nome: body.nome,
        contato: body.contato || null,
        email: body.email || null,
        telefone: body.telefone || null,
        site: body.site || null,
      },
    })
    return NextResponse.json(fornecedor)
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar fornecedor' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.fornecedor.delete({ where: { id: params.id } })
    return NextResponse.json({ sucesso: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao deletar fornecedor' }, { status: 500 })
  }
}
