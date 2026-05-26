import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

export async function generateTermoPdf(html: string): Promise<Buffer> {
  console.log('[pdf/generate-termo-pdf] início geração PDF')

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null

  try {
    const executablePath = await chromium.executablePath()

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    })

    console.log('[pdf/generate-termo-pdf] browser iniciado', {
      executablePath,
      headless: chromium.headless,
    })

    const page = await browser.newPage()

    await page.setContent(html, {
      waitUntil: 'networkidle0',
    })

    console.log('[pdf/generate-termo-pdf] página carregada')

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px',
      },
    })

    console.log('[pdf/generate-termo-pdf] PDF gerado')

    return Buffer.from(pdf)
  } finally {
    if (browser) {
      await browser.close()
      console.log('[pdf/generate-termo-pdf] browser fechado')
    }
  }
}
