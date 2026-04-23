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
            { unidades: { some: { etiqueta: { contains: busca, mode: 'insensitive' } } } },
          ]} : {},
          categoriaId ? { categoriaId } : {},
          fornecedorId ? { fornecedorId } : {},
        ],
      },
      include: {
        categoria: true,
        fornecedor: true,
        unidades: {
          orderBy: { criadoEm: 'desc' },
          select: {
            id: true,
            etiqueta: true,
            dataCompra: true,
            status: true,
            criadoEm: true,
            produtoId: true,
            movimentacoes: {
              where: { cancelado: false },
              orderBy: { data: 'desc' },
              take: 1,
              select: {
                tipo: true,
                subtipo: true,
                responsavel: true,
              },
            },
          },
        },
        _count: { select: { unidades: { where: { status: 'ATIVA' } } } },
      },
      orderBy: { nome: 'asc' },
    })

    const produtosComLocalizacao = produtos.map((produto) => ({
      ...produto,
      unidades: produto.unidades.map((unidade) => {
        const ultimaMovimentacao = unidade.movimentacoes[0]
        const emPosseDeColaborador =
          ultimaMovimentacao?.tipo === 'SAIDA' && ultimaMovimentacao?.subtipo === 'USUARIO'

        return {
          ...unidade,
          localAtual: emPosseDeColaborador
            ? ultimaMovimentacao.responsavel?.trim() || 'Responsável não informado'
            : 'Estoque',
        }
      }),
    }))

    return NextResponse.json(produtosComLocalizacao)
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
