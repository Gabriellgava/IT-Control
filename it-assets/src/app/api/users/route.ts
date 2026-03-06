import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const users = await prisma.user.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json(users)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar usuários' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const user = await prisma.user.create({
      data: { name: body.name, email: body.email, role: body.role || 'user' },
    })
    return NextResponse.json(user, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'E-mail já existe ou erro ao criar' }, { status: 500 })
  }
}
