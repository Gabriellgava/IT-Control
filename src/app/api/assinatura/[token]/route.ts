import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureFuncionarioFolder, ensureTermoFolder, uploadPdf } from '@/lib/termos/drive'
import { registrarAuditoria } from '@/lib/termos/auditoria'

const getSignedHtml = (termo: { titulo: string; conteudoHtml: string; signerName?: string | null; signedAt?: Date | null }) => `<!doctype html><html><head><meta charset="utf-8"/><style>body{font-family:Arial,sans-serif;padding:32px;color:#111} .sign{margin-top:32px;padding-top:16px;border-top:1px solid #ddd;} table{width:100%;border-collapse:collapse} th,td{border:1px solid #e5e7eb;padding:6px;text-align:left}</style></head><body><h1>${termo.titulo}</h1>${termo.conteudoHtml}<div class="sign"><strong>Assinado eletronicamente por:</strong> ${termo.signerName ?? '-'}<br/>Data: ${termo.signedAt?.toISOString() ?? '-'}</div></body></html>`

async function renderPdfFromHtml(html: string) {
  const puppeteer = await (new Function("return import('puppeteer')")() as Promise<any>)
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    return Buffer.from(await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' } }))
  } finally {
    await browser.close()
  }
}

export async function GET(_: NextRequest, { params }: { params: { token: string } }) {
  const termo = await prisma.termo.findUnique({ where: { token: params.token }, include: { funcionario: true } })
  if (!termo) return NextResponse.json({ error: 'Link inválido' }, { status: 404 })

  if (termo.status === 'PENDENTE') {
    await prisma.termo.update({ where: { id: termo.id }, data: { status: 'VISUALIZADO' } })
  }

  return NextResponse.json({ id: termo.id, titulo: termo.titulo, conteudoHtml: termo.conteudoHtml, funcionario: termo.funcionario.nome, status: termo.status })
}

export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  const termo = await prisma.termo.findUnique({ where: { token: params.token }, include: { funcionario: true } })
  if (!termo) return NextResponse.json({ error: 'Link inválido' }, { status: 404 })
  if (termo.status === 'ASSINADO') return NextResponse.json({ error: 'Termo já assinado' }, { status: 409 })

  const body = await request.json()
  if (!body.acceptedTerms) return NextResponse.json({ error: 'Aceite obrigatório' }, { status: 400 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const userAgent = request.headers.get('user-agent') ?? 'unknown'
  const signerName = body.typedName?.trim() || termo.funcionario.nome
  const signedAt = new Date()

  const updated = await prisma.termo.update({ where: { id: termo.id }, data: { status: 'ASSINADO', signerName, signerIp: ip, signerUserAgent: userAgent, signatureImageDataUrl: body.signatureDataUrl ?? null, acceptedTerms: true, signedAt } })

  const funcionarioFolderId = await ensureFuncionarioFolder(termo.funcionario.nome)
  const termoFolderId = await ensureTermoFolder(funcionarioFolderId, termo.criadoEm)
  const pdf = await renderPdfFromHtml(getSignedHtml(updated))
  const final = await uploadPdf(termoFolderId, `termo-assinado-${termo.id}.pdf`, pdf)

  await prisma.termo.update({ where: { id: termo.id }, data: { driveFolderId: termoFolderId, driveFileId: final.fileId, driveFileLink: final.link ?? undefined } })

  await registrarAuditoria(termo.id, 'TERMO_ASSINADO', { finalFileId: final.fileId }, { ip, userAgent })
  return NextResponse.json({ ok: true })
}
