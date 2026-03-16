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
    if (!body.nome) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })

    const categoria = await prisma.categoria.update({
      where: { id: params.id },
      data: {
        nome: body.nome.trim(),
        estoqueMinimo: parseInt(body.estoqueMinimo) || 0,
      },
    })
    return NextResponse.json(categoria)
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002')
      return NextResponse.json({ error: 'Categoria já existe' }, { status: 400 })
    return NextResponse.json({ error: 'Erro ao atualizar categoria' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.perfil !== 'admin')
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  try {
    // Verifica se há ativos vinculados
    const count = await prisma.ativo.count({ where: { categoriaId: params.id, deletado: false } })
    if (count > 0)
      return NextResponse.json({ error: `Categoria possui ${count} ativo(s) vinculado(s). Remova-os primeiro.` }, { status: 400 })

    await prisma.categoria.delete({ where: { id: params.id } })
    return NextResponse.json({ sucesso: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao deletar categoria' }, { status: 500 })
  }
}
