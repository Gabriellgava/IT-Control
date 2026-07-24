import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.assinatura.delete({
      where: { id: params.id },
    })
    return NextResponse.json({ sucesso: true })
  } catch (error) {
    console.error('Erro ao excluir assinatura:', error)
    return NextResponse.json({ error: 'Erro ao excluir assinatura' }, { status: 500 })
  }
}
