import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.perfil !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  const body = await request.json()
  try {
    const setor = await prisma.setor.update({ where: { id: params.id }, data: { nome: body.nome } })
    return NextResponse.json(setor)
  } catch {
    return NextResponse.json({ error: 'Nome já existe' }, { status: 400 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.perfil !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  try {
    await prisma.setor.delete({ where: { id: params.id } })
    return NextResponse.json({ sucesso: true })
  } catch {
    return NextResponse.json({ error: 'Setor possui movimentações vinculadas' }, { status: 400 })
  }
}
