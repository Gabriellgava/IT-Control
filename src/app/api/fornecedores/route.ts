import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const fornecedores = await prisma.fornecedor.findMany({ orderBy: { nome: 'asc' } })
    return NextResponse.json(fornecedores)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar fornecedores' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const fornecedor = await prisma.fornecedor.create({
      data: { nome: body.nome, contato: body.contato || null, email: body.email || null, telefone: body.telefone || null, site: body.site || null },
    })
    return NextResponse.json(fornecedor, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar fornecedor' }, { status: 500 })
  }
}
