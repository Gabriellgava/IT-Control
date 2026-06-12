import { createHash } from 'node:crypto'
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib'
import { normalizarTexto } from '@/lib/texto'
import { cleanAssetDescription } from '@/lib/termos/asset-description'

// ─── Tipos ────────────────────────────────────────────────────────────────────

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

// Dados da empresa vindos do banco (tabela Empresa)
export interface EmpresaPdfData {
  nomeFantasia?: string | null
  razaoSocial?: string | null
  cnpj?: string | null
  rua?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
  cep?: string | null
  endereco?: string | null           // campo legado / campo composto
  representanteNome?: string | null
  representanteCargo?: string | null
  logoUrl?: string | null
  assinaturaUrl?: string | null
  usarLogoNoPdf?: boolean
  exibirCargoRepresentante?: boolean
  assinaturaAutomatica?: boolean
  mostrarEnderecoNoTermo?: boolean
}

export interface BuildTermoPdfParams {
  termoId: string
  titulo: string
  texto: string
  // campos legados mantidos para não quebrar a rota existente
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
  // NOVO: dados da empresa do banco (tem prioridade sobre os campos legados)
  empresaData?: EmpresaPdfData | null
}

// ─── Constantes de layout ─────────────────────────────────────────────────────

const PAGE = { width: 595, height: 842, marginX: 50, marginTop: 44, marginBottom: 20 }

// Paleta inspirada no PDF modelo (branco, preto, cinza escuro — corporativo limpo)
const C = {
  black:       rgb(0.05, 0.05, 0.07),
  ink:         rgb(0.15, 0.17, 0.20),
  muted:       rgb(0.40, 0.43, 0.48),
  faint:       rgb(0.60, 0.63, 0.68),
  border:      rgb(0.75, 0.77, 0.80),
  borderLight: rgb(0.88, 0.90, 0.92),
  tableHdr:    rgb(0.10, 0.12, 0.16),   // cabeçalho tabela: quase preto
  tableAlt:    rgb(0.972, 0.976, 0.980),
  infoBox:     rgb(0.965, 0.968, 0.972),
  infoBoxBdr:  rgb(0.82, 0.85, 0.88),
  white:       rgb(1, 1, 1),
}

const TERM_METADATA_RE = /<!--\s*IT_CONTROL_TERMO_METADATA:([\s\S]*?)-->/i

// ─── Helpers de texto ─────────────────────────────────────────────────────────

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
    tipo:     normalizarTexto(item.tipo || '-'),
    descricao: descricao || '-',
    marca:    normalizarTexto(item.marca || guessed.marca || '-'),
    modelo:   normalizarTexto(item.modelo || guessed.modelo || '-'),
  }
}

function extractCompanyFromHtml(html: string) {
  const strongMatches = [...html.matchAll(/<strong[^>]*>([\s\S]*?)<\/strong>/gi)]
    .map((match) => normalizarTexto(decodeHtml(match[1].replace(/<[^>]+>/g, ' '))))
  return strongMatches.find((v) => v && !v.includes('@'))
}

function extractTableItems(html: string): TermoItem[] {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
  const items: TermoItem[] = []
  for (const row of rows) {
    const cells = [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
      .map((cell) => normalizarTexto(decodeHtml(cell[1].replace(/<[^>]+>/g, ' '))))
    const normalized = cells.map((c) => c.toLowerCase())
    if (cells.length < 3 || normalized.some((c) => c.includes('patrimônio') || c.includes('tipo do equipamento'))) continue
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

// ─── Quebra de texto ──────────────────────────────────────────────────────────

const wrapText = (text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] => {
  const lines: string[] = []
  for (const paragraph of text.split(/\r?\n/)) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) { lines.push(''); continue }
    let cur = words[0]
    for (let i = 1; i < words.length; i++) {
      const candidate = `${cur} ${words[i]}`
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) { cur = candidate; continue }
      lines.push(cur)
      if (font.widthOfTextAtSize(words[i], fontSize) > maxWidth) {
        let chunk = ''
        for (const char of words[i]) {
          const test = `${chunk}${char}`
          if (font.widthOfTextAtSize(test, fontSize) <= maxWidth) { chunk = test }
          else { if (chunk) lines.push(chunk); chunk = char }
        }
        cur = chunk
      } else { cur = words[i] }
    }
    lines.push(cur)
  }
  return lines
}

