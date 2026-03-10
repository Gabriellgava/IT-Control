import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const usuarios = await prisma.usuario.findMany({ orderBy: { nome: 'asc' } })
    return NextResponse.json(usuarios)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar usuários' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const usuario = await prisma.usuario.create({
      data: { nome: body.nome, email: body.email, perfil: body.perfil || 'usuario' },
    })
    return NextResponse.json(usuario, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 })
  }
}
