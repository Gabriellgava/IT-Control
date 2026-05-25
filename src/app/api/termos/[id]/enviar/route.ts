import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enviarEmailAssinatura } from '@/lib/termos/email'
import { registrarAuditoria } from '@/lib/termos/auditoria'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const termo = await prisma.termo.findUnique({ where: { id: params.id }, include: { funcionario: true } })
    if (!termo) return NextResponse.json({ error: 'Termo não encontrado' }, { status: 404 })
    if (!termo.assinaturaTokenHash || !termo.tokenExpiraEm) return NextResponse.json({ error: 'Token inexistente' }, { status: 400 })

    await enviarEmailAssinatura({ to: body.email, nome: termo.funcionario.nome, link: body.link, titulo: termo.titulo })
    await prisma.termo.update({ where: { id: termo.id }, data: { status: 'ENVIADO', enviadoEm: new Date() } })
    await registrarAuditoria(termo.id, 'EMAIL_ASSINATURA_ENVIADO', { email: body.email, link: body.link })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao enviar email'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
