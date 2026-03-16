import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.perfil !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo') || ''
  const ativoId = searchParams.get('ativoId') || ''
  const usuarioId = searchParams.get('usuarioId') || ''
  const setorId = searchParams.get('setorId') || ''
  const categoriaId = searchParams.get('categoriaId') || ''
  const pagina = parseInt(searchParams.get('pagina') || '1')
  const porPagina = 20

  const where: Record<string, unknown> = {}
  if (tipo) where.tipo = tipo
  if (ativoId) where.ativoId = ativoId
  if (usuarioId) where.usuarioId = usuarioId
  if (setorId) where.setorId = setorId
  if (categoriaId) where.ativo = { categoriaId }

  const [total, movimentacoes] = await Promise.all([
    prisma.movimentacao.count({ where }),
    prisma.movimentacao.findMany({
      where,
      include: { ativo: { include: { categoria: true } }, fornecedor: true, setor: true, usuario: true },
      orderBy: { data: 'desc' },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
    }),
  ])

  return NextResponse.json({ movimentacoes, total, paginas: Math.ceil(total / porPagina), pagina })
}
