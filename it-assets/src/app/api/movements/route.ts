import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || ''
    const assetId = searchParams.get('assetId') || ''
    const limit = parseInt(searchParams.get('limit') || '50')

    const movements = await prisma.movement.findMany({
      where: {
        AND: [
          type ? { type } : {},
          assetId ? { assetId } : {},
        ],
      },
      include: {
        asset: true,
        supplier: true,
        sector: true,
        user: true,
      },
      orderBy: { date: 'desc' },
      take: limit,
    })

    return NextResponse.json(movements)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar movimentações' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, assetId, quantity, unitValue, date, supplierId, sectorId, userId, responsible, notes } = body

    const asset = await prisma.asset.findUnique({ where: { id: assetId } })
    if (!asset) return NextResponse.json({ error: 'Ativo não encontrado' }, { status: 404 })

    const qty = parseInt(quantity)
    if (type === 'OUT' && asset.quantity < qty) {
      return NextResponse.json({ error: 'Quantidade insuficiente em estoque' }, { status: 400 })
    }

    // Update stock
    const newQty = type === 'IN' ? asset.quantity + qty : asset.quantity - qty
    await prisma.asset.update({
      where: { id: assetId },
      data: {
        quantity: newQty,
        unitValue: type === 'IN' ? parseFloat(unitValue) || asset.unitValue : asset.unitValue,
      },
    })

    const movement = await prisma.movement.create({
      data: {
        type,
        assetId,
        quantity: qty,
        unitValue: parseFloat(unitValue) || asset.unitValue,
        date: date ? new Date(date) : new Date(),
        supplierId: supplierId || null,
        sectorId: sectorId || null,
        userId: userId || null,
        responsible: responsible || null,
        notes: notes || null,
      },
      include: { asset: true, supplier: true, sector: true, user: true },
    })

    return NextResponse.json(movement, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao registrar movimentação' }, { status: 500 })
  }
}
