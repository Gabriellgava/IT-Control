import { Buffer } from 'node:buffer'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

const PDF_TAG = '[pdf/generate-termo-pdf]'

export async function generateTermoPdf(html: string): Promise<Buffer> {
  console.log(`${PDF_TAG} início geração PDF`, { htmlLength: html.length })

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null

  try {
    const executablePath = await chromium.executablePath()
    browser = await puppeteer.launch({
      args: [...chromium.args, '--disable-dev-shm-usage', '--font-render-hinting=none'],
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless
    })

    console.log(`${PDF_TAG} chromium iniciado`, { executablePath })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: ['domcontentloaded', 'networkidle0'] })
    console.log(`${PDF_TAG} HTML carregado`)

    const pdfUint8 = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate:
        '<div style="width:100%;font-size:9px;padding:0 14mm;color:#4B5563;display:flex;justify-content:space-between;">' +
        '<span>FAST GAMING S.A. • Documento Corporativo</span><span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>',
      margin: { top: '16mm', right: '10mm', bottom: '18mm', left: '10mm' }
    })

    console.log(`${PDF_TAG} PDF gerado`)

    const buffer = Buffer.from(pdfUint8)
    console.log(`${PDF_TAG} tamanho do buffer`, { bytes: buffer.length })

    return buffer
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}
