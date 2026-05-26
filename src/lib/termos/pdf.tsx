import { createHash } from 'node:crypto'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { normalizarTexto } from '@/lib/texto'
import { cleanAssetDescription } from '@/lib/termos/asset-description'

type TermoItem = { descricao: string; tipo: string; etiqueta: string }

export interface BuildTermoPdfParams {
  termoId: string
  titulo: string
  texto: string
  empresa?: string
  colaborador?: string
  colaboradorEmail?: string | null
  setores?: string[]
  dataEntrega?: string
  dataDevolucao?: string
  observacoes?: string
  itens?: TermoItem[]
  assinaturaTexto?: string
  assinaturaImagemDataUrl?: string | null
  assinadorIp?: string
  assinadoEm?: Date
}

function stripHtml(value: string) {
  return normalizarTexto(value.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' '))
}

function extractTableItems(html: string): TermoItem[] {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
  return rows
    .map((row) => {
      const cells = [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => normalizarTexto(cell[1].replace(/<[^>]+>/g, ' ')))
      if (cells.length < 3) return null
      return { descricao: cleanAssetDescription(cells[0]), tipo: cells[1], etiqueta: cells[2] }
    })
    .filter((item): item is TermoItem => Boolean(item && item.descricao && item.tipo && item.etiqueta))
    .slice(0, 300)
}

const PAGE = { width: 595, height: 842, margin: 40 }

export async function buildTermoPdf(params: BuildTermoPdfParams) {
  console.log('[pdf] iniciando geração')
  const signedAt = params.assinadoEm ?? new Date()
  const cleanText = stripHtml(params.texto)
  const fallbackItems = extractTableItems(params.texto)
  const items = (params.itens?.length ? params.itens : fallbackItems).map((i) => ({ ...i, descricao: cleanAssetDescription(normalizarTexto(i.descricao)) }))
  const payloadHash = createHash('sha256').update(JSON.stringify({ termoId: params.termoId, signedAt: signedAt.toISOString(), signer: params.assinaturaTexto ?? '', texto: cleanText })).digest('hex')

  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  let page = doc.addPage([PAGE.width, PAGE.height])
  let y = PAGE.height - PAGE.margin
  console.log('[pdf] documento criado')

  const write = (text: string, size = 10, isBold = false) => {
    const targetFont = isBold ? bold : font
    const lines = targetFont.splitTextIntoLines(text, PAGE.width - PAGE.margin * 2)
    for (const line of lines) {
      if (y < 80) { page = doc.addPage([PAGE.width, PAGE.height]); y = PAGE.height - PAGE.margin }
      page.drawText(line, { x: PAGE.margin, y, size, font: targetFont, color: rgb(0.08, 0.1, 0.15) })
      y -= size + 3
    }
  }

  write(params.empresa || 'IT Control', 11, true)
  write(normalizarTexto(params.titulo), 16, true)
  y -= 6
  write(`Nome: ${normalizarTexto(params.colaborador || '-')}`)
  write(`E-mail: ${normalizarTexto(params.colaboradorEmail || '-')}`)
  write(`Setor(es): ${normalizarTexto(params.setores?.join(', ') || '-')}`)
  write(`Data de entrega: ${normalizarTexto(params.dataEntrega || '-')}`)
  write(`Data devolução: ${normalizarTexto(params.dataDevolucao || '-')}`)
  y -= 6
  write('Termo de responsabilidade', 12, true)
  write(cleanText)
  y -= 8
  write('Tabela de equipamentos', 12, true)
  write('Descrição | Tipo | Etiqueta', 10, true)
  for (const item of items) write(`${item.descricao} | ${normalizarTexto(item.tipo)} | ${normalizarTexto(item.etiqueta)}`)
  console.log('[pdf] tabela ativos renderizada')

  y -= 8
  write('Assinatura eletrônica', 12, true)
  write(`Assinado por: ${normalizarTexto(params.assinaturaTexto || '-')}`)
  write(`Data/hora (UTC): ${signedAt.toISOString()}`)
  write(`IP: ${normalizarTexto(params.assinadorIp || '-')}`)

  if (params.assinaturaImagemDataUrl?.startsWith('data:image/')) {
    const base64 = params.assinaturaImagemDataUrl.split(',')[1] ?? ''
    const bytes = Buffer.from(base64, 'base64')
    const image = params.assinaturaImagemDataUrl.includes('image/png') ? await doc.embedPng(bytes) : await doc.embedJpg(bytes)
    const scaled = image.scale(0.3)
    if (y < scaled.height + 80) { page = doc.addPage([PAGE.width, PAGE.height]); y = PAGE.height - PAGE.margin }
    page.drawImage(image, { x: PAGE.margin, y: y - scaled.height, width: scaled.width, height: scaled.height })
    y -= scaled.height + 8
  }
  console.log('[pdf] assinatura renderizada')

  write(`Rodapé auditoria | ID: ${params.termoId} | Hash: ${payloadHash.slice(0, 32)}... | Gerado em ${new Date().toISOString()}`, 9)
  const pdfBytes = await doc.save()
  const buffer = Buffer.from(pdfBytes)
  console.log('[pdf] buffer gerado', { bytes: buffer.length })
  return buffer
}
