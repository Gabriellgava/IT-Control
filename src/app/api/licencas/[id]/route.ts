import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const body = await request.json()
    const { solicitante, setor, tipoLicenca, codigoLicenca, provedor, status, observacoes } = body

    if (!solicitante || !setor || !tipoLicenca)
      return NextResponse.json({ error: 'Solicitante, setor e tipo de licença são obrigatórios' }, { status: 400 })

    const licenca = await prisma.licencaAssinatura.update({
      where: { id: params.id },
      data: {
        solicitante: solicitante.trim(),
        setor: setor.trim(),
        tipoLicenca: tipoLicenca.trim(),
        codigoLicenca: codigoLicenca?.trim() || null,
        provedor: provedor?.trim() || null,
        status: status?.trim() || 'ATIVA',
        observacoes: observacoes?.trim() || null,
      },
    })

    return NextResponse.json(licenca)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao atualizar licença/assinatura' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    await prisma.licencaAssinatura.delete({ where: { id: params.id } })
    return NextResponse.json({ sucesso: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao remover licença/assinatura' }, { status: 500 })
  }
}
