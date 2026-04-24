import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.perfil !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  try {
    const body = await request.json()
    if (!body.nome?.trim()) return NextResponse.json({ error: 'Nome completo é obrigatório' }, { status: 400 })
    if (!body.setorId) return NextResponse.json({ error: 'Setor é obrigatório' }, { status: 400 })

    const funcionario = await prisma.funcionario.update({
      where: { id: params.id },
      data: {
        nome: body.nome.trim(),
        setorId: body.setorId,
        ativo: body.ativo ?? true,
      },
      include: { setor: true },
    })

    return NextResponse.json(funcionario)
  } catch {
    return NextResponse.json({ error: 'Não foi possível atualizar o funcionário' }, { status: 400 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.perfil !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  try {
    await prisma.funcionario.delete({ where: { id: params.id } })
    return NextResponse.json({ sucesso: true })
  } catch {
    return NextResponse.json({ error: 'Não foi possível excluir o funcionário' }, { status: 400 })
  }
}
