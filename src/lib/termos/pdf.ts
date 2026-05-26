import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

type TermoItem = { descricao: string; tipo: string; etiqueta: string }

export async function buildTermoPdf(params: {
  titulo: string
  texto: string
  empresa?: string
  colaborador?: string
  setores?: string[]
  dataEntrega?: string
  dataDevolucao?: string
  observacoes?: string
  itens?: TermoItem[]
  assinaturaTexto?: string
  assinadoEm?: Date
}) {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([595, 842])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  page.drawText(params.empresa || 'Empresa', { x: 50, y: 805, size: 14, font: bold, color: rgb(0.1, 0.1, 0.1) })
  page.drawText(params.titulo, { x: 50, y: 780, size: 15, font: bold, color: rgb(0, 0, 0) })

  let y = 752
  if (params.colaborador) {
    page.drawText(`Colaborador: ${params.colaborador}`, { x: 50, y, size: 11, font })
    y -= 14
  }
  if (params.setores?.length) {
    page.drawText(`Setor(es): ${params.setores.join(', ')}`, { x: 50, y, size: 11, font })
    y -= 14
  }
  if (params.dataEntrega) {
    page.drawText(`Data de entrega: ${params.dataEntrega}`, { x: 50, y, size: 11, font })
    y -= 14
  }
  if (params.dataDevolucao) {
    page.drawText(`Data prevista de devolução: ${params.dataDevolucao}`, { x: 50, y, size: 11, font })
    y -= 14
  }

  y -= 8
  if (params.itens?.length) {
    page.drawText('Equipamentos vinculados', { x: 50, y, size: 12, font: bold })
    y -= 16
    page.drawText('Descrição', { x: 50, y, size: 10, font: bold })
    page.drawText('Tipo', { x: 340, y, size: 10, font: bold })
    page.drawText('Etiqueta', { x: 450, y, size: 10, font: bold })
    y -= 12
    for (const item of params.itens.slice(0, 20)) {
      page.drawText(item.descricao.slice(0, 50), { x: 50, y, size: 10, font })
      page.drawText(item.tipo.slice(0, 20), { x: 340, y, size: 10, font })
      page.drawText(item.etiqueta.slice(0, 18), { x: 450, y, size: 10, font })
      y -= 12
    }
    y -= 8
  }

  const lines = params.texto.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').match(/.{1,92}/g) ?? []
  for (const line of lines.slice(0, 22)) {
    page.drawText(line, { x: 50, y, size: 10, font })
    y -= 13
  }

  if (params.observacoes) {
    y -= 6
    page.drawText(`Observações: ${params.observacoes}`.slice(0, 110), { x: 50, y, size: 10, font })
  }

  if (params.assinaturaTexto) {
    page.drawText(`Assinado por: ${params.assinaturaTexto}`, { x: 50, y: 120, size: 11, font: bold })
    page.drawText(`Data: ${(params.assinadoEm ?? new Date()).toISOString()}`, { x: 50, y: 104, size: 10, font })
  }
  return Buffer.from(await pdf.save())
}
