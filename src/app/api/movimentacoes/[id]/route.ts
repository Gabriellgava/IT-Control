import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.perfil !== 'admin') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  try {
    const mov = await prisma.movimentacao.findUnique({ where: { id: params.id } })
    if (!mov) return NextResponse.json({ error: 'Movimentação não encontrada' }, { status: 404 })
    if (mov.cancelado) return NextResponse.json({ error: 'Movimentação já cancelada' }, { status: 400 })

    // Estorna a quantidade no ativo se ainda existir
    const ativo = await prisma.ativo.findUnique({ where: { id: mov.ativoId } })
    if (ativo && !ativo.deletado) {
      const novaQtd = mov.tipo === 'ENTRADA'
        ? ativo.quantidade - mov.quantidade
        : ativo.quantidade + mov.quantidade
      await prisma.ativo.update({
        where: { id: ativo.id },
        data: { quantidade: Math.max(0, novaQtd) },
      })
    }

    // Marca como cancelado
    await prisma.movimentacao.update({
      where: { id: params.id },
      data: {
        cancelado: true,
        canceladoEm: new Date(),
        canceladoPor: session.user.name ?? session.user.email,
      },
    })

    return NextResponse.json({ sucesso: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao cancelar movimentação' }, { status: 500 })
  }
}
