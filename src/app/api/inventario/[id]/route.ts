import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizarTexto } from '@/lib/texto'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const body = await request.json()
    const { setor, responsavel, tipo, marca, modelo, etiqueta, numero, observacoes } = body
    const payload = {
      setor: normalizarTexto(setor),
      responsavel: normalizarTexto(responsavel),
      tipo: normalizarTexto(tipo),
      marca: normalizarTexto(marca),
      modelo: normalizarTexto(modelo),
      etiqueta: normalizarTexto(etiqueta),
      numero: normalizarTexto(numero) || null,
      observacoes: normalizarTexto(observacoes) || null,
    }

    if (!payload.setor || !payload.responsavel || !payload.tipo || !payload.marca || !payload.modelo || !payload.etiqueta)
      return NextResponse.json({ error: 'Todos os campos obrigatórios devem ser preenchidos' }, { status: 400 })

    const item = await prisma.inventario.update({
      where: { id: params.id },
      data: payload,
    })

    return NextResponse.json(item)
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002')
      return NextResponse.json({ error: 'Etiqueta já cadastrada no inventário' }, { status: 400 })
    return NextResponse.json({ error: 'Erro ao atualizar item' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const item = await prisma.inventario.findUnique({
      where: { id: params.id },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
    }

    // Check if item is referenced in any terms by searching the conteudoHtml
    const termosComItem = await prisma.termo.findMany({
      where: {
        conteudoHtml: {
          contains: item.etiqueta,
        },
      },
      select: { id: true, titulo: true },
    })

    if (termosComItem.length > 0) {
      return NextResponse.json({
        error: `Este item está vinculado a ${termosComItem.length} termo(s) de responsabilidade. Não é possível excluir itens com histórico de termos.`,
        termos: termosComItem.map(t => ({ id: t.id, titulo: t.titulo }))
      }, { status: 400 })
    }

    await prisma.inventario.delete({ where: { id: params.id } })
    return NextResponse.json({ sucesso: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao remover item' }, { status: 500 })
  }
}
