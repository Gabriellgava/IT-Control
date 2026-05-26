import { Buffer } from 'node:buffer'

export const runtime = 'nodejs'

const PDF_TAG = '[pdf/generate-termo-pdf]'

export async function generateTermoPdf(html: string): Promise<Buffer> {
  console.log(`${PDF_TAG} início geração PDF`)

  if (!html || typeof html !== 'string') {
    throw new Error('HTML inválido para geração de PDF')
  }

  // require() evita o bundle ESM do puppeteer-core no build do Next.js (App Router/Vercel)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const chromium = require('@sparticuz/chromium') as typeof import('@sparticuz/chromium')
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const puppeteer = require('puppeteer-core') as typeof import('puppeteer-core')

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless
  })

  console.log(`${PDF_TAG} chromium iniciado`)

  try {
    const page = await browser.newPage()

    await page.setContent(html, { waitUntil: ['domcontentloaded', 'networkidle0'] })
    console.log(`${PDF_TAG} HTML carregado`)

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: true,
      margin: {
        top: '20mm',
        right: '12mm',
        bottom: '20mm',
        left: '12mm'
      }
    })

    console.log(`${PDF_TAG} PDF gerado`)
    const buffer = Buffer.from(pdf)
    console.log(`${PDF_TAG} tamanho do buffer`, { bytes: buffer.length })

    return buffer
  } finally {
    await browser.close()
  }
}
