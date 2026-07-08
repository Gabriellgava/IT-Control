import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL?.toLowerCase().trim()
const SUPER_ADMIN_NAME = 'Gabriel Gava'

function CustomPrismaAdapter(p: any) {
  const adapter = PrismaAdapter(p) as any
  return {
    ...adapter,
    createUser: (data: any) => {
      const { name, ...rest } = data
      return p.usuario.create({ data: { ...rest, nome: name } })
    },
    getUser: (id: string) => p.usuario.findUnique({ where: { id } }),
    getUserByEmail: (email: string) => p.usuario.findUnique({ where: { email } }),
    getUserByAccount: async ({ providerAccountId, provider }: any) => {
      const account = await p.account.findUnique({
        where: { provider_providerAccountId: { provider, providerAccountId } },
        include: { user: true },
      })
      return account?.user ?? null
    },
    updateUser: ({ id, ...data }: any) => {
      const { name, ...rest } = data
      return p.usuario.update({ where: { id }, data: name ? { ...rest, nome: name } : rest })
    },
    linkAccount: (data: any) => p.account.create({ data }),
    createSession: (data: any) => p.session.create({ data }),
    getSessionAndUser: async (sessionToken: string) => {
      const s = await p.session.findUnique({
        where: { sessionToken },
        include: { user: true },
      })
      if (!s) return null
      return { session: s, user: s.user }
    },
    updateSession: ({ sessionToken, ...data }: any) =>
      p.session.update({ where: { sessionToken }, data }),
    deleteSession: (sessionToken: string) =>
      p.session.delete({ where: { sessionToken } }),
  }
}

export const authOptions: NextAuthOptions = {
  adapter: CustomPrismaAdapter(prisma),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: false,
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
        return { id: user.id, email: user.email!, name: user.nome, image: user.image }
      },
    }),
  ],

  session: { strategy: 'jwt' },

  callbacks: {
    async signIn({ user, account }) {
      try {
        const email = user.email?.toLowerCase().trim()
        if (!email) return false

        const dbUser = await prisma.usuario.findUnique({ where: { email } })
        if (!dbUser) return true

        // Somente o usuário principal pode receber admin automaticamente.
        const isSuperAdmin =
          (SUPER_ADMIN_EMAIL && email === SUPER_ADMIN_EMAIL) ||
          (!SUPER_ADMIN_EMAIL && user.name?.trim() === SUPER_ADMIN_NAME)

        if (isSuperAdmin && dbUser.perfil !== 'admin') {
          await prisma.usuario.update({ where: { id: dbUser.id }, data: { perfil: 'admin', ativo: true } })
        }

        // Bloqueia usuário inativo
        if (!dbUser.ativo) return false

        // Salva nome do Google se ainda não tiver
        if (account?.provider === 'google' && user.name && !dbUser.nome) {
          await prisma.usuario.update({ where: { id: dbUser.id }, data: { nome: user.name } })
        }

        return true
      } catch {
        return false
      }
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }

      // Sempre busca perfil e ativo do banco para manter sincronizado
      if (token.id) {
        try {
          const dbUser = await prisma.usuario.findUnique({ where: { id: token.id as string } })
          if (dbUser) {
            token.perfil = dbUser.perfil
            // Bloqueia se inativo
            token.bloqueado = !dbUser.ativo
          }
        } catch {}
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.perfil = (token.perfil as string) ?? 'usuario'
      }
      return session
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  secret: process.env.NEXTAUTH_SECRET,
}
