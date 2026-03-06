import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TI Assets — Controle de Ativos',
  description: 'Sistema profissional de controle de ativos e estoque de TI',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
