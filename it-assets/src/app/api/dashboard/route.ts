import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { subDays, format } from 'date-fns'

export async function GET() {
  try {
    const assets = await prisma.asset.findMany({
      include: { supplier: true },
    })

    const totalAssets = assets.length
    const totalItems = assets.reduce((sum, a) => sum + a.quantity, 0)
    const totalValue = assets.reduce((sum, a) => sum + a.quantity * a.unitValue, 0)
    const lowStockCount = assets.filter(a => a.quantity <= a.minStock).length

    // Recent movements
    const recentMovements = await prisma.movement.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { asset: true, supplier: true, sector: true, user: true },
    })

    // Top assets by outgoing
    const topAssetsRaw = await prisma.movement.groupBy({
      by: ['assetId'],
      where: { type: 'OUT' },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    })

    const topAssets = await Promise.all(
      topAssetsRaw.map(async (r) => {
        const asset = await prisma.asset.findUnique({ where: { id: r.assetId } })
        return { name: asset?.name ?? 'Desconhecido', outCount: r._sum.quantity ?? 0 }
      })
    )

    // Supplier distribution
    const supplierDist = assets.reduce((acc, a) => {
      const key = a.supplier?.name ?? 'Sem Fornecedor'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    const supplierDistribution = Object.entries(supplierDist).map(([name, count]) => ({ name, count }))

    // Movement chart (last 7 days)
    const movementChart = []
    for (let i = 6; i >= 0; i--) {
      const day = subDays(new Date(), i)
      const dayStart = new Date(day.setHours(0, 0, 0, 0))
      const dayEnd = new Date(day.setHours(23, 59, 59, 999))

      const inCount = await prisma.movement.aggregate({
        where: { type: 'IN', date: { gte: dayStart, lte: dayEnd } },
        _sum: { quantity: true },
      })
      const outCount = await prisma.movement.aggregate({
        where: { type: 'OUT', date: { gte: dayStart, lte: dayEnd } },
        _sum: { quantity: true },
      })

      movementChart.push({
        date: format(dayStart, 'dd/MM'),
        in: inCount._sum.quantity ?? 0,
        out: outCount._sum.quantity ?? 0,
      })
    }

    return NextResponse.json({
      totalAssets,
      totalItems,
      totalValue,
      lowStockCount,
      recentMovements,
      topAssets,
      supplierDistribution,
      movementChart,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar dados do dashboard' }, { status: 500 })
  }
}
