import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const busca = searchParams.get('search') || ''
    const setor = searchParams.get('setor') || ''

    const licencas = await prisma.licencaAssinatura.findMany({
      where: {
        AND: [
          busca
            ? {
                OR: [
                  { solicitante: { contains: busca, mode: 'insensitive' } },
                  { tipoLicenca: { contains: busca, mode: 'insensitive' } },
                  { codigoLicenca: { contains: busca, mode: 'insensitive' } },
                ],
              }
            : {},
          setor ? { setor: { contains: setor, mode: 'insensitive' } } : {},
        ],
      },
      orderBy: [{ solicitante: 'asc' }, { criadoEm: 'desc' }],
    })

    return NextResponse.json(licencas)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar licenças e assinaturas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const body = await request.json()
    const { solicitante, setor, tipoLicenca, codigoLicenca, provedor, status, observacoes } = body

    if (!solicitante || !setor || !tipoLicenca)
      return NextResponse.json({ error: 'Solicitante, setor e tipo de licença são obrigatórios' }, { status: 400 })

    const licenca = await prisma.licencaAssinatura.create({
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

    return NextResponse.json(licenca, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao cadastrar licença/assinatura' }, { status: 500 })
  }
}
