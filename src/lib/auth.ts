import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as never,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await prisma.usuario.findUnique({ where: { email: credentials.email } })
        if (!user || !user.senha || !user.ativo) return null
        const ok = await bcrypt.compare(credentials.password, user.senha)
        if (!ok) return null
        return { id: user.id, email: user.email!, name: user.nome, image: user.image, perfil: user.perfil }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user, account }) {
      // Na primeira vez que o user loga, salva os dados no token
      if (user) {
        token.id = user.id
        token.perfil = (user as { perfil?: string }).perfil
      }
      // Para Google, busca o usuário pelo email para garantir o id correto do banco
      if (account?.provider === 'google' && token.email) {
        const dbUser = await prisma.usuario.findUnique({ where: { email: token.email as string } })
        if (dbUser) {
          token.id = dbUser.id
          token.perfil = dbUser.perfil
          token.name = dbUser.nome
          token.picture = dbUser.image
        }
      }
      // Sempre atualiza perfil do banco para refletir mudanças feitas pelo admin
      if (token.id) {
        const dbUser = await prisma.usuario.findUnique({ where: { id: token.id as string } })
        if (dbUser) {
          token.perfil = dbUser.perfil
          token.name = dbUser.nome
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.perfil = token.perfil as string
        session.user.name = token.name as string
      }
      return session
    },
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const existing = await prisma.usuario.findUnique({ where: { email: user.email! } })
        if (!existing) {
          const count = await prisma.usuario.count()
          await prisma.usuario.update({
            where: { email: user.email! },
            data: { perfil: count === 0 ? 'admin' : 'usuario', ativo: count === 0 },
          })
        }
        if (existing && !existing.ativo) return false
      }
      return true
    },
  },
  pages: { signIn: '/login', error: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
}
