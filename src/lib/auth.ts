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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.perfil = (user as { perfil?: string }).perfil
      }
      if (token.id) {
        const dbUser = await prisma.usuario.findUnique({ where: { id: token.id as string } })
        if (dbUser) {
          token.perfil = dbUser.perfil
          token.ativo = dbUser.ativo
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.perfil = token.perfil as string
      }
      return session
    },
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        try {
          const existing = await prisma.usuario.findUnique({ where: { email: user.email! } })
          if (existing) {
            if (!existing.ativo) return false
            if (!existing.perfil) {
              const count = await prisma.usuario.count()
              await prisma.usuario.update({
                where: { id: existing.id },
                data: { perfil: count === 1 ? 'admin' : 'usuario', ativo: true },
              })
            }
          }
        } catch (e) {
          console.error('signIn error:', e)
        }
      }
      return true
    },
  },
  events: {
    async createUser({ user }) {
      const count = await prisma.usuario.count()
      await prisma.usuario.update({
        where: { id: user.id },
        data: {
          perfil: count === 1 ? 'admin' : 'usuario',
          ativo: count === 1 ? true : false,
        },
      })
    },
  },
  pages: { signIn: '/login', error: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
}
