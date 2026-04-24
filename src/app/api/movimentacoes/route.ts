import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function parseDateWithCurrentTime(data?: string): Date {
  const agora = new Date()
  if (!data) return agora

  const [ano, mes, dia] = data.split('-').map(Number)
  if (!ano || !mes || !dia) return agora

  return new Date(
    ano,
    mes - 1,
    dia,
    agora.getHours(),
    agora.getMinutes(),
    agora.getSeconds(),
    agora.getMilliseconds(),
  )
}

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
    const { tipo, subtipo, produtoId, etiqueta, etiquetas, dataCompra, valorUnitario, fornecedorId, setorId, usuarioId, responsavel, observacoes, funcionarioId, funcionarioRecebe, funcionarioDevolve } = body

    // ENTRADA: cria nova unidade física
    if (tipo === 'ENTRADA') {
      if (subtipo === 'DEVOLUCAO') {
        if (!funcionarioDevolve?.trim())
          return NextResponse.json({ error: 'Funcionário é obrigatório para devolução' }, { status: 400 })

        const devolucao = await prisma.$transaction(async (tx) => {
          const etiquetaFiltro = etiqueta?.trim()
          const itensInventario = await tx.inventario.findMany({
            where: {
              responsavel: { equals: funcionarioDevolve.trim(), mode: 'insensitive' },
              ...(etiquetaFiltro
                ? { etiqueta: { equals: etiquetaFiltro, mode: 'insensitive' } }
                : {}),
            },
            orderBy: { etiqueta: 'asc' },
          })

          if (itensInventario.length === 0) {
            return {
              erro: etiquetaFiltro
                ? 'O item selecionado não está com este funcionário no inventário'
                : 'Nenhum item encontrado no inventário para este funcionário',
            }
          }

          const pendencias: Array<{ etiqueta: string, motivo: string }> = []
          const etiquetasProcessadas: string[] = []

          for (const item of itensInventario) {
            const unidade = await tx.unidade.findUnique({
              where: { etiqueta: item.etiqueta.trim() },
              include: { produto: true },
            })

            if (!unidade) {
              pendencias.push({
                etiqueta: item.etiqueta,
                motivo: 'Etiqueta sem cadastro de unidade (apenas no inventário)',
              })
              continue
            }

            if (unidade.status !== 'ATIVA') {
              pendencias.push({
                etiqueta: item.etiqueta,
                motivo: `Unidade com status ${unidade.status}`,
              })
              continue
            }

            await tx.movimentacao.create({
              data: {
                tipo: 'ENTRADA',
                subtipo: 'DEVOLUCAO',
                unidadeId: unidade.id,
                valorUnitario: unidade.produto.valorUnitario,
                data: parseDateWithCurrentTime(body.data),
                fornecedorId: null,
                usuarioId: usuarioId || null,
                responsavel: responsavel || funcionarioDevolve.trim(),
                observacoes: observacoes || null,
              },
            })

            etiquetasProcessadas.push(item.etiqueta.trim())
          }

          if (etiquetasProcessadas.length === 0) {
            return { erro: 'Nenhum item pôde ser devolvido ao estoque', pendencias }
          }

          await tx.inventario.deleteMany({ where: { etiqueta: { in: etiquetasProcessadas } } })

          return {
            quantidadeDevolvida: etiquetasProcessadas.length,
            pendencias,
          }
        })

        if ('erro' in devolucao)
          return NextResponse.json({ error: devolucao.erro, pendencias: devolucao.pendencias ?? [] }, { status: 400 })

        return NextResponse.json({
          mensagem: `${devolucao.quantidadeDevolvida} item(ns) devolvido(s) ao estoque`,
          quantidadeDevolvida: devolucao.quantidadeDevolvida,
          pendencias: devolucao.pendencias,
        }, { status: 201 })
      }

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
          dataCompra: parseDateWithCurrentTime(dataCompra),
          status: 'ATIVA',
        },
      })

      await prisma.inventario.deleteMany({
        where: { etiqueta: { equals: etiqueta.trim(), mode: 'insensitive' } },
      })

      const movimentacao = await prisma.movimentacao.create({
        data: {
          tipo: 'ENTRADA',
          subtipo: null,
          unidadeId: unidade.id,
          valorUnitario: parseFloat(valorUnitario) || produto.valorUnitario,
          data: parseDateWithCurrentTime(dataCompra),
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
      const etiquetasNormalizadas = Array.from(new Set(
        (Array.isArray(etiquetas) ? etiquetas : [etiqueta])
          .map((v) => String(v || '').trim())
          .filter(Boolean),
      ))
      if (etiquetasNormalizadas.length === 0)
        return NextResponse.json({ error: 'Informe ao menos uma etiqueta' }, { status: 400 })

      const subtipoSaida = subtipo || 'USUARIO'
      let funcionario: { id: string, nome: string, ativo: boolean, setorId: string, setor: { id: string, nome: string } } | null = null
      if (subtipoSaida === 'USUARIO') {
        if (!funcionarioId) return NextResponse.json({ error: 'Funcionário é obrigatório para saída de usuário' }, { status: 400 })
        funcionario = await prisma.funcionario.findUnique({ where: { id: funcionarioId }, include: { setor: true } })
        if (!funcionario) return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })
        if (!funcionario.ativo) return NextResponse.json({ error: 'Funcionário inativo não pode receber itens' }, { status: 400 })
      }

      const resultado = await prisma.$transaction(async (tx) => {
        const movimentacoesCriadas = []
        const pendencias: Array<{ etiqueta: string, motivo: string }> = []

        for (const etiquetaAtual of etiquetasNormalizadas) {
          const unidade = await tx.unidade.findUnique({
            where: { etiqueta: etiquetaAtual },
            include: { produto: { include: { categoria: true } } },
          })

          if (!unidade) {
            pendencias.push({ etiqueta: etiquetaAtual, motivo: 'Etiqueta não encontrada' })
            continue
          }

          if (unidade.status !== 'ATIVA') {
            pendencias.push({ etiqueta: etiquetaAtual, motivo: 'Unidade não está ativa' })
            continue
          }

          if (subtipoSaida === 'DESCARTE') {
            await tx.unidade.update({ where: { id: unidade.id }, data: { status: 'DESCARTADA' } })
            await tx.inventario.deleteMany({ where: { etiqueta: { equals: etiquetaAtual, mode: 'insensitive' } } })
          }

          if (subtipoSaida === 'USUARIO' && funcionario) {
            const tipoInventario = unidade.produto.categoria?.nome || unidade.produto.nome
            await tx.inventario.upsert({
              where: { etiqueta: etiquetaAtual },
              update: {
                setor: funcionario.setor.nome,
                responsavel: funcionario.nome,
                tipo: tipoInventario,
                marca: unidade.produto.nome,
                modelo: unidade.produto.codigo,
                observacoes: observacoes || null,
              },
              create: {
                setor: funcionario.setor.nome,
                responsavel: funcionario.nome,
                tipo: tipoInventario,
                marca: unidade.produto.nome,
                modelo: unidade.produto.codigo,
                etiqueta: etiquetaAtual,
                observacoes: observacoes || null,
              },
            })
          }

          const movimentacao = await tx.movimentacao.create({
            data: {
              tipo: 'SAIDA',
              subtipo: subtipoSaida,
              unidadeId: unidade.id,
              valorUnitario: unidade.produto.valorUnitario,
              data: parseDateWithCurrentTime(body.data),
              fornecedorId: null,
              setorId: subtipoSaida === 'USUARIO' ? funcionario?.setorId || null : setorId || null,
              usuarioId: usuarioId || null,
              responsavel: subtipoSaida === 'USUARIO' ? funcionario?.nome || funcionarioRecebe || null : responsavel || null,
              observacoes: observacoes || null,
            },
            include: {
              unidade: { include: { produto: { include: { categoria: true } } } },
              fornecedor: true,
              setor: true,
              usuario: true,
            },
          })
          movimentacoesCriadas.push(movimentacao)
        }

        return { movimentacoesCriadas, pendencias }
      })

      if (resultado.movimentacoesCriadas.length === 0)
        return NextResponse.json({ error: 'Nenhuma etiqueta pôde ser processada', pendencias: resultado.pendencias }, { status: 400 })

      return NextResponse.json({
        movimentacoes: resultado.movimentacoesCriadas,
        totalProcessado: resultado.movimentacoesCriadas.length,
        pendencias: resultado.pendencias,
      }, { status: 201 })
    }

    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao registrar movimentação' }, { status: 500 })
  }
}
