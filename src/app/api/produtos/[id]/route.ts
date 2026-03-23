import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const produto = await prisma.produto.findUnique({
      where: { id: params.id },
      include: {
        categoria: true,
        fornecedor: true,
        unidades: {
          orderBy: { criadoEm: 'desc' },
          include: { movimentacoes: { include: { setor: true, usuario: true }, orderBy: { data: 'desc' }, take: 1 } },
        },
      },
    })
    if (!produto) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    return NextResponse.json(produto)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar produto' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    if (!body.nome || !body.codigo)
      return NextResponse.json({ error: 'Nome e código são obrigatórios' }, { status: 400 })

    const produto = await prisma.produto.update({
      where: { id: params.id },
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
    return NextResponse.json(produto)
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002')
      return NextResponse.json({ error: 'Código já existe' }, { status: 400 })
    return NextResponse.json({ error: 'Erro ao atualizar produto' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const count = await prisma.unidade.count({ where: { produtoId: params.id, status: 'ATIVA' } })
    if (count > 0)
      return NextResponse.json({ error: `Produto possui ${count} unidade(s) ativa(s). Descarte-as primeiro.` }, { status: 400 })

    await prisma.produto.delete({ where: { id: params.id } })
    return NextResponse.json({ sucesso: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao deletar produto' }, { status: 500 })
  }
}
