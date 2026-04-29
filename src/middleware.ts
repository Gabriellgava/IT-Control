import { withAuth } from 'next-auth/middleware'

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const pathname = req.nextUrl.pathname

      if (pathname.startsWith('/api/auth')) return true
      if (!token || token.bloqueado) return false
      if (pathname.startsWith('/api/admin')) return token.perfil === 'admin'

      return true
    },
  },
})

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/produtos/:path*',
    '/movimentacoes/:path*',
    '/fornecedores/:path*',
    '/admin/:path*',
    '/inventario/:path*',
    '/api/:path*',
  ],
}
