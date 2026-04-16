import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const body = await request.json()
    const { itens } = body as {
      itens: { setor: string; responsavel: string; tipo: string; marca: string; modelo: string; etiqueta: string; numero?: string; observacoes?: string }[]
    }

    if (!itens || !Array.isArray(itens) || itens.length === 0)
      return NextResponse.json({ error: 'Nenhum item para importar' }, { status: 400 })

    const erros: string[] = []
    let inseridos = 0
    let atualizados = 0
    let semMudancas = 0

    for (let i = 0; i < itens.length; i++) {
      const item = itens[i]
      const linha = i + 2 // linha 1 = cabeçalho

      const setor = item.setor?.trim()
      const responsavel = item.responsavel?.trim()
      const tipo = item.tipo?.trim()
      const marca = item.marca?.trim()
      const modelo = item.modelo?.trim()
      const etiqueta = item.etiqueta?.trim()
      const numero = item.numero?.trim() || null
      const observacoes = item.observacoes?.trim() || null

      if (!setor || !responsavel || !tipo || !marca || !modelo || !etiqueta) {
        erros.push(`Linha ${linha}: campos obrigatórios faltando`)
        continue
      }

      try {
        const existente = await prisma.inventario.findUnique({ where: { etiqueta } })

        if (!existente) {
          await prisma.inventario.create({
            data: { setor, responsavel, tipo, marca, modelo, etiqueta, numero, observacoes },
          })
          inseridos++
          continue
        }

        const mudou =
          existente.setor !== setor ||
          existente.responsavel !== responsavel ||
          existente.tipo !== tipo ||
          existente.marca !== marca ||
          existente.modelo !== modelo ||
          existente.numero !== numero ||
          existente.observacoes !== observacoes

        if (!mudou) {
          semMudancas++
          continue
        }

        await prisma.inventario.update({
          where: { etiqueta },
          data: { setor, responsavel, tipo, marca, modelo, numero, observacoes },
        })
        atualizados++
      } catch {
        erros.push(`Linha ${linha}: erro ao importar etiqueta "${etiqueta}"`)
      }
    }

    const processados = inseridos + atualizados
    const payload = {
      importados: processados,
      inseridos,
      atualizados,
      semMudancas,
      erros,
      mensagem: `${processados} item(s) processado(s): ${inseridos} novo(s), ${atualizados} atualizado(s), ${semMudancas} sem mudança${erros.length > 0 ? `, ${erros.length} erro(s)` : ''}`,
    }

    if (processados === 0) {
      return NextResponse.json({ ...payload, error: 'Nenhum item foi importado. Verifique o formato da planilha.' }, { status: 400 })
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao processar importação' }, { status: 500 })
  }
}
