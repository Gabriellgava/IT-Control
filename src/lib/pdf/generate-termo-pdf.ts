const chromium = require('@sparticuz/chromium')
const puppeteer = require('puppeteer-core')

export async function generateTermoPdf(html: string): Promise<Buffer> {
  console.log('[pdf/generate-termo-pdf] início geração PDF')

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  })

  const page = await browser.newPage()

  await page.setContent(html, {
    waitUntil: 'networkidle0',
  })

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

  await browser.close()

  console.log('[pdf/generate-termo-pdf] PDF gerado com sucesso')

  return Buffer.from(pdf)
}
