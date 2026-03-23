import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo') || ''
    const subtipo = searchParams.get('subtipo') || ''
    const produtoId = searchParams.get('produtoId') || ''
    const limite = parseInt(searchParams.get('limite') || '100')

    const movimentacoes = await prisma.movimentacao.findMany({
      where: {
        cancelado: false,
        AND: [
          tipo ? { tipo } : {},
          subtipo ? { subtipo } : {},
          produtoId ? { unidade: { produtoId } } : {},
        ],
      },
      include: {
        unidade: { include: { produto: { include: { categoria: true } } } },
        fornecedor: true,
        setor: true,
        usuario: true,
      },
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
    const { tipo, subtipo, produtoId, etiqueta, dataCompra, valorUnitario, fornecedorId, setorId, usuarioId, responsavel, observacoes } = body

    // ENTRADA: cria nova unidade física
    if (tipo === 'ENTRADA') {
      if (!produtoId) return NextResponse.json({ error: 'Produto é obrigatório' }, { status: 400 })
      if (!etiqueta?.trim()) return NextResponse.json({ error: 'Etiqueta é obrigatória' }, { status: 400 })

      const produto = await prisma.produto.findUnique({ where: { id: produtoId } })
      if (!produto) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })

      // Verifica se etiqueta já existe
      const etiquetaExiste = await prisma.unidade.findUnique({ where: { etiqueta: etiqueta.trim() } })
      if (etiquetaExiste) return NextResponse.json({ error: 'Etiqueta já cadastrada' }, { status: 400 })

      const unidade = await prisma.unidade.create({
        data: {
          produtoId,
          etiqueta: etiqueta.trim(),
          dataCompra: dataCompra ? new Date(dataCompra) : null,
          status: 'ATIVA',
        },
      })

      const movimentacao = await prisma.movimentacao.create({
        data: {
          tipo: 'ENTRADA',
          subtipo: null,
          unidadeId: unidade.id,
          valorUnitario: parseFloat(valorUnitario) || produto.valorUnitario,
          data: dataCompra ? new Date(dataCompra) : new Date(),
          fornecedorId: fornecedorId || produto.fornecedorId || null,
          usuarioId: usuarioId || null,
          responsavel: responsavel || null,
          observacoes: observacoes || null,
        },
        include: {
          unidade: { include: { produto: { include: { categoria: true } } } },
          fornecedor: true,
          setor: true,
          usuario: true,
        },
      })

      return NextResponse.json(movimentacao, { status: 201 })
    }

    // SAIDA (usuário ou descarte): opera sobre unidade existente por etiqueta
    if (tipo === 'SAIDA') {
      if (!etiqueta?.trim()) return NextResponse.json({ error: 'Etiqueta é obrigatória' }, { status: 400 })

      const unidade = await prisma.unidade.findUnique({
        where: { etiqueta: etiqueta.trim() },
        include: { produto: true },
      })

      if (!unidade) return NextResponse.json({ error: 'Etiqueta não encontrada' }, { status: 404 })
      if (unidade.status !== 'ATIVA') return NextResponse.json({ error: 'Esta unidade já foi descartada' }, { status: 400 })

      // Atualiza status se for descarte
      if (subtipo === 'DESCARTE') {
        await prisma.unidade.update({
          where: { id: unidade.id },
          data: { status: 'DESCARTADA' },
        })
      }

      const movimentacao = await prisma.movimentacao.create({
        data: {
          tipo: 'SAIDA',
          subtipo: subtipo || 'USUARIO',
          unidadeId: unidade.id,
          valorUnitario: unidade.produto.valorUnitario,
          data: (() => {
            const agora = new Date()
            if (!body.data) return agora
            const [ano, mes, dia] = body.data.split('-').map(Number)
            return new Date(ano, mes - 1, dia, agora.getHours(), agora.getMinutes(), agora.getSeconds())
          })(),
          fornecedorId: null,
          setorId: setorId || null,
          usuarioId: usuarioId || null,
          responsavel: responsavel || null,
          observacoes: observacoes || null,
        },
        include: {
          unidade: { include: { produto: { include: { categoria: true } } } },
          fornecedor: true,
          setor: true,
          usuario: true,
        },
      })

      return NextResponse.json(movimentacao, { status: 201 })
    }

    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao registrar movimentação' }, { status: 500 })
  }
}
