import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const assinaturas = await prisma.assinatura.findMany({
      orderBy: { criadoEm: 'desc' },
    })
    return NextResponse.json(assinaturas)
  } catch (error) {
    console.error('Erro ao buscar assinaturas:', error)
    return NextResponse.json({ error: 'Erro ao buscar assinaturas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.plataforma?.trim() || !body.setor?.trim() || !body.periodo?.trim() || !body.email?.trim()) {
      return NextResponse.json({ error: 'Plataforma, setor, período e e-mail são obrigatórios' }, { status: 400 })
    }

    const assinatura = await prisma.assinatura.create({
      data: {
        plataforma: body.plataforma.trim(),
        setor: body.setor.trim(),
        periodo: body.periodo.trim(),
        email: body.email.trim(),
      },
    })

    return NextResponse.json(assinatura, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar assinatura:', error)
    return NextResponse.json({ error: 'Erro ao criar assinatura' }, { status: 500 })
  }
}
