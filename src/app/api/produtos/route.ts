import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const busca = searchParams.get('search') || ''
    const categoriaId = searchParams.get('categoriaId') || ''
    const fornecedorId = searchParams.get('fornecedorId') || ''

    const produtos = await prisma.produto.findMany({
      where: {
        AND: [
          busca ? { OR: [
            { nome: { contains: busca, mode: 'insensitive' } },
            { codigo: { contains: busca, mode: 'insensitive' } },
          ]} : {},
          categoriaId ? { categoriaId } : {},
          fornecedorId ? { fornecedorId } : {},
        ],
      },
      include: {
        categoria: true,
        fornecedor: true,
        _count: { select: { unidades: { where: { status: 'ATIVA' } } } },
      },
      orderBy: { nome: 'asc' },
    })

    return NextResponse.json(produtos)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.nome || !body.codigo)
      return NextResponse.json({ error: 'Nome e código são obrigatórios' }, { status: 400 })

    const produto = await prisma.produto.create({
      data: {
        nome: body.nome.trim(),
        codigo: body.codigo.trim(),
        categoriaId: body.categoriaId || null,
        fornecedorId: body.fornecedorId || null,
        valorUnitario: parseFloat(body.valorUnitario) || 0,
        linkCompra: body.linkCompra || null,
        observacoes: body.observacoes || null,
      },
      include: { categoria: true, fornecedor: true },
    })

    return NextResponse.json(produto, { status: 201 })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002')
      return NextResponse.json({ error: 'Código já existe' }, { status: 400 })
    return NextResponse.json({ error: 'Erro ao criar produto' }, { status: 500 })
  }
}
