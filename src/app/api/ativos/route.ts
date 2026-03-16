import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const busca = searchParams.get('search') || ''
    const fornecedorId = searchParams.get('fornecedorId') || ''
    const categoriaId = searchParams.get('categoriaId') || ''
    const baixo = searchParams.get('estoqueBaixo') === 'true'

    const ativos = await prisma.ativo.findMany({
      where: {
        deletado: false,
        AND: [
          busca ? { OR: [{ nome: { contains: busca, mode: 'insensitive' } }, { codigo: { contains: busca, mode: 'insensitive' } }, { etiqueta: { contains: busca, mode: 'insensitive' } }] } : {},
          fornecedorId ? { fornecedorId } : {},
          categoriaId ? { categoriaId } : {},
        ],
      },
      include: { fornecedor: true, categoria: true },
      orderBy: { criadoEm: 'desc' },
    })

    if (baixo) {
      const categorias = await prisma.categoria.findMany({
        include: { ativos: { where: { deletado: false } } },
      })
      const categoriasEmBaixo = new Set(
        categorias
          .filter(c => c.estoqueMinimo > 0 && c.ativos.reduce((s, a) => s + a.quantidade, 0) <= c.estoqueMinimo)
          .map(c => c.id)
      )
      return NextResponse.json(ativos.filter(a => a.categoriaId && categoriasEmBaixo.has(a.categoriaId)))
    }

    return NextResponse.json(ativos)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar ativos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { usuarioId, responsavel, ...ativoData } = body
    const ativo = await prisma.ativo.create({
      data: {
        nome: ativoData.nome,
        codigo: ativoData.codigo,
        etiqueta: ativoData.etiqueta || null,
        fornecedorId: ativoData.fornecedorId || null,
        categoriaId: ativoData.categoriaId || null,
        linkCompra: ativoData.linkCompra || null,
        valorUnitario: parseFloat(ativoData.valorUnitario) || 0,
        quantidade: parseInt(ativoData.quantidade) || 0,
        dataCompra: ativoData.dataCompra ? new Date(ativoData.dataCompra) : null,
        observacoes: ativoData.observacoes || null,
      },
      include: { fornecedor: true, categoria: true },
    })

    if (ativo.quantidade > 0) {
      await prisma.movimentacao.create({
        data: {
          tipo: 'ENTRADA',
          ativoId: ativo.id,
          quantidade: ativo.quantidade,
          valorUnitario: ativo.valorUnitario,
          data: new Date(),
          fornecedorId: ativo.fornecedorId,
          usuarioId: usuarioId || null,
          responsavel: responsavel || 'Sistema',
          observacoes: 'Cadastro inicial',
        },
      })
    }

    return NextResponse.json(ativo, { status: 201 })
  } catch (error: unknown) {
    console.error(error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002')
      return NextResponse.json({ error: 'Código ou etiqueta já existe' }, { status: 400 })
    return NextResponse.json({ error: 'Erro ao criar ativo' }, { status: 500 })
  }
}
