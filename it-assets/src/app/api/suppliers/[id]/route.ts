import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const supplier = await prisma.supplier.update({
      where: { id: params.id },
      data: {
        name: body.name,
        contact: body.contact || null,
        email: body.email || null,
        phone: body.phone || null,
        website: body.website || null,
      },
    })
    return NextResponse.json(supplier)
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar fornecedor' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.supplier.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao deletar fornecedor' }, { status: 500 })
  }
}
