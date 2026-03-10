export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/ativos/:path*',
    '/movimentacoes/:path*',
    '/fornecedores/:path*',
    '/admin/:path*',
  ],
}
