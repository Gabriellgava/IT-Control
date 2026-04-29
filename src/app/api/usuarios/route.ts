import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  enforceRateLimit,
  enforceSameOriginForMutations,
  requireAdminUser,
  sanitizeEmail,
  sanitizeNullableText,
  sanitizePerfil,
  serializeUsuario,
} from '@/lib/api-security'

export async function GET(request: NextRequest) {
  const rateLimit = enforceRateLimit(request)
  if (rateLimit) return rateLimit

  const { response } = await requireAdminUser()
  if (response) return response

  try {
    const usuarios = await prisma.usuario.findMany({ orderBy: { nome: 'asc' } })
    return NextResponse.json(usuarios.map(serializeUsuario))
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar usuários' }, { status: 500 })
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
    const email = sanitizeEmail(body.email)

    if (!nome || !email) {
      return NextResponse.json({ error: 'Nome e e-mail válidos são obrigatórios' }, { status: 400 })
    }

    const usuario = await prisma.usuario.create({
      data: { nome, email, perfil: sanitizePerfil(body.perfil), ativo: true },
    })
    return NextResponse.json(serializeUsuario(usuario), { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 })
  }
}
