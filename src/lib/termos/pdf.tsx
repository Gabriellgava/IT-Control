import { createHash } from 'node:crypto'
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib'
import { normalizarTexto } from '@/lib/texto'
import { cleanAssetDescription } from '@/lib/termos/asset-description'

type TermoItem = {
  descricao: string
  tipo: string
  etiqueta: string
  marca?: string
  modelo?: string
}

type TermoMetadata = {
  empresa?: string
  cnpjEmpresa?: string
  enderecoEmpresa?: string
  setores?: string[]
  dataEntrega?: string
  dataDevolucao?: string
  observacoes?: string
  itens?: TermoItem[]
}

export interface BuildTermoPdfParams {
  termoId: string
  titulo: string
  texto: string
  empresa?: string
  cnpjEmpresa?: string
  enderecoEmpresa?: string
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

const PAGE = { width: 595, height: 842, marginX: 48, marginTop: 44, marginBottom: 46 }
const COLORS = {
  ink: rgb(0.10, 0.12, 0.16),
  muted: rgb(0.36, 0.40, 0.48),
  border: rgb(0.72, 0.76, 0.82),
  borderLight: rgb(0.86, 0.88, 0.92),
  header: rgb(0.94, 0.96, 0.98),
  primary: rgb(0.08, 0.18, 0.34),
  primarySoft: rgb(0.90, 0.94, 0.98),
  white: rgb(1, 1, 1),
}
const TERM_METADATA_RE = /<!--\s*IT_CONTROL_TERMO_METADATA:([\s\S]*?)-->/i

function stripHtml(value: string) {
  return normalizarTexto(
    value
      .replace(TERM_METADATA_RE, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

function parseTermMetadata(html: string): TermoMetadata {
  const match = html.match(TERM_METADATA_RE)
  if (!match?.[1]) return {}

  try {
    const parsed = JSON.parse(Buffer.from(match[1].trim(), 'base64').toString('utf8')) as TermoMetadata
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function splitDescricaoMarcaModelo(descricao: string) {
  const clean = cleanAssetDescription(normalizarTexto(descricao))
  const [marca, ...modeloParts] = clean.split(/\s+/).filter(Boolean)
  return { marca: marca ?? '-', modelo: modeloParts.join(' ') || '-' }
}

function normalizeItem(item: TermoItem): TermoItem {
  const descricao = cleanAssetDescription(normalizarTexto(item.descricao || `${item.marca ?? ''} ${item.modelo ?? ''}`))
  const guessed = splitDescricaoMarcaModelo(descricao)

  return {
    etiqueta: normalizarTexto(item.etiqueta || '-'),
    tipo: normalizarTexto(item.tipo || '-'),
    descricao: descricao || '-',
    marca: normalizarTexto(item.marca || guessed.marca || '-'),
    modelo: normalizarTexto(item.modelo || guessed.modelo || '-'),
  }
}

function extractCompanyFromHtml(html: string) {
  const strongMatches = [...html.matchAll(/<strong[^>]*>([\s\S]*?)<\/strong>/gi)].map((match) => normalizarTexto(decodeHtml(match[1].replace(/<[^>]+>/g, ' '))))
  return strongMatches.find((value) => value && !value.includes('@'))
}

function extractTableItems(html: string): TermoItem[] {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
  const items: TermoItem[] = []

  for (const row of rows) {
    const cells = [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => normalizarTexto(decodeHtml(cell[1].replace(/<[^>]+>/g, ' '))))
    const normalizedCells = cells.map((cell) => cell.toLowerCase())
    if (cells.length < 3 || normalizedCells.some((cell) => cell.includes('patrimônio') || cell.includes('tipo do equipamento'))) continue

    if (cells.length >= 5) {
      items.push({ etiqueta: cells[0], tipo: cells[1], descricao: cells[2], marca: cells[3], modelo: cells[4] })
    } else {
      const [tipo, descricao, etiqueta] = cells
      const { marca, modelo } = splitDescricaoMarcaModelo(descricao)
      items.push({ etiqueta, tipo, descricao, marca, modelo })
    }
  }

  return items.filter((item) => item.descricao && item.tipo && item.etiqueta).slice(0, 300)
}

/**
 * Quebra texto por largura máxima usando métricas reais da fonte no pdf-lib.
 * Isso evita uso de APIs inexistentes e mantém compatibilidade com Vercel.
 */
const wrapText = (text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] => {
  const paragraphs = text.split(/\r?\n/)
  const lines: string[] = []

  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean)

    if (words.length === 0) {
      lines.push('')
      continue
    }

    let currentLine = words[0]

    for (let i = 1; i < words.length; i += 1) {
      const candidate = `${currentLine} ${words[i]}`
      const candidateWidth = font.widthOfTextAtSize(candidate, fontSize)

      if (candidateWidth <= maxWidth) {
        currentLine = candidate
        continue
      }

      lines.push(currentLine)

      if (font.widthOfTextAtSize(words[i], fontSize) > maxWidth) {
        let chunk = ''
        for (const char of words[i]) {
          const chunkCandidate = `${chunk}${char}`
          if (font.widthOfTextAtSize(chunkCandidate, fontSize) <= maxWidth) {
            chunk = chunkCandidate
          } else {
            if (chunk) lines.push(chunk)
            chunk = char
          }
        }
        currentLine = chunk
      } else {
        currentLine = words[i]
      }
    }

    lines.push(currentLine)
  }

  return lines
}

const formatDateBR = (date: Date) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(date)

const formatDateTimeBR = (date: Date) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(date)

export async function buildTermoPdf(params: BuildTermoPdfParams) {
  console.log('[pdf] iniciando geração')
  const signedAt = params.assinadoEm ?? new Date()
  const metadata = parseTermMetadata(params.texto)
  const cleanText = stripHtml(params.texto)
  const fallbackItems = extractTableItems(params.texto)
  const items = (params.itens?.length ? params.itens : metadata.itens?.length ? metadata.itens : fallbackItems).map(normalizeItem)
  const empresa = normalizarTexto(params.empresa || metadata.empresa || extractCompanyFromHtml(params.texto) || 'IT Control')
  const cnpjEmpresa = normalizarTexto(params.cnpjEmpresa || metadata.cnpjEmpresa || 'CNPJ não informado')
  const enderecoEmpresa = normalizarTexto(params.enderecoEmpresa || metadata.enderecoEmpresa || 'Endereço não informado')
  const setores = params.setores?.length ? params.setores : metadata.setores
  const dataEmissao = params.dataEntrega || metadata.dataEntrega || formatDateBR(new Date())
  const payloadHash = createHash('sha256')
    .update(JSON.stringify({ termoId: params.termoId, signedAt: signedAt.toISOString(), signer: params.assinaturaTexto ?? '', texto: cleanText, items }))
    .digest('hex')

  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique)
  let page = doc.addPage([PAGE.width, PAGE.height])
  let y = PAGE.height - PAGE.marginTop
  const pages: PDFPage[] = [page]
  console.log('[pdf] documento criado')

  const contentWidth = PAGE.width - PAGE.marginX * 2
  const bottomLimit = PAGE.marginBottom + 40

  const addPage = () => {
    page = doc.addPage([PAGE.width, PAGE.height])
    pages.push(page)
    y = PAGE.height - PAGE.marginTop
  }

  const ensureSpace = (height: number) => {
    if (y - height < bottomLimit) addPage()
  }

  const drawTextLine = (text: string, x: number, baseline: number, size: number, targetFont: PDFFont, color = COLORS.ink) => {
    page.drawText(text, { x, y: baseline, size, font: targetFont, color })
  }

  const writeParagraph = (text: string, options: { size?: number; isBold?: boolean; color?: ReturnType<typeof rgb>; align?: 'left' | 'center'; lineGap?: number; width?: number; x?: number } = {}) => {
    const size = options.size ?? 10.5
    const targetFont = options.isBold ? bold : font
    const lineGap = options.lineGap ?? 4
    const maxWidth = options.width ?? contentWidth
    const x = options.x ?? PAGE.marginX
    const lines = wrapText(text, targetFont, size, maxWidth)

    for (const line of lines) {
      ensureSpace(size + lineGap)
      const lineX = options.align === 'center' ? PAGE.marginX + (contentWidth - targetFont.widthOfTextAtSize(line, size)) / 2 : x
      drawTextLine(line, lineX, y, size, targetFont, options.color)
      y -= size + lineGap
    }
  }

  const sectionTitle = (title: string) => {
    y -= 8
    ensureSpace(30)
    page.drawRectangle({ x: PAGE.marginX, y: y - 7, width: contentWidth, height: 23, color: COLORS.primarySoft, borderColor: COLORS.borderLight, borderWidth: 0.8 })
    drawTextLine(title.toUpperCase(), PAGE.marginX + 10, y, 10.5, bold, COLORS.primary)
    y -= 28
  }

  const drawHeader = () => {
    page.drawRectangle({ x: PAGE.marginX, y: y - 24, width: 54, height: 30, color: COLORS.primary })
    drawTextLine('IT', PAGE.marginX + 13, y - 10, 17, bold, COLORS.white)
    drawTextLine('CONTROL', PAGE.marginX + 72, y - 3, 11, bold, COLORS.primary)
    drawTextLine('Termo corporativo de cessão de equipamentos', PAGE.marginX + 72, y - 18, 8.5, font, COLORS.muted)
    page.drawLine({ start: { x: PAGE.marginX, y: y - 36 }, end: { x: PAGE.width - PAGE.marginX, y: y - 36 }, thickness: 1, color: COLORS.border })
    y -= 62
  }

  const drawKeyValueGrid = (rows: Array<[string, string]>) => {
    const labelWidth = 98
    const valueWidth = contentWidth - labelWidth - 16
    for (const [label, value] of rows) {
      const valueLines = wrapText(value || '-', font, 9.5, valueWidth)
      const rowHeight = Math.max(24, valueLines.length * 11 + 12)
      ensureSpace(rowHeight)
      page.drawRectangle({ x: PAGE.marginX, y: y - rowHeight + 6, width: contentWidth, height: rowHeight, borderColor: COLORS.borderLight, borderWidth: 0.8 })
      page.drawRectangle({ x: PAGE.marginX, y: y - rowHeight + 6, width: labelWidth, height: rowHeight, color: COLORS.header, borderColor: COLORS.borderLight, borderWidth: 0.8 })
      drawTextLine(label, PAGE.marginX + 8, y - 9, 9.2, bold, COLORS.primary)
      valueLines.forEach((line, index) => drawTextLine(line, PAGE.marginX + labelWidth + 8, y - 9 - index * 11, 9.5, font, COLORS.ink))
      y -= rowHeight
    }
  }

  const drawEquipmentTable = () => {
    const headers = ['Patrimônio', 'Tipo', 'Descrição', 'Marca', 'Modelo']
    const widths = [75, 65, 180, 75, 99]
    const rowPadding = 7
    const headerHeight = 24
    const drawTableHeader = () => {
      ensureSpace(headerHeight + 8)
      let x = PAGE.marginX
      page.drawRectangle({ x: PAGE.marginX, y: y - headerHeight + 5, width: contentWidth, height: headerHeight, color: COLORS.primary, borderColor: COLORS.primary, borderWidth: 1 })
      headers.forEach((header, index) => {
        drawTextLine(header, x + 5, y - 10, 8.4, bold, COLORS.white)
        if (index > 0) page.drawLine({ start: { x, y: y + 5 }, end: { x, y: y - headerHeight + 5 }, thickness: 0.6, color: COLORS.white })
        x += widths[index]
      })
      y -= headerHeight
    }

    drawTableHeader()

    if (!items.length) {
      ensureSpace(30)
      page.drawRectangle({ x: PAGE.marginX, y: y - 24 + 5, width: contentWidth, height: 24, borderColor: COLORS.border, borderWidth: 0.8 })
      drawTextLine('Nenhum equipamento vinculado ao termo.', PAGE.marginX + 8, y - 10, 9.5, italic, COLORS.muted)
      y -= 28
      return
    }

    items.forEach((item, rowIndex) => {
      const rowValues = [item.etiqueta, item.tipo, item.descricao, item.marca ?? '-', item.modelo ?? '-']
      const wrappedCells = rowValues.map((value, index) => wrapText(value || '-', font, 8.5, widths[index] - rowPadding * 2))
      const rowHeight = Math.max(26, Math.max(...wrappedCells.map((lines) => lines.length)) * 11 + 12)
      if (y - rowHeight < bottomLimit) {
        addPage()
        drawTableHeader()
      }

      const background = rowIndex % 2 === 0 ? COLORS.white : rgb(0.985, 0.988, 0.992)
      page.drawRectangle({ x: PAGE.marginX, y: y - rowHeight + 5, width: contentWidth, height: rowHeight, color: background, borderColor: COLORS.border, borderWidth: 0.6 })
      let x = PAGE.marginX
      wrappedCells.forEach((lines, index) => {
        if (index > 0) page.drawLine({ start: { x, y: y + 5 }, end: { x, y: y - rowHeight + 5 }, thickness: 0.5, color: COLORS.borderLight })
        lines.slice(0, Math.floor((rowHeight - 8) / 11)).forEach((line, lineIndex) => {
          drawTextLine(line, x + rowPadding, y - 10 - lineIndex * 11, 8.5, font, COLORS.ink)
        })
        x += widths[index]
      })
      y -= rowHeight
    })
  }

  const drawSignatureBlock = async () => {
    sectionTitle('Assinaturas')
    writeParagraph(`Cidade e data: ____________________________________, ${dataEmissao}.`, { size: 10 })
    y -= 22
    ensureSpace(150)

    const columnGap = 28
    const columnWidth = (contentWidth - columnGap) / 2
    const leftX = PAGE.marginX
    const rightX = PAGE.marginX + columnWidth + columnGap
    const lineY = y

    page.drawLine({ start: { x: leftX, y: lineY }, end: { x: leftX + columnWidth, y: lineY }, thickness: 0.8, color: COLORS.border })
    page.drawLine({ start: { x: rightX, y: lineY }, end: { x: rightX + columnWidth, y: lineY }, thickness: 0.8, color: COLORS.border })
    drawTextLine('CEDENTE', leftX + columnWidth / 2 - bold.widthOfTextAtSize('CEDENTE', 9) / 2, lineY - 16, 9, bold, COLORS.primary)
    drawTextLine('Representante da Empresa', leftX + columnWidth / 2 - font.widthOfTextAtSize('Representante da Empresa', 8.5) / 2, lineY - 30, 8.5, font, COLORS.muted)
    drawTextLine('ASSINATURA DO COLABORADOR', rightX + columnWidth / 2 - bold.widthOfTextAtSize('ASSINATURA DO COLABORADOR', 9) / 2, lineY - 16, 9, bold, COLORS.primary)

    const signatureY = lineY + 12
    if (params.assinaturaImagemDataUrl?.startsWith('data:image/')) {
      const base64 = params.assinaturaImagemDataUrl.split(',')[1] ?? ''
      const bytes = Buffer.from(base64, 'base64')
      const image = params.assinaturaImagemDataUrl.includes('image/png') ? await doc.embedPng(bytes) : await doc.embedJpg(bytes)
      const scale = Math.min(columnWidth / image.width, 54 / image.height, 1)
      const width = image.width * scale
      const height = image.height * scale
      page.drawImage(image, { x: rightX + (columnWidth - width) / 2, y: signatureY, width, height })
    } else {
      const typedName = normalizarTexto(params.assinaturaTexto || params.colaborador || '-')
      drawTextLine(typedName, rightX + columnWidth / 2 - bold.widthOfTextAtSize(typedName, 15) / 2, signatureY + 18, 15, bold, COLORS.ink)
    }

    drawTextLine(`Nome: ${normalizarTexto(params.assinaturaTexto || params.colaborador || '-')}`, rightX, lineY - 46, 8.8, font, COLORS.ink)
    drawTextLine(`Data: ${formatDateTimeBR(signedAt)}`, rightX, lineY - 60, 8.8, font, COLORS.ink)
    y = lineY - 80
  }

  drawHeader()
  writeParagraph('TERMO DE CESSÃO DE USO DE EQUIPAMENTOS', { size: 16, isBold: true, align: 'center', color: COLORS.primary, lineGap: 6 })
  y -= 12
  writeParagraph(
    `Pelo presente termo, a empresa ${empresa}, inscrita no CNPJ ${cnpjEmpresa}, com sede em ${enderecoEmpresa}, neste ato representada por seu representante legal, doravante denominada CEDENTE, cede ao colaborador abaixo qualificado os equipamentos relacionados neste termo para utilização em suas atividades profissionais.`,
    { size: 10.6, lineGap: 5 }
  )

  sectionTitle('Dados do colaborador')
  drawKeyValueGrid([
    ['Nome:', normalizarTexto(params.colaborador || '-')],
    ['Email:', normalizarTexto(params.colaboradorEmail || '-')],
    ['Setor:', normalizarTexto(setores?.join(', ') || '-')],
    ['Data de emissão:', dataEmissao],
  ])

  sectionTitle('Tabela de equipamentos')
  drawEquipmentTable()
  console.log('[pdf] tabela ativos renderizada')

  sectionTitle('Cláusulas')
  const clauses = [
    ['1. Finalidade', 'Os equipamentos cedidos destinam-se exclusivamente às atividades profissionais do colaborador.'],
    ['2. Proibição de Transferência', 'É proibido emprestar, trocar, vender ou transferir equipamentos sem autorização formal da empresa.'],
    ['3. Responsabilidade', 'O colaborador compromete-se a zelar pela guarda, conservação e uso adequado dos equipamentos.'],
    ['4. Manutenção e Suporte', 'A manutenção será realizada pela empresa, exceto nos casos de mau uso comprovado.'],
    ['5. Perda, Roubo ou Extravio', 'Em caso de perda, roubo, furto ou danos decorrentes de negligência, o colaborador poderá ser responsabilizado conforme legislação vigente.'],
    ['6. Devolução', 'Os equipamentos deverão ser devolvidos quando solicitado ou no encerramento do vínculo profissional.'],
    ['7. Penalidades', 'O descumprimento deste termo poderá gerar medidas disciplinares e responsabilização pelos danos causados.'],
  ]

  clauses.forEach(([title, body]) => {
    writeParagraph(title, { size: 10.5, isBold: true, color: COLORS.primary, lineGap: 3 })
    writeParagraph(body, { size: 10, lineGap: 6 })
  })

  if (params.observacoes || metadata.observacoes || params.dataDevolucao || metadata.dataDevolucao) {
    sectionTitle('Observações complementares')
    if (params.dataDevolucao || metadata.dataDevolucao) writeParagraph(`Data prevista de devolução: ${params.dataDevolucao || metadata.dataDevolucao}`, { size: 10 })
    if (params.observacoes || metadata.observacoes) writeParagraph(params.observacoes || metadata.observacoes || '-', { size: 10 })
  }

  await drawSignatureBlock()
  console.log('[pdf] assinatura renderizada')

  writeParagraph(`Auditoria: ID ${params.termoId} | Hash ${payloadHash.slice(0, 32)}... | Gerado em ${new Date().toISOString()} | IP ${normalizarTexto(params.assinadorIp || '-')}`, {
    size: 7.8,
    color: COLORS.muted,
    lineGap: 2,
  })

  pages.forEach((targetPage, index) => {
    targetPage.drawLine({ start: { x: PAGE.marginX, y: 34 }, end: { x: PAGE.width - PAGE.marginX, y: 34 }, thickness: 0.6, color: COLORS.borderLight })
    targetPage.drawText(`Página ${index + 1} de ${pages.length}`, { x: PAGE.width - PAGE.marginX - 72, y: 20, size: 8, font, color: COLORS.muted })
    targetPage.drawText('IT Control • Termo de cessão de uso de equipamentos', { x: PAGE.marginX, y: 20, size: 8, font, color: COLORS.muted })
  })

  const pdfBytes = await doc.save()
  const buffer = Buffer.from(pdfBytes)
  console.log('[pdf] buffer gerado', { bytes: buffer.length })
  return buffer
}
