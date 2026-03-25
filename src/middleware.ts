export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/produtos/:path*',
    '/movimentacoes/:path*',
    '/fornecedores/:path*',
    '/admin/:path*',
    '/inventario/:path*',
  ],
}
