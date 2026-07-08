import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizarNomePessoa, normalizarTexto } from '@/lib/texto'

export async function GET() {
  try {
    const itens = await prisma.inventario.findMany({
      orderBy: [
        { responsavel: 'asc' },
        { setor: 'asc' },
        { etiqueta: 'asc' },
      ],
    })

    const itensNormalizados = itens.map((item) => ({
      id: item.id,
      setor: normalizarTexto(item.setor),
      responsavel: normalizarNomePessoa(item.responsavel),
      tipo: normalizarTexto(item.tipo),
      marca: normalizarTexto(item.marca),
      modelo: normalizarTexto(item.modelo),
      etiqueta: normalizarTexto(item.etiqueta),
      observacoes: normalizarTexto(item.observacoes) || null,
      criadoEm: item.criadoEm,
    }))

    return NextResponse.json(itensNormalizados)
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Erro ao carregar equipamentos para os termos.' },
      { status: 500 }
    )
  }
}