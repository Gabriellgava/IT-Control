import { createHash } from 'node:crypto'
import { normalizarTexto } from '@/lib/texto'
import { generateTermoPdf } from '@/lib/pdf/generate-termo-pdf'

type TermoItem = { descricao: string; tipo: string; etiqueta: string; marca?: string; modelo?: string }

export interface BuildTermoPdfParams {
  termoId: string
  titulo: string
  texto: string
  empresa?: string
  colaborador?: string
  colaboradorCpf?: string | null
  colaboradorCargo?: string | null
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
  return normalizarTexto(value.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' '))
}

function sanitizeDescricaoProduto(value: string) {
  const base = normalizarTexto(value)
  return base
    .replace(/\s+[A-Z]{2,}\d{2,}$/g, '')
    .replace(/\s+[A-Z]+[-_]?\d{2,}$/g, '')
    .replace(/\s+\d{3,}[A-Z]{1,3}$/g, '')
    .trim()
}

function extractTableItems(html: string): TermoItem[] {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
  return rows
    .map((row) => {
      const cells = [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => stripHtml(cell[1]))
      if (cells.length < 3) return null
      const descricao = sanitizeDescricaoProduto(cells[0])
      return { descricao, tipo: cells[1], etiqueta: cells[2], marca: cells[3] || '-', modelo: cells[4] || '-' }
    })
    .filter((item): item is TermoItem => Boolean(item && item.descricao && item.tipo && item.etiqueta))
    .slice(0, 200)
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function buildHtml(params: BuildTermoPdfParams, hash: string, signedAt: Date, cleanText: string, items: TermoItem[]) {
  const assinaturaImagem = params.assinaturaImagemDataUrl
    ? `<div class="signature-image-wrap"><img src="${params.assinaturaImagemDataUrl}" alt="Assinatura" class="signature-image" /></div>`
    : ''

  const rows = items
    .map((item, index) => `<tr>
      <td class="col-n">${index + 1}</td>
      <td>${escapeHtml(normalizarTexto(item.tipo || '-'))}</td>
      <td>${escapeHtml(normalizarTexto(item.marca || '-'))}</td>
      <td>${escapeHtml(normalizarTexto(item.modelo || '-'))}</td>
      <td>${escapeHtml(sanitizeDescricaoProduto(item.descricao || '-'))}</td>
    </tr>`)
    .join('')

  return `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
*{box-sizing:border-box} html,body{margin:0;padding:0} body{font-family:"Segoe UI",Arial,Helvetica,sans-serif;color:#111827;font-size:11px}
.sheet{width:100%}.topbar{height:8px;background:#0F172A;margin-bottom:8px}.doc{border:1px solid #CBD5E1;padding:14px}
.hdr{display:flex;justify-content:space-between;gap:16px;border-bottom:2px solid #0F172A;padding-bottom:8px}.brand h1{margin:0;font-size:15px;letter-spacing:.2px}
.brand p{margin:2px 0;color:#334155;font-size:10px}.title{margin:10px 0 8px;text-align:center}.title h2{margin:0;font-size:16px;font-weight:700}
.title h3{margin:2px 0 0;font-size:11px;font-weight:600;color:#334155}.bi{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:8px 0}
.box{border:1px solid #CBD5E1;border-radius:4px;padding:8px;min-height:74px}.box h4{margin:0 0 6px;font-size:10px;text-transform:uppercase;color:#0F172A}
.kv{display:grid;grid-template-columns:130px 1fr;gap:4px 8px}.k{color:#475569}.v{font-weight:500}.legal{border:1px solid #CBD5E1;padding:10px;margin-top:8px;line-height:1.5;text-align:justify}
.tbl-wrap{margin-top:10px}.tbl-title{font-size:11px;font-weight:700;margin:0 0 6px}.tbl{width:100%;border-collapse:collapse;table-layout:fixed}
.tbl th,.tbl td{border:1px solid #94A3B8;padding:6px;vertical-align:top;word-break:break-word}.tbl th{background:#E2E8F0;text-transform:uppercase;font-size:9px;letter-spacing:.3px}
.col-n{width:30px;text-align:center}.sign{margin-top:12px;border:1px solid #94A3B8;border-radius:4px;padding:10px;text-align:center}
.signature-image-wrap{display:flex;justify-content:center;margin:6px 0}.signature-image{max-width:260px;max-height:80px;object-fit:contain}
.meta{margin-top:6px;font-size:10px;color:#334155}.attest{margin-top:8px;font-size:10px;font-style:italic;color:#334155;text-align:center}
.audit{margin-top:10px;border-top:1px solid #CBD5E1;padding-top:6px;font-size:9px;color:#475569;display:flex;justify-content:space-between;gap:10px}
@page{size:A4;margin:16mm 10mm 18mm 10mm}
</style></head><body><main class="sheet"><div class="topbar"></div><section class="doc">
<header class="hdr"><div class="brand"><h1>FAST GAMING S.A.</h1><p>CNPJ: 00.000.000/0001-00</p><p>Endereço: Av. Corporativa, 1000 - São Paulo/SP - Brasil</p></div><div><p><strong>ID Documento:</strong> ${escapeHtml(params.termoId)}</p><p><strong>Data:</strong> ${signedAt.toISOString()}</p></div></header>
<div class="title"><h2>TERMO DE CESSÃO DE USO DE EQUIPAMENTOS</h2><h3>EQUIPMENT USE ASSIGNMENT AGREEMENT</h3></div>
<section class="bi"><article class="box"><h4>Português</h4><div class="kv"><span class="k">Nome</span><span class="v">${escapeHtml(normalizarTexto(params.colaborador || '-'))}</span><span class="k">CPF</span><span class="v">${escapeHtml(normalizarTexto(params.colaboradorCpf || '-'))}</span><span class="k">E-mail</span><span class="v">${escapeHtml(normalizarTexto(params.colaboradorEmail || '-'))}</span><span class="k">Data</span><span class="v">${escapeHtml(normalizarTexto(params.dataEntrega || signedAt.toISOString().slice(0, 10)))}</span><span class="k">Cargo</span><span class="v">${escapeHtml(normalizarTexto(params.colaboradorCargo || '-'))}</span></div></article>
<article class="box"><h4>English</h4><div class="kv"><span class="k">Employee</span><span class="v">${escapeHtml(normalizarTexto(params.colaborador || '-'))}</span><span class="k">Tax ID</span><span class="v">${escapeHtml(normalizarTexto(params.colaboradorCpf || '-'))}</span><span class="k">Email</span><span class="v">${escapeHtml(normalizarTexto(params.colaboradorEmail || '-'))}</span><span class="k">Date</span><span class="v">${escapeHtml(normalizarTexto(params.dataEntrega || signedAt.toISOString().slice(0, 10)))}</span><span class="k">Role</span><span class="v">${escapeHtml(normalizarTexto(params.colaboradorCargo || '-'))}</span></div></article></section>
<section class="legal">${escapeHtml(cleanText)}</section>
<section class="tbl-wrap"><p class="tbl-title">Equipamentos / Assigned Equipment</p><table class="tbl"><thead><tr><th class="col-n">Nº</th><th>Tipo</th><th>Marca</th><th>Modelo</th><th>Descrição</th></tr></thead><tbody>${rows}</tbody></table></section>
<section class="sign"><strong>Assinatura Eletrônica / Electronic Signature</strong>${assinaturaImagem}<div class="meta">Assinado por: ${escapeHtml(normalizarTexto(params.assinaturaTexto || '-'))}</div><div class="meta">Data/Hora (UTC): ${signedAt.toISOString()}</div><div class="meta">IP: ${escapeHtml(normalizarTexto(params.assinadorIp || '-'))}</div><div class="meta">Hash: ${hash}</div><div class="attest">Documento assinado eletronicamente conforme MP 2.200-2/2001</div></section>
<footer class="audit"><span>ID: ${escapeHtml(params.termoId)}</span><span>Gerado em: ${new Date().toISOString()}</span><span>Hash: ${hash.slice(0, 24)}...</span></footer>
</section></main></body></html>`
}

export async function buildTermoPdf(params: BuildTermoPdfParams) {
  const signedAt = params.assinadoEm ?? new Date()
  const cleanText = stripHtml(params.texto)
  const fallbackItems = extractTableItems(params.texto)
  const items = (params.itens?.length ? params.itens : fallbackItems).slice(0, 200).map((item) => ({ ...item, descricao: sanitizeDescricaoProduto(item.descricao) }))
  const payloadHash = createHash('sha256').update(JSON.stringify({ termoId: params.termoId, signedAt: signedAt.toISOString(), signer: params.assinaturaTexto ?? '', texto: cleanText })).digest('hex')
  return generateTermoPdf(buildHtml(params, payloadHash, signedAt, cleanText, items))
}
