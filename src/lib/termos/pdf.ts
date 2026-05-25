import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export async function buildTermoPdf(params: { titulo: string; texto: string; assinaturaTexto?: string; assinadoEm?: Date }) {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([595, 842])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  page.drawText(params.titulo, { x: 50, y: 790, size: 16, font: bold, color: rgb(0, 0, 0) })
  const lines = params.texto.replace(/<[^>]+>/g, '').match(/.{1,95}/g) ?? []
  let y = 760
  for (const line of lines.slice(0, 80)) {
    page.drawText(line, { x: 50, y, size: 11, font })
    y -= 14
  }
  if (params.assinaturaTexto) {
    page.drawText(`Assinado por: ${params.assinaturaTexto}`, { x: 50, y: 120, size: 11, font: bold })
    page.drawText(`Data: ${(params.assinadoEm ?? new Date()).toISOString()}`, { x: 50, y: 104, size: 10, font })
  }
  return Buffer.from(await pdf.save())
}
