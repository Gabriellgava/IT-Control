import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  enforceRateLimit,
  enforceSameOriginForMutations,
  requireAuthenticatedUser,
  sanitizeMoney,
  sanitizeNullableText,
  sanitizeOptionalUrl,
} from '@/lib/api-security'

export async function GET(request: NextRequest) {
  const rateLimit = enforceRateLimit(request)
  if (rateLimit) return rateLimit

  const { response } = await requireAuthenticatedUser()
  if (response) return response

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

    const etiquetas = produtos.flatMap((produto) =>
      produto.unidades.map((unidade) => unidade.etiqueta)
    )

    const itensInventario = etiquetas.length > 0
      ? await prisma.inventario.findMany({
        where: {
          etiqueta: { in: etiquetas },
        },
        select: {
          etiqueta: true,
          responsavel: true,
          setor: true,
        },
      })
      : []

    const inventarioPorEtiqueta = new Map(
      itensInventario.map((item) => [item.etiqueta.trim().toUpperCase(), item])
    )

    const produtosComLocalizacao = produtos.map((produto) => ({
      ...produto,
      unidades: produto.unidades.map((unidade) => {
        const ultimaMovimentacao = unidade.movimentacoes[0]
        const emPosseDeColaborador =
          ultimaMovimentacao?.tipo === 'SAIDA' && ultimaMovimentacao?.subtipo === 'USUARIO'
        const inventarioAtual = inventarioPorEtiqueta.get(unidade.etiqueta.trim().toUpperCase())
        const estaNoInventario = Boolean(inventarioAtual?.responsavel?.trim())

        return {
          ...unidade,
          localAtual: estaNoInventario
            ? inventarioAtual?.responsavel?.trim() || 'Responsável não informado'
            : emPosseDeColaborador
              ? ultimaMovimentacao.responsavel?.trim() || 'Responsável não informado'
              : 'Estoque',
          setorAtual: estaNoInventario
            ? inventarioAtual?.setor?.trim() || null
            : null,
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
  const rateLimit = enforceRateLimit(request)
  if (rateLimit) return rateLimit
  const sameOrigin = enforceSameOriginForMutations(request)
  if (sameOrigin) return sameOrigin

  const { response } = await requireAuthenticatedUser()
  if (response) return response

  try {
    const body = await request.json()
    const nome = sanitizeNullableText(body.nome)
    const codigo = sanitizeNullableText(body.codigo)

    if (!nome || !codigo)
      return NextResponse.json({ error: 'Nome e código são obrigatórios' }, { status: 400 })

    const produto = await prisma.produto.create({
      data: {
        nome,
        codigo,
        categoriaId: sanitizeNullableText(body.categoriaId),
        fornecedorId: sanitizeNullableText(body.fornecedorId),
        valorUnitario: sanitizeMoney(body.valorUnitario),
        linkCompra: sanitizeOptionalUrl(body.linkCompra),
        observacoes: sanitizeNullableText(body.observacoes),
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
