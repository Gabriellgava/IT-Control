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
      itens: { setor: string; responsavel: string; tipo: string; marca: string; modelo: string; etiqueta: string; observacoes?: string }[]
    }

    if (!itens || !Array.isArray(itens) || itens.length === 0)
      return NextResponse.json({ error: 'Nenhum item para importar' }, { status: 400 })

    const erros: string[] = []
    const importados: string[] = []

    for (let i = 0; i < itens.length; i++) {
      const item = itens[i]
      const linha = i + 2 // linha 1 = cabeçalho

      const setor = item.setor?.trim()
      const responsavel = item.responsavel?.trim()
      const tipo = item.tipo?.trim()
      const marca = item.marca?.trim()
      const modelo = item.modelo?.trim()
      const etiqueta = item.etiqueta?.trim()
      const observacoes = item.observacoes?.trim() || null

      if (!setor || !responsavel || !tipo || !marca || !modelo || !etiqueta) {
        erros.push(`Linha ${linha}: campos obrigatórios faltando`)
        continue
      }

      try {
        await prisma.inventario.upsert({
          where: { etiqueta },
          update: {
            setor,
            responsavel,
            tipo,
            marca,
            modelo,
            observacoes,
          },
          create: {
            setor,
            responsavel,
            tipo,
            marca,
            modelo,
            etiqueta,
            observacoes,
          },
        })
        importados.push(etiqueta)
      } catch {
        erros.push(`Linha ${linha}: erro ao importar etiqueta "${etiqueta}"`)
      }
    }

    const payload = {
      importados: importados.length,
      erros,
      mensagem: `${importados.length} item(s) importado(s) com sucesso${erros.length > 0 ? `, ${erros.length} erro(s)` : ''}`,
    }

    if (importados.length === 0) {
      return NextResponse.json({ ...payload, error: 'Nenhum item foi importado. Verifique o formato da planilha.' }, { status: 400 })
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao processar importação' }, { status: 500 })
  }
}
