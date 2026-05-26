import { createHash } from 'node:crypto'
import { normalizarTexto } from '@/lib/texto'
import { generateTermoPdf } from '@/lib/pdf/generate-termo-pdf'

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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function stripHtml(value: string) {
  return normalizarTexto(value.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' '))
}

function extractTableItems(html: string): TermoItem[] {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
  return rows
    .map((row) => {
      const cells = [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => normalizarTexto(cell[1].replace(/<[^>]+>/g, ' ')))
      if (cells.length < 3) return null
      return { descricao: cells[0], tipo: cells[1], etiqueta: cells[2] }
    })
    .filter((item): item is TermoItem => Boolean(item && item.descricao && item.tipo && item.etiqueta))
    .slice(0, 300)
}

function buildTermoHtml(params: BuildTermoPdfParams, payloadHash: string, signedAt: Date, items: TermoItem[]) {
  const assinaturaImagem = params.assinaturaImagemDataUrl
    ? `<img src="${params.assinaturaImagemDataUrl}" style="max-width:220px;max-height:70px;object-fit:contain;margin-top:8px;" />`
    : ''

  const rows = items
    .map((item) => `<tr><td>${escapeHtml(normalizarTexto(item.descricao))}</td><td>${escapeHtml(normalizarTexto(item.tipo))}</td><td>${escapeHtml(normalizarTexto(item.etiqueta))}</td></tr>`)
    .join('')

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" /><style>
*{box-sizing:border-box} body{font-family:Arial,sans-serif;color:#111827;font-size:12px;line-height:1.4;margin:0}
.wrap{padding:20px 12px 25px 12px} h1{font-size:20px;margin:4px 0 12px} h2{font-size:14px;margin:16px 0 8px}
.meta div{margin-bottom:4px} .termo{white-space:normal} table{width:100%;border-collapse:collapse;table-layout:fixed;page-break-inside:auto}
th,td{border:1px solid #d1d5db;padding:6px;vertical-align:top;word-break:break-word} th{background:#f3f4f6;text-align:left}
tr{page-break-inside:avoid;page-break-after:auto} .signature{border:1px solid #d1d5db;border-radius:4px;padding:8px}
.footer{margin-top:12px;font-size:10px;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:8px}
</style></head>
<body><main class="wrap">
<div>${escapeHtml(params.empresa || 'IT Control')}</div><h1>${escapeHtml(normalizarTexto(params.titulo))}</h1>
<section class="meta"><h2>Dados do colaborador</h2>
<div><strong>Nome:</strong> ${escapeHtml(normalizarTexto(params.colaborador || '-'))}</div>
<div><strong>E-mail:</strong> ${escapeHtml(normalizarTexto(params.colaboradorEmail || '-'))}</div>
<div><strong>Setor(es):</strong> ${escapeHtml(normalizarTexto(params.setores?.join(', ') || '-'))}</div>
<div><strong>Data de entrega:</strong> ${escapeHtml(normalizarTexto(params.dataEntrega || '-'))}</div>
<div><strong>Data devolução:</strong> ${escapeHtml(normalizarTexto(params.dataDevolucao || '-'))}</div></section>
<section><h2>Termo</h2><div class="termo">${stripHtml(params.texto)}</div></section>
<section><h2>Tabela de equipamentos</h2><table><thead><tr><th style="width:56%">Descrição</th><th style="width:22%">Tipo</th><th style="width:22%">Etiqueta</th></tr></thead><tbody>${rows}</tbody></table></section>
<section><h2>Assinatura eletrônica</h2><div class="signature"><div><strong>Assinado por:</strong> ${escapeHtml(normalizarTexto(params.assinaturaTexto || '-'))}</div>
<div><strong>Data/hora (UTC):</strong> ${signedAt.toISOString()}</div><div><strong>IP:</strong> ${escapeHtml(normalizarTexto(params.assinadorIp || '-'))}</div>${assinaturaImagem}</div></section>
${params.observacoes ? `<div style="margin-top:8px;"><strong>Observações:</strong> ${escapeHtml(normalizarTexto(params.observacoes))}</div>` : ''}
<div class="footer">Documento para auditoria • ID: ${escapeHtml(params.termoId)} • Hash SHA-256: ${payloadHash.slice(0, 32)}... • Gerado em ${new Date().toISOString()}</div>
</main></body></html>`
}

export async function buildTermoPdf(params: BuildTermoPdfParams) {
  const signedAt = params.assinadoEm ?? new Date()
  const cleanText = normalizarTexto(stripHtml(params.texto).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' '))
  const fallbackItems = extractTableItems(params.texto)
  const items = (params.itens?.length ? params.itens : fallbackItems)
  const payloadHash = createHash('sha256')
    .update(JSON.stringify({ termoId: params.termoId, signedAt: signedAt.toISOString(), signer: params.assinaturaTexto ?? '', texto: cleanText }))
    .digest('hex')

  const html = buildTermoHtml(params, payloadHash, signedAt, items)
  return generateTermoPdf(html)
}
