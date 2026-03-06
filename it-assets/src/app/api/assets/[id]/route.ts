import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const asset = await prisma.asset.findUnique({
      where: { id: params.id },
      include: {
        supplier: true,
        movements: {
          include: { supplier: true, sector: true, user: true },
          orderBy: { date: 'desc' },
        },
      },
    })
    if (!asset) return NextResponse.json({ error: 'Ativo não encontrado' }, { status: 404 })
    return NextResponse.json(asset)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar ativo' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const asset = await prisma.asset.update({
      where: { id: params.id },
      data: {
        name: body.name,
        code: body.code,
        tag: body.tag || null,
        supplierId: body.supplierId || null,
        purchaseLink: body.purchaseLink || null,
        unitValue: parseFloat(body.unitValue) || 0,
        minStock: parseInt(body.minStock) || 5,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
        notes: body.notes || null,
      },
      include: { supplier: true },
    })
    return NextResponse.json(asset)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao atualizar ativo' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.movement.deleteMany({ where: { assetId: params.id } })
    await prisma.asset.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao deletar ativo' }, { status: 500 })
  }
}