// ─── Formatadores de data ─────────────────────────────────────────────────────

const formatDateBR = (date: Date) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(date)

const formatDateTimeBR = (date: Date) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(date)

const formatDateLongBR = (date: Date) =>
  new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(date)

// ─── Função principal ─────────────────────────────────────────────────────────

export async function buildTermoPdf(params: BuildTermoPdfParams) {
  console.log('[pdf] iniciando geração — layout corporativo v2')

  const signedAt   = params.assinadoEm ?? new Date()
  const metadata   = parseTermMetadata(params.texto)
  const cleanText  = stripHtml(params.texto)
  const fallbackItems = extractTableItems(params.texto)
  const items      = (params.itens?.length ? params.itens
    : metadata.itens?.length ? metadata.itens
    : fallbackItems).map(normalizeItem)

  // ── Dados da empresa: prioriza empresaData (banco), depois campos legados ──
  const ed = params.empresaData
  // Usa apenas razão social como nome da empresa em todo o documento
  const razaoSocial     = normalizarTexto(ed?.razaoSocial || params.empresa || metadata.empresa || extractCompanyFromHtml(params.texto) || 'IT Control')
  const cnpjEmpresa     = normalizarTexto(ed?.cnpj          || params.cnpjEmpresa || metadata.cnpjEmpresa || 'CNPJ nao informado')
  const repNome         = normalizarTexto(ed?.representanteNome  || '')
  const repCargo        = normalizarTexto(ed?.representanteCargo || '')
  const usarLogo        = ed?.usarLogoNoPdf        ?? true
  const exibirCargo     = ed?.exibirCargoRepresentante ?? true
  const assinaturaAuto  = ed?.assinaturaAutomatica  ?? false
  const mostrarEndereco = ed?.mostrarEnderecoNoTermo ?? true

  // Monta endereço completo a partir dos campos individuais ou campo legado
  let enderecoEmpresa: string
  if (ed && (ed.rua || ed.cidade)) {
    const parts: string[] = []
    if (ed.rua)        parts.push(ed.numero ? `${ed.rua}, ${ed.numero}` : ed.rua)
    if (ed.complemento) parts.push(ed.complemento)
    if (ed.bairro)     parts.push(ed.bairro)
    if (ed.cidade)     parts.push(ed.estado ? `${ed.cidade}-${ed.estado}` : ed.cidade)
    if (ed.cep)        parts.push(ed.cep)
    enderecoEmpresa = normalizarTexto(parts.join(', '))
  } else {
    enderecoEmpresa = normalizarTexto(ed?.endereco || params.enderecoEmpresa || metadata.enderecoEmpresa || 'Endereco nao informado')
  }

  const setores      = params.setores?.length ? params.setores : metadata.setores
  const dataEmissao  = params.dataEntrega || metadata.dataEntrega || formatDateBR(new Date())

  const payloadHash = createHash('sha256')
    .update(JSON.stringify({ termoId: params.termoId, signedAt: signedAt.toISOString(), signer: params.assinaturaTexto ?? '', texto: cleanText, items }))
    .digest('hex')

  // ── Setup do documento ────────────────────────────────────────────────────
  const doc    = await PDFDocument.create()
  const font   = await doc.embedFont(StandardFonts.Helvetica)
  const bold   = await doc.embedFont(StandardFonts.HelveticaBold)
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique)

  let page = doc.addPage([PAGE.width, PAGE.height])
  let y    = PAGE.height - PAGE.marginTop
  const pages: PDFPage[] = [page]

  const contentWidth = PAGE.width - PAGE.marginX * 2
  const bottomLimit  = PAGE.marginBottom + 25

  console.log('[pdf] documento criado')

  // ── Helpers de desenho ────────────────────────────────────────────────────

  const addPage = () => {
    page = doc.addPage([PAGE.width, PAGE.height])
    pages.push(page)
    y = PAGE.height - PAGE.marginTop
  }

  const ensureSpace = (height: number) => {
    if (y - height < bottomLimit) addPage()
  }

  const drawText = (text: string, x: number, baseline: number, size: number, f: PDFFont, color = C.ink) =>
    page.drawText(text, { x, y: baseline, size, font: f, color })

  // Parágrafo com quebra de linha automática
  const writeParagraph = (
    text: string,
    opts: { size?: number; bold?: boolean; italic?: boolean; color?: ReturnType<typeof rgb>; align?: 'left' | 'center'; lineGap?: number; width?: number; x?: number } = {}
  ) => {
    const size    = opts.size ?? 10
    const f       = opts.bold ? bold : opts.italic ? italic : font
    const lineGap = opts.lineGap ?? 4.5
    const maxW    = opts.width ?? contentWidth
    const x       = opts.x ?? PAGE.marginX
    for (const line of wrapText(text, f, size, maxW)) {
      ensureSpace(size + lineGap)
      const lx = opts.align === 'center' ? PAGE.marginX + (contentWidth - f.widthOfTextAtSize(line, size)) / 2 : x
      drawText(line, lx, y, size, f, opts.color)
      y -= size + lineGap
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1. CABEÇALHO — estilo similar ao PDF modelo (logo à esq., dados à dir.)
  // ─────────────────────────────────────────────────────────────────────────

  const drawHeader = async () => {
    const headerTop    = y
    const logoAreaW    = 120
    const textAreaX    = PAGE.marginX + logoAreaW + 14
    const textAreaW    = contentWidth - logoAreaW - 14

    // Tenta carregar logo da empresa
    let logoEmbedded = false
    if (usarLogo && ed?.logoUrl) {
      try {
        const res = await fetch(ed.logoUrl)
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer()
          const bytes = Buffer.from(arrayBuffer)
          const isJpeg = ed.logoUrl.toLowerCase().endsWith('.jpg') || ed.logoUrl.toLowerCase().endsWith('.jpeg')
          const image  = isJpeg ? await doc.embedJpg(bytes) : await doc.embedPng(bytes)
          const maxH   = 48
          const maxW   = logoAreaW - 8
          const scale  = Math.min(maxW / image.width, maxH / image.height, 1)
          const iw     = image.width * scale
          const ih     = image.height * scale
          page.drawImage(image, { x: PAGE.marginX + 4, y: headerTop - ih - 4, width: iw, height: ih })
          logoEmbedded = true
        }
      } catch {
        // Fallback para texto se imagem falhar
      }
    }

    // Fallback: bloco textual com razão social se não tiver logo ou falhar
    if (!logoEmbedded) {
      const logoBoxH = 48
      page.drawRectangle({ x: PAGE.marginX, y: headerTop - logoBoxH, width: logoAreaW, height: logoBoxH, color: C.tableHdr })
      const displayName = razaoSocial.length > 10 ? razaoSocial.slice(0, 10) : razaoSocial
      drawText(displayName, PAGE.marginX + 8, headerTop - 20, 13, bold, C.white)
      drawText('TI', PAGE.marginX + 8, headerTop - 36, 9, font, rgb(0.7, 0.75, 0.8))
    }

    // Dados da empresa à direita — exibe apenas razão social
    let hy = headerTop - 22
    drawText(razaoSocial, textAreaX, hy, 12.5, bold, C.black)
    hy -= 15

    drawText(`CNPJ: ${cnpjEmpresa}`, textAreaX, hy, 9, font, C.muted)
    hy -= 13

    if (mostrarEndereco && enderecoEmpresa && enderecoEmpresa !== 'Endereço não informado') {
      // Quebra o endereço se muito longo
      const endLines = wrapText(enderecoEmpresa, font, 8.5, textAreaW)
      for (const line of endLines) {
        drawText(line, textAreaX, hy, 8.5, font, C.faint)
        hy -= 12
      }
    }

    // Linha separadora abaixo do cabeçalho
    const headerBottom = Math.min(headerTop - 56, hy - 6)
    page.drawLine({
      start: { x: PAGE.marginX, y: headerBottom },
      end:   { x: PAGE.width - PAGE.marginX, y: headerBottom },
      thickness: 1.2,
      color: C.tableHdr,
    })

    y = headerBottom - 18
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. TÍTULO DO DOCUMENTO
  // ─────────────────────────────────────────────────────────────────────────

  const drawDocTitle = () => {
    y -= 12
    writeParagraph('TERMO DE RESPONSABILIDADE E CESSão DE EQUIPAMENTOS', {
      size: 14, bold: true, align: 'center', color: C.black, lineGap: 6,
    })
    y -= 6
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. PARÁGRAFO INTRODUTÓRIO
  // ─────────────────────────────────────────────────────────────────────────

  const drawIntroduction = () => {
    const repPart = repNome ? `, representada por ${repNome}${exibirCargo && repCargo ? `, ${repCargo}` : ''}` : ''
    writeParagraph(
      `Pelo presente termo, a empresa ${razaoSocial}, inscrita no CNPJ ${cnpjEmpresa}${mostrarEndereco && enderecoEmpresa && enderecoEmpresa !== 'Endereco nao informado' ? `, com sede em ${enderecoEmpresa}` : ''}${repPart}, doravante denominada CEDENTE, cede ao colaborador abaixo qualificado os equipamentos relacionados neste termo para utilização exclusiva no desempenho de suas atividades profissionais.`,
      { size: 10, lineGap: 5.5 }
    )
    y -= 8
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. CABEÇALHO DE SEÇÃO
  // ─────────────────────────────────────────────────────────────────────────

  const sectionTitle = (title: string) => {
    y -= 4
    ensureSpace(28)
    // Barra lateral preta + título em negrito — estilo do PDF modelo
    page.drawRectangle({ x: PAGE.marginX, y: y - 16, width: 4, height: 22, color: C.tableHdr })
    page.drawRectangle({ x: PAGE.marginX + 4, y: y - 16, width: contentWidth - 4, height: 22, color: C.infoBox, borderColor: C.borderLight, borderWidth: 0.5 })
    drawText(title.toUpperCase(), PAGE.marginX + 14, y - 8, 9.5, bold, C.black)
    y -= 26
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. DADOS DO COLABORADOR — bloco visual inspirado no PDF modelo
  // ─────────────────────────────────────────────────────────────────────────

  const drawCollaboratorBlock = () => {
    const rows: Array<[string, string]> = [
      ['Nome:',           normalizarTexto(params.colaborador || '-')],
      ['E-mail:',         normalizarTexto(params.colaboradorEmail || '-')],
      ['Setor:',          normalizarTexto(setores?.join(', ') || '-')],
      ['Data de emissao:', dataEmissao],
    ]

    const labelW  = 110
    const valueW  = contentWidth - labelW
    const rowH    = 24
    const totalH  = rows.length * rowH

    ensureSpace(totalH + 8)

    // Borda externa do bloco
    page.drawRectangle({
      x: PAGE.marginX, y: y - totalH,
      width: contentWidth, height: totalH,
      borderColor: C.infoBoxBdr, borderWidth: 0.8,
    })

    rows.forEach(([label, value], i) => {
      const ry = y - i * rowH
      // Separador horizontal (exceto último)
      if (i > 0) {
        page.drawLine({ start: { x: PAGE.marginX, y: ry }, end: { x: PAGE.marginX + contentWidth, y: ry }, thickness: 0.5, color: C.borderLight })
      }
      // Fundo do label
      page.drawRectangle({ x: PAGE.marginX, y: ry - rowH, width: labelW, height: rowH, color: C.infoBox })
      // Separador vertical
      page.drawLine({ start: { x: PAGE.marginX + labelW, y: ry }, end: { x: PAGE.marginX + labelW, y: ry - rowH }, thickness: 0.5, color: C.infoBoxBdr })

      drawText(label, PAGE.marginX + 8, ry - 14, 9, bold, C.ink)
      // Trunca valor se muito longo
      const maxValueW = valueW - 16
      let displayValue = value
      while (displayValue.length > 4 && font.widthOfTextAtSize(displayValue, 9.5) > maxValueW) {
        displayValue = displayValue.slice(0, -4) + '...'
      }
      drawText(displayValue, PAGE.marginX + labelW + 10, ry - 14, 9.5, font, C.ink)
    })

    y -= totalH + 35
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. TABELA DE EQUIPAMENTOS — estilo do PDF modelo
  //    Colunas: Patrimônio | Tipo | Marca | Modelo
  // ─────────────────────────────────────────────────────────────────────────

  const drawEquipmentTable = () => {
    // Removido: Descrição, Código interno, Categoria, Informações técnicas
    // Exibido: Patrimônio | Tipo | Marca 
    const headers = ['Patrimonio', 'Tipo', 'Marca']
    const widths = [90, 130, contentWidth - 220]  // soma = contentWidth
    const hdrH    = 26
    const rowPad  = 7

    const drawTableHeader = () => {
      ensureSpace(hdrH + 8)
      // Cabeçalho com fundo escuro (igual ao PDF modelo)
      page.drawRectangle({ x: PAGE.marginX, y: y - hdrH + 4, width: contentWidth, height: hdrH, color: C.tableHdr })
      let x = PAGE.marginX
      headers.forEach((hdr, idx) => {
        if (idx > 0) page.drawLine({ start: { x, y: y + 4 }, end: { x, y: y - hdrH + 4 }, thickness: 0.6, color: rgb(0.4, 0.4, 0.4) })
        drawText(hdr, x + 7, y - 12, 8.5, bold, C.white)
        x += widths[idx]
      })
      y -= hdrH
    }

    drawTableHeader()

    if (!items.length) {
      ensureSpace(28)
      page.drawRectangle({ x: PAGE.marginX, y: y - 22 + 4, width: contentWidth, height: 22, color: C.infoBox, borderColor: C.borderLight, borderWidth: 0.6 })
      drawText('Nenhum equipamento vinculado ao termo.', PAGE.marginX + 8, y - 9, 9, italic, C.muted)
      y -= 26
      return
    }

    items.forEach((item, rowIdx) => {
      // Usa: etiqueta=patrimônio, tipo, marca
      const cells    = [item.etiqueta, item.tipo, item.marca ?? '-']
      const wrapped  = cells.map((v, i) => wrapText(v || '-', font, 8.5, widths[i] - rowPad * 2))
      const rowH     = Math.max(24, Math.max(...wrapped.map((l) => l.length)) * 11 + 10)

      if (y - rowH < bottomLimit) { addPage(); drawTableHeader() }

      const bg = rowIdx % 2 === 0 ? C.white : C.tableAlt
      page.drawRectangle({ x: PAGE.marginX, y: y - rowH + 4, width: contentWidth, height: rowH, color: bg, borderColor: C.borderLight, borderWidth: 0.5 })

      let x = PAGE.marginX
      wrapped.forEach((lines, idx) => {
        if (idx > 0) page.drawLine({ start: { x, y: y + 4 }, end: { x, y: y - rowH + 4 }, thickness: 0.4, color: C.borderLight })
        lines.slice(0, Math.floor((rowH - 6) / 11)).forEach((line, li) =>
          drawText(line, x + rowPad, y - 10 - li * 11, 8.5, font, C.ink)
        )
        x += widths[idx]
      })
      y -= rowH
    })
    y -= 35
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 7. CLÁUSULAS
  // ─────────────────────────────────────────────────────────────────────────

  const drawClauses = () => {
    const estimateClauseHeight = (title: string, body: string) => {
      const titleLines = wrapText(title, bold, 10, contentWidth)
      const bodyLines  = wrapText(body, font, 9.5, contentWidth - 12)

      const titleH = titleLines.length * 14
      const bodyH  = bodyLines.length * 13

      return titleH + bodyH + 20
    }
    const clauses: Array<[string, string]> = [

      [
        '1. Finalidade',
        'Os equipamentos ora cedidos destinam-se exclusivamente à execução das atividades laborais do colaborador, sendo vedada sua utilização para fins pessoais.'
      ],
      [
        '2. Proibição de Troca',
        'É expressamente proibida a troca, empréstimo, doação ou qualquer forma de cessão dos equipamentos entre colaboradores ou prestadores de serviços, sem prévia autorização formal da empresa.'
      ],
      [
        '3. Responsabilidade',
        'O colaborador compromete-se a zelar pela correta utilização e conservação dos equipamentos, responsabilizando-se por quaisquer danos decorrentes de uso indevido, negligência, perda ou extravio.'
      ],
      [
        '4. Manutenção e Suporte',
        'A manutenção dos equipamentos será de responsabilidade da empresa, exceto nos casos de mau uso devidamente comprovado. A empresa poderá realizar vistorias periódicas, a seu critério, para verificar as condições de uso e conservação dos equipamentos.'
      ],
      [
        '5. Perda, Roubo, Furto ou Extravio',
        'Em caso de perda, roubo, furto, extravio ou danos irreversíveis decorrentes de uso indevido, negligência ou má-fé, o colaborador deverá ressarcir a empresa pelo valor de mercado correspondente ao bem.'
      ],
      [
        '6. Devolução',
        'Os equipamentos deverão ser devolvidos nas mesmas condições em que foram entregues, ressalvado o desgaste natural decorrente do uso regular, sempre que solicitado pela empresa ou em caso de desligamento, rescisão contratual ou encerramento da prestação de serviços.'
      ],
      [
        '7. Penalidades',
        'O descumprimento das obrigações previstas neste termo poderá acarretar a aplicação de medidas disciplinares, bem como a obrigação de ressarcimento dos prejuízos causados, observadas as disposições legais e contratuais aplicáveis.'
      ]
    ]

      // garante espaço para o título + primeira cláusula
    const firstClauseHeight = estimateClauseHeight(
      clauses[0][0],
      clauses[0][1]
    )
    ensureSpace(firstClauseHeight + 40)
    sectionTitle('Clausulas Gerais')

    clauses.forEach(([title, body]) => {
      const neededHeight = estimateClauseHeight(title, body)
      ensureSpace(neededHeight)
      y -= 10
      writeParagraph(title, { size: 10, bold: true, color: C.black, lineGap: 3 })
      writeParagraph(body, { size: 9.5, color: C.ink, lineGap: 5, x: PAGE.marginX + 12, width: contentWidth - 12 })
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 8. BLOCO DE ASSINATURAS — estilo do PDF modelo
  //    Coluna esq: empresa + assinatura automática da representante
  //    Coluna dir: colaborador + assinatura desenhada/digitada
  // ─────────────────────────────────────────────────────────────────────────

 const drawSignatureBlock = async () => {
  const signatureBlockHeight = 320

    ensureSpace(signatureBlockHeight)

    sectionTitle('Assinaturas')
    y -= 15

    const localDataTexto = `São Paulo - SP, ${formatDateLongBR(signedAt)}.`

    drawText(localDataTexto, PAGE.marginX + (contentWidth - font.widthOfTextAtSize(localDataTexto, 10)) / 2, y, 10, font, C.muted)

    y -= 10

    const colGap  = 24
    const colW    = (contentWidth - colGap) / 2
    const leftX   = PAGE.marginX
    const rightX  = PAGE.marginX + colW + colGap
    const lineY   = y

    // ── Assinatura da empresa (coluna esquerda) ──────────────────────────────

    // Tenta exibir imagem de assinatura da representante (assinaturaAutomatica)
    let repSigEmbedded = false
    if (assinaturaAuto && ed?.assinaturaUrl) {
      try {
        const res = await fetch(ed.assinaturaUrl)
        if (res.ok) {
          const ab    = await res.arrayBuffer()
          const bytes = Buffer.from(ab)
          const image = ed.assinaturaUrl.toLowerCase().endsWith('.jpg') || ed.assinaturaUrl.toLowerCase().endsWith('.jpeg')
            ? await doc.embedJpg(bytes)
            : await doc.embedPng(bytes)
          const maxH  = 52
          const maxW  = colW - 16
          const scale = Math.min(maxW / image.width, maxH / image.height, 1)
          const iw    = image.width * scale
          const ih    = image.height * scale
          page.drawImage(image, { x: leftX + (colW - iw) / 2, y: lineY - ih - 15, width: iw, height: ih })
          repSigEmbedded = true
        }
      } catch { /* silencioso */ }
    }

    if (!repSigEmbedded && repNome) {
      // Exibe nome da representante em itálico como assinatura visual
      const sigText = normalizarTexto(repNome)
      drawText(sigText, leftX + (colW - italic.widthOfTextAtSize(sigText, 14)) / 2, lineY - 60, 14, italic, C.ink)
    }

    // Linha e rótulo empresa
    page.drawLine({ start: { x: leftX, y: lineY - 64 }, end: { x: leftX + colW, y: lineY - 64 }, thickness: 0.8, color: C.border })
    drawText('CEDENTE / EMPRESA', leftX + (colW - bold.widthOfTextAtSize('CEDENTE / EMPRESA', 8.5)) / 2, lineY - 76, 8.5, bold, C.black)

    if (repNome) {
      const repLabel = `(${repNome}${exibirCargo && repCargo ? ` — ${repCargo}` : ''})`
      drawText(repLabel, leftX + (colW - font.widthOfTextAtSize(repLabel, 8)) / 2, lineY - 88, 8, font, C.muted)
    }

    // ── Assinatura do colaborador (coluna direita) ────────────────────────────

    if (params.assinaturaImagemDataUrl?.startsWith('data:image/')) {
      const base64 = params.assinaturaImagemDataUrl.split(',')[1] ?? ''
      const bytes  = Buffer.from(base64, 'base64')
      const image  = params.assinaturaImagemDataUrl.includes('image/png')
        ? await doc.embedPng(bytes)
        : await doc.embedJpg(bytes)
      const maxH   = 40
      const maxW   = colW - 16
      const scale  = Math.min(maxW / image.width, maxH / image.height, 1)
      const iw     = image.width * scale
      const ih     = image.height * scale
      page.drawImage(image, { x: rightX + (colW - iw) / 2, y: lineY - ih - 22, width: iw, height: ih })
    } else {
      // Assinatura digitada
      const typedName = normalizarTexto(params.assinaturaTexto || params.colaborador || '-')
      drawText(typedName, rightX + (colW - italic.widthOfTextAtSize(typedName, 14)) / 2, lineY - 60, 14, italic, C.ink)
    }

    // Linha e rótulo colaborador
    page.drawLine({ start: { x: rightX, y: lineY - 64 }, end: { x: rightX + colW, y: lineY - 64 }, thickness: 0.8, color: C.border })
    drawText('CESSIONARIO(A) / COLABORADOR', rightX + (colW - bold.widthOfTextAtSize('CESSIONARIO(A) / COLABORADOR', 8.5)) / 2, lineY - 76, 8.5, bold, C.black)
    drawText(`Nome: ${normalizarTexto(params.assinaturaTexto || params.colaborador || '-')}`, rightX + (colW - font.widthOfTextAtSize(params.assinaturaTexto || params.colaborador || '-', 8.5)) / 2, lineY - 89, 8.5, font, C.ink)
    drawText(`Data: ${formatDateTimeBR(signedAt)}`, rightX + (colW - font.widthOfTextAtSize(formatDateTimeBR(signedAt), 8.5)) / 2, lineY - 103, 8.5, font, C.ink)

    y = lineY - 120
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 9. RODAPÉ EM TODAS AS PÁGINAS
  // ─────────────────────────────────────────────────────────────────────────

  const applyFooters = () => {
    pages.forEach((p, i) => {
      // Linha de rodapé
      p.drawLine({ start: { x: PAGE.marginX, y: 38 }, end: { x: PAGE.width - PAGE.marginX, y: 38 }, thickness: 0.5, color: C.borderLight })
      // Nome empresa à esquerda
      p.drawText(razaoSocial + ' • Termo de Responsabilidade e Cessao de Equipamentos', { x: PAGE.marginX, y: 24, size: 7.5, font, color: C.faint })
      // Número da página à direita
      p.drawText(`Pagina ${i + 1} de ${pages.length}`, { x: PAGE.width - PAGE.marginX - 60, y: 24, size: 7.5, font, color: C.faint })
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MONTAGEM DO DOCUMENTO
  // ─────────────────────────────────────────────────────────────────────────

  await drawHeader()
  drawDocTitle()
  drawIntroduction()

  sectionTitle('Dados do Colaborador')
  drawCollaboratorBlock()

  sectionTitle('Equipamentos Cedidos')
  drawEquipmentTable()
  console.log('[pdf] tabela de equipamentos renderizada')

  drawClauses()
  
  y -= 20
  // Observações opcionais
  if (params.observacoes || metadata.observacoes || params.dataDevolucao || metadata.dataDevolucao) {
    sectionTitle('Observacoes Complementares')
    if (params.dataDevolucao || metadata.dataDevolucao)
      writeParagraph(`Data prevista de devolucao: ${params.dataDevolucao || metadata.dataDevolucao}`, { size: 10 })
    if (params.observacoes || metadata.observacoes)
      writeParagraph(params.observacoes || metadata.observacoes || '-', { size: 10 })
  }

  console.log('[pdf] desenhando bloco de assinaturas')
  await drawSignatureBlock()
  console.log('[pdf] bloco de assinaturas desenhado')

  // Linha de auditoria (discreta)
  const auditoriaBase =
    `Auditoria: ID ${params.termoId} | Hash ${payloadHash.slice(0, 32)}... | Gerado em ${new Date().toISOString()}`

  writeParagraph(auditoriaBase, {
    size: 7.5,
    color: C.faint,
    lineGap: 2
  })

  writeParagraph(
    `IP: ${normalizarTexto(params.assinadorIp || '-')}`,
    {
      size: 7.5,
      color: C.faint,
      lineGap: 2
    }
  )
  applyFooters()

  const pdfBytes = await doc.save()
  const buffer   = Buffer.from(pdfBytes)
  console.log('[pdf] buffer gerado', { bytes: buffer.length })
  return buffer

}
