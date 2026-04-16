import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type InventarioItem = {
  id: string
  setor: string
  responsavel: string
  tipo: string
  marca: string
  modelo: string
  etiqueta: string
  numero: string | null
  observacoes: string | null
  criadoEm: Date
  atualizadoEm: Date
}

const normalizarItem = (item: Partial<InventarioItem> & { id: string }) => ({
  id: item.id,
  setor: item.setor ?? '',
  responsavel: item.responsavel ?? '',
  tipo: item.tipo ?? '',
  marca: item.marca ?? '',
  modelo: item.modelo ?? '',
  etiqueta: item.etiqueta ?? '',
  numero: item.numero ?? null,
  observacoes: item.observacoes ?? null,
  criadoEm: item.criadoEm,
  atualizadoEm: item.atualizadoEm,
})

const buscarInventarioResiliente = async ({
  busca,
  setor,
  tipo,
  responsavel,
}: {
  busca: string
  setor: string
  tipo: string
  responsavel: string
}) => {
  const filtros: Prisma.Sql[] = []

  if (busca) {
    const termoBusca = `%${busca}%`
    filtros.push(Prisma.sql`(
      COALESCE(responsavel, '') ILIKE ${termoBusca}
      OR COALESCE(etiqueta, '') ILIKE ${termoBusca}
      OR COALESCE(modelo, '') ILIKE ${termoBusca}
      OR COALESCE(marca, '') ILIKE ${termoBusca}
    )`)
  }

  if (setor) {
    filtros.push(Prisma.sql`COALESCE(setor, '') ILIKE ${`%${setor}%`}`)
  }

  if (tipo) {
    filtros.push(Prisma.sql`COALESCE(tipo, '') ILIKE ${`%${tipo}%`}`)
  }

  if (responsavel) {
    filtros.push(Prisma.sql`COALESCE(responsavel, '') ILIKE ${`%${responsavel}%`}`)
  }

  const where = filtros.length > 0
    ? Prisma.sql`WHERE ${Prisma.join(filtros, ' AND ')}`
    : Prisma.empty

  const itens = await prisma.$queryRaw<InventarioItem[]>(Prisma.sql`
    SELECT
      id,
      COALESCE(setor, '') AS setor,
      COALESCE(responsavel, '') AS responsavel,
      COALESCE(tipo, '') AS tipo,
      COALESCE(marca, '') AS marca,
      COALESCE(modelo, '') AS modelo,
      COALESCE(etiqueta, '') AS etiqueta,
      numero,
      observacoes,
      criado_em AS "criadoEm",
      atualizado_em AS "atualizadoEm"
    FROM inventario
    ${where}
    ORDER BY COALESCE(setor, '') ASC, COALESCE(responsavel, '') ASC
  `)

  return itens.map(normalizarItem)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const busca = searchParams.get('search') || ''
    const setor = searchParams.get('setor') || ''
    const tipo = searchParams.get('tipo') || ''
    const responsavel = searchParams.get('responsavel') || ''

    try {
      const itens = await prisma.inventario.findMany({
        where: {
          AND: [
            busca ? {
              OR: [
                { responsavel: { contains: busca, mode: 'insensitive' } },
                { etiqueta: { contains: busca, mode: 'insensitive' } },
                { modelo: { contains: busca, mode: 'insensitive' } },
                { marca: { contains: busca, mode: 'insensitive' } },
              ],
            } : {},
            setor ? { setor: { contains: setor, mode: 'insensitive' } } : {},
            tipo ? { tipo: { contains: tipo, mode: 'insensitive' } } : {},
            responsavel ? { responsavel: { contains: responsavel, mode: 'insensitive' } } : {},
          ],
        },
        orderBy: [{ setor: 'asc' }, { responsavel: 'asc' }],
      })

      return NextResponse.json(itens.map(normalizarItem))
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2032'
      ) {
        const itens = await buscarInventarioResiliente({ busca, setor, tipo, responsavel })
        return NextResponse.json(itens)
      }
      throw error
    }
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar inventário' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const body = await request.json()
    const { setor, responsavel, tipo, marca, modelo, etiqueta, numero, observacoes } = body

    if (!setor || !responsavel || !tipo || !marca || !modelo || !etiqueta)
      return NextResponse.json({ error: 'Todos os campos obrigatórios devem ser preenchidos' }, { status: 400 })

    const item = await prisma.inventario.create({
      data: {
        setor: setor.trim(),
        responsavel: responsavel.trim(),
        tipo: tipo.trim(),
        marca: marca.trim(),
        modelo: modelo.trim(),
        etiqueta: etiqueta.trim(),
        numero: numero?.trim() || null,
        observacoes: observacoes?.trim() || null,
      },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002')
      return NextResponse.json({ error: 'Etiqueta já cadastrada no inventário' }, { status: 400 })
    return NextResponse.json({ error: 'Erro ao cadastrar item' }, { status: 500 })
  }
}
