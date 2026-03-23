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
        // Bloqueia login se inativo ou sem senha
        if (!user || !user.senha) return null
        if (!user.ativo) return null
        const ok = await bcrypt.compare(credentials.password, user.senha)
        if (!ok) return null
        return { id: user.id, email: user.email!, name: user.nome, image: user.image, perfil: user.perfil }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
  async jwt({ token, user, account }) {
    // Quando faz login
    if (user) {
      token.id = user.id
    }

    // Para login com Google, garantir dados do banco
    if (account?.provider === 'google' && token.email) {
      const dbUser = await prisma.usuario.findUnique({
        where: { email: token.email as string },
      })

      if (dbUser) {
        token.id = dbUser.id
        token.name = dbUser.nome
        token.picture = dbUser.image
        token.perfil = dbUser.perfil
        token.ativo = dbUser.ativo
      }
    }

    return token
  },

  async session({ session, token }) {
    if (session.user) {
      session.user.id = token.id as string
      session.user.name = token.name as string
      session.user.perfil = token.perfil as string
    }

    return session
  },

async signIn({ user, account }) {
    if (account?.provider === 'google') {
      const existing = await prisma.usuario.findUnique({
        where: { email: user.email! },
      })

      if (existing && !existing.ativo) {
        return false
      }
    }

    return true
  },
},

pages: {
  signIn: '/login',
  error: '/login',
},

secret: process.env.NEXTAUTH_SECRET,
}