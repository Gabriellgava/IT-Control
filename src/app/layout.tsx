import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Estoque TI',
  description: 'Sistema de controle de ativos e estoque de TI',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
