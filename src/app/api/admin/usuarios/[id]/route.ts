import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.perfil !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  const body = await request.json()
  const usuario = await prisma.usuario.update({ where: { id: params.id }, data: body })
  return NextResponse.json(usuario)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.perfil !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  await prisma.usuario.delete({ where: { id: params.id } })
  return NextResponse.json({ sucesso: true })
}
