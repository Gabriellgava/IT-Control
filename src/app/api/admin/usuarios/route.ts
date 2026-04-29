import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
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

  const usuarios = await prisma.usuario.findMany({ orderBy: { criadoEm: 'desc' } })
  return NextResponse.json(usuarios.map(serializeUsuario))
}

export async function POST(request: NextRequest) {
  const rateLimit = enforceRateLimit(request)
  if (rateLimit) return rateLimit
  const sameOrigin = enforceSameOriginForMutations(request)
  if (sameOrigin) return sameOrigin

  const { response } = await requireAdminUser()
  if (response) return response

  const body = await request.json()
  const nome = sanitizeNullableText(body.nome)
  const email = sanitizeEmail(body.email)
  const senha = sanitizeNullableText(body.senha)

  if (!nome || !email || !senha || senha.length < 8) {
    return NextResponse.json({ error: 'Nome, e-mail válido e senha (mínimo 8 caracteres) são obrigatórios' }, { status: 400 })
  }

  const hash = await bcrypt.hash(senha, 12)
  try {
    const usuario = await prisma.usuario.create({
      data: { nome, email, senha: hash, perfil: sanitizePerfil(body.perfil), ativo: true },
    })
    return NextResponse.json(serializeUsuario(usuario), { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Email já cadastrado' }, { status: 400 })
  }
}
