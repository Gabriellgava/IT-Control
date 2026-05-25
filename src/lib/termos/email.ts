import nodemailer from 'nodemailer'

export async function enviarEmailAssinatura(params: { to: string; nome: string; link: string; titulo: string }) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: params.to,
    subject: `Assinatura pendente: ${params.titulo}`,
    html: `<p>Olá ${params.nome},</p><p>Assine o termo no link seguro:</p><p><a href="${params.link}">${params.link}</a></p>`,
  })
}
