import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ativo = await prisma.ativo.findUnique({
      where: { id: params.id },
      include: {
        fornecedor: true,
        movimentacoes: {
          include: { fornecedor: true, setor: true, usuario: true },
          orderBy: { data: 'desc' },
        },
      },
    })
    if (!ativo) return NextResponse.json({ error: 'Ativo não encontrado' }, { status: 404 })
    return NextResponse.json(ativo)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar ativo' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const ativo = await prisma.ativo.update({
      where: { id: params.id },
      data: {
        nome: body.nome,
        codigo: body.codigo,
        etiqueta: body.etiqueta || null,
        fornecedorId: body.fornecedorId || null,
        linkCompra: body.linkCompra || null,
        valorUnitario: parseFloat(body.valorUnitario) || 0,
        estoqueMinimo: parseInt(body.estoqueMinimo) || 5,
        dataCompra: body.dataCompra ? new Date(body.dataCompra) : null,
        observacoes: body.observacoes || null,
      },
      include: { fornecedor: true },
    })
    return NextResponse.json(ativo)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao atualizar ativo' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.movimentacao.deleteMany({ where: { ativoId: params.id } })
    await prisma.ativo.delete({ where: { id: params.id } })
    return NextResponse.json({ sucesso: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao deletar ativo' }, { status: 500 })
  }
}
