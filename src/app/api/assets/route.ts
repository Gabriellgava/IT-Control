import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const busca = searchParams.get('search') || ''
    const fornecedorId = searchParams.get('fornecedorId') || ''
    const estoqueBaixo = searchParams.get('estoqueBaixo') === 'true'

    const ativos = await prisma.ativo.findMany({
      where: {
        AND: [
          busca ? {
            OR: [
              { nome: { contains: busca } },
              { codigo: { contains: busca } },
              { etiqueta: { contains: busca } },
            ],
          } : {},
          fornecedorId ? { fornecedorId } : {},
        ],
      },
      include: { fornecedor: true },
      orderBy: { criadoEm: 'desc' },
    })

    const filtrados = estoqueBaixo ? ativos.filter(a => a.quantidade <= a.estoqueMinimo) : ativos
    return NextResponse.json(filtrados)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar ativos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const ativo = await prisma.ativo.create({
      data: {
        nome: body.nome,
        codigo: body.codigo,
        etiqueta: body.etiqueta || null,
        fornecedorId: body.fornecedorId || null,
        linkCompra: body.linkCompra || null,
        valorUnitario: parseFloat(body.valorUnitario) || 0,
        quantidade: parseInt(body.quantidade) || 0,
        estoqueMinimo: parseInt(body.estoqueMinimo) || 5,
        dataCompra: body.dataCompra ? new Date(body.dataCompra) : null,
        observacoes: body.observacoes || null,
      },
      include: { fornecedor: true },
    })

    // Registrar movimentação de entrada inicial
    if (ativo.quantidade > 0) {
      await prisma.movimentacao.create({
        data: {
          tipo: 'ENTRADA',
          ativoId: ativo.id,
          quantidade: ativo.quantidade,
          valorUnitario: ativo.valorUnitario,
          data: ativo.dataCompra || new Date(),
          fornecedorId: ativo.fornecedorId,
          responsavel: 'Sistema',
          observacoes: 'Cadastro inicial do produto',
        },
      })
    }

    return NextResponse.json(ativo, { status: 201 })
  } catch (error: unknown) {
    console.error(error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Código ou etiqueta já existe' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao criar ativo' }, { status: 500 })
  }
}
