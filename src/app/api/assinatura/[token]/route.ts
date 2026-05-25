import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashSignatureToken } from '@/lib/termos/security'
import { buildTermoPdf } from '@/lib/termos/pdf'
import { uploadPdf } from '@/lib/termos/drive'
import { registrarAuditoria } from '@/lib/termos/auditoria'

function buildSignedFileName(termoId: string, funcionarioNome: string) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const nome = funcionarioNome.trim().replace(/\s+/g, '_')
  return `assinado-${termoId}-${nome}-${stamp}.pdf`
}

export async function GET(_: NextRequest, { params }: { params: { token: string } }) {
  const hash = hashSignatureToken(params.token)
  const termo = await prisma.termo.findUnique({ where: { assinaturaTokenHash: hash }, include: { funcionario: true } })
  if (!termo) return NextResponse.json({ error: 'Link inválido' }, { status: 404 })
  if (!termo.tokenExpiraEm || termo.tokenExpiraEm < new Date()) return NextResponse.json({ error: 'Link expirado' }, { status: 410 })
  return NextResponse.json({ id: termo.id, titulo: termo.titulo, conteudoHtml: termo.conteudoHtml, funcionario: termo.funcionario.nome, status: termo.status })
}

export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  const hash = hashSignatureToken(params.token)
  const termo = await prisma.termo.findUnique({ where: { assinaturaTokenHash: hash }, include: { funcionario: true } })
  if (!termo) return NextResponse.json({ error: 'Link inválido' }, { status: 404 })
  if (termo.status === 'ASSINADO') return NextResponse.json({ error: 'Termo já assinado' }, { status: 409 })
  if (!termo.tokenExpiraEm || termo.tokenExpiraEm < new Date()) return NextResponse.json({ error: 'Link expirado' }, { status: 410 })
  if (!termo.driveFolderId) return NextResponse.json({ error: 'Pasta do termo não configurada' }, { status: 400 })

  const body = await request.json()
  if (!body.signatureType || (!body.typedName && !body.signatureDataUrl)) return NextResponse.json({ error: 'Assinatura obrigatória' }, { status: 400 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const userAgent = request.headers.get('user-agent') ?? 'unknown'

  const assinadoEm = new Date()
  const assinanteNome = body.typedName?.trim() || termo.funcionario.nome
  const pdf = await buildTermoPdf({
    titulo: termo.titulo,
    texto: termo.conteudoHtml,
    assinaturaTexto: assinanteNome,
    assinadoEm,
  })
  const final = await uploadPdf(termo.driveFolderId, buildSignedFileName(termo.id, termo.funcionario.nome), pdf)

  await prisma.termo.update({
    where: { id: termo.id },
    data: {
      status: 'ASSINADO',
      assinaturaTipo: body.signatureType,
      assinanteNome,
      assinaturaTexto: body.typedName?.trim() || null,
      assinaturaImagemDataUrl: null,
      assinaturaIp: ip,
      assinaturaUserAgent: userAgent,
      assinadoEm,
      drivePdfAssinadoFileId: final.fileId,
      drivePdfAssinadoLink: final.link ?? undefined,
    },
  })

  await registrarAuditoria(termo.id, 'TERMO_ASSINADO', { finalFileId: final.fileId }, { ip, userAgent })
  return NextResponse.json({ ok: true })
}
