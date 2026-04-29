import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  enforceRateLimit,
  enforceSameOriginForMutations,
  requireAuthenticatedUser,
  requireAdminUser,
  sanitizeNullableText,
} from '@/lib/api-security'

export async function GET(request: NextRequest) {
  const rateLimit = enforceRateLimit(request)
  if (rateLimit) return rateLimit

  const { response } = await requireAuthenticatedUser()
  if (response) return response

  try {
    const setores = await prisma.setor.findMany({ orderBy: { nome: 'asc' } })
    return NextResponse.json(setores)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar setores' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const rateLimit = enforceRateLimit(request)
  if (rateLimit) return rateLimit
  const sameOrigin = enforceSameOriginForMutations(request)
  if (sameOrigin) return sameOrigin

  const { response } = await requireAdminUser()
  if (response) return response

  try {
    const body = await request.json()
    const nome = sanitizeNullableText(body.nome)

    if (!nome) return NextResponse.json({ error: 'Nome do setor é obrigatório' }, { status: 400 })

    const setor = await prisma.setor.create({ data: { nome } })
    return NextResponse.json(setor, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar setor' }, { status: 500 })
  }
}
