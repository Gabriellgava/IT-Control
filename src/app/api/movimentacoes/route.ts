import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { uploadDocumento, TipoDocumento } from '@/lib/drive-document-upload'

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
    const responsavel = searchParams.get('responsavel') || ''
    const etiqueta = searchParams.get('etiqueta') || ''
    const dataInicio = searchParams.get('dataInicio') || ''
    const dataFim = searchParams.get('dataFim') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const whereClause: any = {
      cancelado: false,
      AND: [
        tipo ? { tipo } : {},
        subtipo ? { subtipo } : {},
        produtoId ? { unidade: { produtoId } } : {},
        responsavel ? { responsavel } : {},
        etiqueta ? { unidade: { etiqueta: { contains: etiqueta } } } : {},
        dataInicio ? { data: { gte: new Date(`${dataInicio}T00:00:00`) } } : {},
        dataFim ? { data: { lte: new Date(`${dataFim}T23:59:59.999`) } } : {},
      ],
    }

    const [movimentacoes, total] = await Promise.all([
      prisma.movimentacao.findMany({
        where: whereClause,
        include: {
          unidade: {
            include: {
              produto: {
                include: {
                  categoria: true
                }
              }
            }
          },
          fornecedor: true,
          setor: true,
          usuario: true,
          documentos: true
        },
        orderBy: { data: 'desc' },
        skip,
        take: limit,
      }),
      prisma.movimentacao.count({ where: whereClause })
    ])

    return NextResponse.json({
      data: movimentacoes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar movimentações' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    
    let body: Record<string, any> = {}
    let notaFiscalFile: File | null = null

    // Se for multipart/form-data, processar arquivo
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      
      // Converter FormData para objeto
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          if (key === 'notaFiscal') {
            notaFiscalFile = value
          }
        } else {
          body[key] = value
        }
      }
    } else {
      // Se for JSON, processar normalmente
      body = await request.json()
    }

    const { 
      tipo, subtipo, produtoId, etiqueta, etiquetas, dataCompra, valorUnitario, 
      fornecedorId, setorId, usuarioId, responsavel, observacoes, funcionarioId, 
      funcionarioRecebe, funcionarioDevolve 
    } = body

    // ENTRADA: cria nova unidade física
    if (tipo === 'ENTRADA') {
      if (subtipo === 'DEVOLUCAO') {
        if (!funcionarioDevolve?.trim())
          return NextResponse.json({ error: 'Funcionário é obrigatório para devolução' }, { status: 400 })

        const devolucao = await prisma.$transaction(async (tx) => {
          const etiquetasNormalizadas = Array.from(new Set(
            (Array.isArray(etiquetas) ? etiquetas : [etiqueta])
              .map((v) => String(v || '').trim())
              .filter(Boolean),
          ))

          if (etiquetasNormalizadas.length === 0)
            return { erro: 'Nenhuma etiqueta informada para devolução' }

          const pendencias: Array<{ etiqueta: string, motivo: string }> = []
          const etiquetasProcessadas: string[] = []

          for (const etiquetaAtual of etiquetasNormalizadas) {
            const unidade = await tx.unidade.findUnique({
              where: { etiqueta: etiquetaAtual },
              include: { produto: true },
            })

            if (!unidade) {
              pendencias.push({
                etiqueta: etiquetaAtual,
                motivo: 'Etiqueta não encontrada',
              })
              continue
            }

            if (unidade.status !== 'ATIVA') {
              pendencias.push({
                etiqueta: etiquetaAtual,
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

            // Remover do inventário se existir
            await tx.inventario.deleteMany({ where: { etiqueta: etiquetaAtual } })

            etiquetasProcessadas.push(etiquetaAtual)
          }

          if (etiquetasProcessadas.length === 0) {
            return { erro: 'Nenhum item pôde ser devolvido ao estoque', pendencias }
          }

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
          documentos: true,
        },
      })

      // Se houver arquivo de nota fiscal, fazer upload e salvar em Documento
      if (notaFiscalFile) {
        try {
          const notaFiscalBuffer = Buffer.from(await notaFiscalFile.arrayBuffer())
          const uploadResult = await uploadDocumento({
            tipo: 'ATIVO',
            nomeItem: produto.nome,
            etiqueta: etiqueta.trim(),
            arquivo: notaFiscalBuffer,
            nomeArquivo: notaFiscalFile.name,
          })
          
          // Criar registro em Documento
          await prisma.documento.create({
            data: {
              nomeArquivo: notaFiscalFile.name,
              tipoArquivo: notaFiscalFile.type,
              tamanho: notaFiscalFile.size,

              driveFileId: uploadResult.driveFileId,
              driveLink: uploadResult.driveFileLink,

              tipoDocumento: 'NOTA_FISCAL',

              movimentacao: {
                connect: {
                  id: movimentacao.id
                }
              },

              produto: {
                connect: {
                  id: produto.id
                }
              }
            }
          })
          
          console.log('[API] Nota fiscal vinculada à movimentação', { 
            movimentacaoId: movimentacao.id, 
            fileId: uploadResult.driveFileId 
          })
        } catch (driveError) {
          console.error('[API] Erro ao fazer upload de nota fiscal:', driveError)
          // Não falhar a movimentação se o upload falhar
        }
      }

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
