import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json(suppliers)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar fornecedores' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supplier = await prisma.supplier.create({
      data: {
        name: body.name,
        contact: body.contact || null,
        email: body.email || null,
        phone: body.phone || null,
        website: body.website || null,
      },
    })
    return NextResponse.json(supplier, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar fornecedor' }, { status: 500 })
  }
}
