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

      if (!item.setor || !item.responsavel || !item.tipo || !item.marca || !item.modelo || !item.etiqueta) {
        erros.push(`Linha ${linha}: campos obrigatórios faltando`)
        continue
      }

      try {
        await prisma.inventario.upsert({
          where: { etiqueta: item.etiqueta.trim() },
          update: {
            setor: item.setor.trim(),
            responsavel: item.responsavel.trim(),
            tipo: item.tipo.trim(),
            marca: item.marca.trim(),
            modelo: item.modelo.trim(),
            observacoes: item.observacoes?.trim() || null,
          },
          create: {
            setor: item.setor.trim(),
            responsavel: item.responsavel.trim(),
            tipo: item.tipo.trim(),
            marca: item.marca.trim(),
            modelo: item.modelo.trim(),
            etiqueta: item.etiqueta.trim(),
            observacoes: item.observacoes?.trim() || null,
          },
        })
        importados.push(item.etiqueta)
      } catch {
        erros.push(`Linha ${linha}: erro ao importar etiqueta "${item.etiqueta}"`)
      }
    }

    return NextResponse.json({
      importados: importados.length,
      erros,
      mensagem: `${importados.length} item(s) importado(s) com sucesso${erros.length > 0 ? `, ${erros.length} erro(s)` : ''}`,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao processar importação' }, { status: 500 })
  }
}
