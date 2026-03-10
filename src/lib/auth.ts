import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

function CustomPrismaAdapter(p: PrismaClient) {
  const adapter = PrismaAdapter(p) as Record<string, unknown>
  const base = adapter as {
    createUser: (data: unknown) => unknown
    getUser: (id: string) => unknown
    getUserByEmail: (email: string) => unknown
    getUserByAccount: (data: unknown) => unknown
    updateUser: (data: unknown) => unknown
    linkAccount: (data: unknown) => unknown
    createSession: (data: unknown) => unknown
    getSessionAndUser: (token: string) => unknown
    updateSession: (data: unknown) => unknown
    deleteSession: (token: string) => unknown
  }
  return {
    ...base,
    createUser: (data: unknown) => p.usuario.create({ data: data as never }),
    getUser: (id: string) => p.usuario.findUnique({ where: { id } }),
    getUserByEmail: (email: string) => p.usuario.findUnique({ where: { email } }),
    getUserByAccount: async ({ providerAccountId, provider }: { providerAccountId: string; provider: string }) => {
      const account = await p.account.findUnique({
        where: { provider_providerAccountId: { provider, providerAccountId } },
        include: { user: true },
      })
      return account?.user ?? null
    },
    updateUser: ({ id, ...data }: { id: string }) => p.usuario.update({ where: { id }, data }),
    linkAccount: (data: unknown) => p.account.create({ data: data as never }),
    createSession: (data: unknown) => p.session.create({ data: data as never }),
    getSessionAndUser: async (sessionToken: string) => {
      const s = await p.session.findUnique({ where: { sessionToken }, include: { user: true } })
      if (!s) return null
      return { session: s, user: s.user }
    },
    updateSession: ({ sessionToken, ...data }: { sessionToken: string }) => p.session.update({ where: { sessionToken }, data }),
    deleteSession: (sessionToken: string) => p.session.delete({ where: { sessionToken } }),
  }
}

export const authOptions: NextAuthOptions = {
  adapter: CustomPrismaAdapter(prisma) as never,
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
        if (dbUser) token.perfil = dbUser.perfil
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
  },
  events: {
    async createUser({ user }) {
      const count = await prisma.usuario.count()
      await prisma.usuario.update({
        where: { id: user.id },
        data: { perfil: count === 1 ? 'admin' : 'usuario', ativo: count === 1 },
      })
    },
  },
  pages: { signIn: '/login', error: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
}
