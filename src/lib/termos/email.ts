import nodemailer from 'nodemailer'

export async function enviarEmailAssinatura(params: { to: string; nome: string; link: string; titulo: string }) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SMTP_FROM) {
    throw new Error('Configuração SMTP incompleta. Defina SMTP_HOST, SMTP_USER, SMTP_PASS e SMTP_FROM.')
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })

  await transporter.verify()

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: params.to,
    subject: `Seu termo foi gerado: ${params.titulo}`,
    html: `<p>Olá ${params.nome},</p><p>Seu termo foi gerado.</p><p>Acesse o link abaixo para visualizar e assinar:</p><p><a href="${params.link}">${params.link}</a></p>`,
  })
}
