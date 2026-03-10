import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.perfil !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  const usuarios = await prisma.usuario.findMany({ orderBy: { criadoEm: 'desc' } })
  return NextResponse.json(usuarios)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.perfil !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  const body = await request.json()
  const hash = await bcrypt.hash(body.senha, 10)
  try {
    const usuario = await prisma.usuario.create({
      data: { nome: body.nome, email: body.email, senha: hash, perfil: body.perfil || 'usuario', ativo: true },
    })
    return NextResponse.json(usuario, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Email já cadastrado' }, { status: 400 })
  }
}
