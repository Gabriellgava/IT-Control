import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateSignatureToken } from '@/lib/termos/security'
import { registrarAuditoria } from '@/lib/termos/auditoria'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.titulo || !body.conteudoHtml || !body.funcionarioId) {
      return NextResponse.json({ error: 'Dados obrigatórios ausentes' }, { status: 400 })
    }

    const funcionario = await prisma.funcionario.findUnique({ where: { id: body.funcionarioId } })
    if (!funcionario) return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })

    const token = generateSignatureToken()
    const termo = await prisma.termo.create({
      data: {
        titulo: body.titulo,
        conteudoHtml: body.conteudoHtml,
        funcionarioId: body.funcionarioId,
        criadoPorId: body.criadoPorId,
        token,
      },
    })

    await registrarAuditoria(termo.id, 'TERMO_CRIADO', { status: termo.status }, { atorId: body.criadoPorId })

    return NextResponse.json({ termoId: termo.id, tokenAssinatura: token }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar termo'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
