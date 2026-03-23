import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.perfil !== 'admin')
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  try {
    const mov = await prisma.movimentacao.findUnique({
      where: { id: params.id },
      include: { unidade: true },
    })

    if (!mov) return NextResponse.json({ error: 'Movimentação não encontrada' }, { status: 404 })
    if (mov.cancelado) return NextResponse.json({ error: 'Já cancelada' }, { status: 400 })

    // Estorna: ENTRADA → remove unidade (ou marca DESCARTADA se já tem saída)
    // SAIDA USUARIO → reativa unidade | SAIDA DESCARTE → reativa unidade
    if (mov.tipo === 'ENTRADA') {
      const temSaida = await prisma.movimentacao.count({
        where: { unidadeId: mov.unidadeId, tipo: 'SAIDA', cancelado: false },
      })
      if (temSaida > 0)
        return NextResponse.json({ error: 'Não é possível cancelar: unidade já possui saída registrada' }, { status: 400 })

      await prisma.unidade.delete({ where: { id: mov.unidadeId } })
    }

    if (mov.tipo === 'SAIDA') {
      await prisma.unidade.update({
        where: { id: mov.unidadeId },
        data: { status: 'ATIVA' },
      })
    }

    await prisma.movimentacao.update({
      where: { id: params.id },
      data: {
        cancelado: true,
        canceladoEm: new Date(),
        canceladoPor: session.user.name ?? session.user.email ?? 'Admin',
      },
    })

    return NextResponse.json({ sucesso: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao cancelar' }, { status: 500 })
  }
}
