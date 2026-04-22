import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const produtoId = body.produtoId?.trim()

    if (!produtoId)
      return NextResponse.json({ error: 'Produto de destino é obrigatório' }, { status: 400 })

    const unidade = await prisma.unidade.findUnique({
      where: { id: params.id },
      include: { produto: { include: { categoria: true } } },
    })

    if (!unidade)
      return NextResponse.json({ error: 'Unidade não encontrada' }, { status: 404 })

    if (unidade.produtoId === produtoId)
      return NextResponse.json({ error: 'A unidade já está vinculada a este produto' }, { status: 400 })

    const produtoDestino = await prisma.produto.findUnique({
      where: { id: produtoId },
      include: { categoria: true },
    })

    if (!produtoDestino)
      return NextResponse.json({ error: 'Produto de destino não encontrado' }, { status: 404 })

    const atualizada = await prisma.unidade.update({
      where: { id: unidade.id },
      data: { produtoId: produtoDestino.id },
      include: { produto: { include: { categoria: true } } },
    })

    await prisma.inventario.updateMany({
      where: { etiqueta: unidade.etiqueta },
      data: {
        tipo: produtoDestino.categoria?.nome || produtoDestino.nome,
        marca: produtoDestino.nome,
        modelo: produtoDestino.codigo,
      },
    })

    return NextResponse.json(atualizada)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao mover unidade para outro produto' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const unidade = await prisma.unidade.findUnique({
      where: { id: params.id },
      include: { movimentacoes: { select: { id: true } } },
    })

    if (!unidade)
      return NextResponse.json({ error: 'Unidade não encontrada' }, { status: 404 })

    if (unidade.movimentacoes.length > 0)
      return NextResponse.json({ error: 'Esta unidade possui movimentações. Cancele as movimentações antes de excluir.' }, { status: 400 })

    await prisma.unidade.delete({ where: { id: unidade.id } })
    await prisma.inventario.deleteMany({ where: { etiqueta: unidade.etiqueta } })

    return NextResponse.json({ sucesso: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao excluir unidade' }, { status: 500 })
  }
}
