import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.perfil !== 'admin')
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  try {
    const body = await request.json()
    if (!body.razaoSocial) return NextResponse.json({ error: 'Razão social é obrigatória' }, { status: 400 })
    if (!body.cnpj) return NextResponse.json({ error: 'CNPJ é obrigatório' }, { status: 400 })

    const empresa = await prisma.empresa.update({
      where: { id: params.id },
      data: {
        razaoSocial: body.razaoSocial.trim(),
        nomeFantasia: body.nomeFantasia?.trim() || null,
        cnpj: body.cnpj.trim(),
        endereco: body.endereco?.trim() || null,
        telefone: body.telefone?.trim() || null,
        email: body.email?.trim() || null,
        logoUrl: body.logoUrl || null,
      },
    })
    return NextResponse.json(empresa)
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002')
      return NextResponse.json({ error: 'CNPJ já cadastrado' }, { status: 400 })
    return NextResponse.json({ error: 'Erro ao atualizar empresa' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.perfil !== 'admin')
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  try {
    await prisma.empresa.delete({ where: { id: params.id } })
    return NextResponse.json({ sucesso: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao deletar empresa' }, { status: 500 })
  }
}
