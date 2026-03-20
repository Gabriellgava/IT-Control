import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo') || ''
    const subtipo = searchParams.get('subtipo') || ''
    const ativoId = searchParams.get('ativoId') || ''
    const limite = parseInt(searchParams.get('limite') || '100')

    const movimentacoes = await prisma.movimentacao.findMany({
      where: {
        cancelado: false,
        AND: [
          tipo ? { tipo } : {},
          subtipo ? { subtipo } : {},
          ativoId ? { ativoId } : {},
        ],
      },
      include: { ativo: { include: { categoria: true } }, fornecedor: true, setor: true, usuario: true },
      orderBy: { data: 'desc' },
      take: limite,
    })

    return NextResponse.json(movimentacoes)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar movimentações' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tipo, subtipo, ativoId, quantidade, valorUnitario, data, fornecedorId, setorId, usuarioId, responsavel, observacoes } = body

    const ativo = await prisma.ativo.findUnique({ where: { id: ativoId } })
    if (!ativo) return NextResponse.json({ error: 'Ativo não encontrado' }, { status: 404 })

    const qtd = parseInt(quantidade)
    if (tipo === 'SAIDA' && ativo.quantidade < qtd) {
      return NextResponse.json({ error: 'Quantidade insuficiente em estoque' }, { status: 400 })
    }

    const novaQuantidade = tipo === 'ENTRADA' ? ativo.quantidade + qtd : ativo.quantidade - qtd
    await prisma.ativo.update({
      where: { id: ativoId },
      data: {
        quantidade: novaQuantidade,
        valorUnitario: tipo === 'ENTRADA' ? parseFloat(valorUnitario) || ativo.valorUnitario : ativo.valorUnitario,
        // Descarte → soft delete automático: some da lista mas histórico preservado
        ...(subtipo === 'DESCARTE' && { deletado: true }),
      },
    })

    const movimentacao = await prisma.movimentacao.create({
      data: {
        tipo,
        subtipo: tipo === 'SAIDA' ? (subtipo || 'USUARIO') : null,
        ativoId,
        quantidade: qtd,
        valorUnitario: parseFloat(valorUnitario) || ativo.valorUnitario,
        data: (() => {
          if (!data) return new Date()
          const agora = new Date()
          const [ano, mes, dia] = data.split('-').map(Number)
          return new Date(ano, mes - 1, dia, agora.getHours(), agora.getMinutes(), agora.getSeconds())
        })(),
        fornecedorId: fornecedorId || null,
        setorId: setorId || null,
        usuarioId: usuarioId || null,
        responsavel: responsavel || null,
        observacoes: observacoes || null,
      },
      include: { ativo: true, fornecedor: true, setor: true, usuario: true },
    })

    return NextResponse.json(movimentacao, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao registrar movimentação' }, { status: 500 })
  }
}
