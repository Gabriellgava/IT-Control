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

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const rateLimit = enforceRateLimit(request)
  if (rateLimit) return rateLimit
  const sameOrigin = enforceSameOriginForMutations(request)
  if (sameOrigin) return sameOrigin

  const { response } = await requireAdminUser()
  if (response) return response

  const body = await request.json()
  const data: { nome?: string; email?: string; perfil?: 'admin' | 'usuario'; ativo?: boolean } = {}

  if ('nome' in body) {
    const nome = sanitizeNullableText(body.nome)
    if (!nome) return NextResponse.json({ error: 'Nome inválido' }, { status: 400 })
    data.nome = nome
  }

  if ('email' in body) {
    const email = sanitizeEmail(body.email)
    if (!email) return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 })
    data.email = email
  }

  if ('perfil' in body) data.perfil = sanitizePerfil(body.perfil)
  if ('ativo' in body) data.ativo = Boolean(body.ativo)

  const usuario = await prisma.usuario.update({ where: { id: params.id }, data })
  return NextResponse.json(serializeUsuario(usuario))
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const rateLimit = enforceRateLimit(request)
  if (rateLimit) return rateLimit
  const sameOrigin = enforceSameOriginForMutations(request)
  if (sameOrigin) return sameOrigin

  const { response, session } = await requireAdminUser()
  if (response) return response

  if (session?.user?.id === params.id) {
    return NextResponse.json({ error: 'Não é permitido excluir o próprio usuário' }, { status: 400 })
  }

  await prisma.usuario.delete({ where: { id: params.id } })
  return NextResponse.json({ sucesso: true })
}
