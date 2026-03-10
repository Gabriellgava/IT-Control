import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  adapter: {
    createUser: async (data: Record<string, unknown>) => {
      const count = await prisma.usuario.count()
      const user = await prisma.usuario.create({
        data: {
          nome: data.name as string ?? null,
          email: data.email as string,
          emailVerified: data.emailVerified as Date ?? null,
          image: data.image as string ?? null,
          perfil: count === 0 ? 'admin' : 'usuario',
          ativo: count === 0,
        },
      })
      return { id: user.id, name: user.nome, email: user.email!, emailVerified: user.emailVerified, image: user.image }
    },
    getUser: async (id: string) => {
      const u = await prisma.usuario.findUnique({ where: { id } })
      if (!u) return null
      return { id: u.id, name: u.nome, email: u.email!, emailVerified: u.emailVerified, image: u.image }
    },
    getUserByEmail: async (email: string) => {
      const u = await prisma.usuario.findUnique({ where: { email } })
      if (!u) return null
      return { id: u.id, name: u.nome, email: u.email!, emailVerified: u.emailVerified, image: u.image }
    },
    getUserByAccount: async ({ providerAccountId, provider }: { providerAccountId: string; provider: string }) => {
      const account = await prisma.account.findUnique({
        where: { provider_providerAccountId: { provider, providerAccountId } },
        include: { user: true },
      })
      if (!account) return null
      const u = account.user
      return { id: u.id, name: u.nome, email: u.email!, emailVerified: u.emailVerified, image: u.image }
    },
    updateUser: async ({ id, name, ...data }: Record<string, unknown>) => {
      const u = await prisma.usuario.update({ where: { id: id as string }, data: { nome: name as string, ...data } })
      return { id: u.id, name: u.nome, email: u.email!, emailVerified: u.emailVerified, image: u.image }
    },
    linkAccount: (data: Record<string, unknown>) => prisma.account.create({ data: data as never }) as never,
    createSession: (data: Record<string, unknown>) => prisma.session.create({ data: data as never }),
    getSessionAndUser: async (sessionToken: string) => {
      const s = await prisma.session.findUnique({ where: { sessionToken }, include: { user: true } })
      if (!s) return null
      const u = s.user
      return { session: { sessionToken: s.sessionToken, userId: s.userId, expires: s.expires }, user: { id: u.id, name: u.nome, email: u.email!, emailVerified: u.emailVerified, image: u.image } }
    },
    updateSession: ({ sessionToken, ...data }: Record<string, unknown>) => prisma.session.update({ where: { sessionToken: sessionToken as string }, data }),
    deleteSession: (sessionToken: string) => prisma.session.delete({ where: { sessionToken } }),
  } as never,
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
          if (!dbUser.ativo) return { ...token, error: 'inactive' }
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token.error === 'inactive') throw new Error('inactive')
      if (session.user) {
        session.user.id = token.id as string
        session.user.perfil = token.perfil as string
      }
      return session
    },
  },
  pages: { signIn: '/login', error: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
}
