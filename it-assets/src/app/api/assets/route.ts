import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const supplierId = searchParams.get('supplierId') || ''
    const lowStock = searchParams.get('lowStock') === 'true'

    const assets = await prisma.asset.findMany({
      where: {
        AND: [
          search ? {
            OR: [
              { name: { contains: search } },
              { code: { contains: search } },
              { tag: { contains: search } },
            ],
          } : {},
          supplierId ? { supplierId } : {},
        ],
      },
      include: { supplier: true },
      orderBy: { createdAt: 'desc' },
    })

    const filtered = lowStock ? assets.filter(a => a.quantity <= a.minStock) : assets

    return NextResponse.json(filtered)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar ativos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const asset = await prisma.asset.create({
      data: {
        name: body.name,
        code: body.code,
        tag: body.tag || null,
        supplierId: body.supplierId || null,
        purchaseLink: body.purchaseLink || null,
        unitValue: parseFloat(body.unitValue) || 0,
        quantity: parseInt(body.quantity) || 0,
        minStock: parseInt(body.minStock) || 5,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
        notes: body.notes || null,
      },
      include: { supplier: true },
    })

    // Register initial IN movement if quantity > 0
    if (asset.quantity > 0) {
      await prisma.movement.create({
        data: {
          type: 'IN',
          assetId: asset.id,
          quantity: asset.quantity,
          unitValue: asset.unitValue,
          date: asset.purchaseDate || new Date(),
          supplierId: asset.supplierId,
          responsible: 'Sistema',
          notes: 'Cadastro inicial do produto',
        },
      })
    }

    return NextResponse.json(asset, { status: 201 })
  } catch (error: unknown) {
    console.error(error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Código ou etiqueta já existe' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao criar ativo' }, { status: 500 })
  }
}
