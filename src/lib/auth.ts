import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// 🔥 CUSTOM ADAPTER PARA USAR "usuario" EM VEZ DE "user"
function CustomPrismaAdapter(p: any) {
  const adapter = PrismaAdapter(p) as any

  return {
    ...adapter,

    createUser: (data: any) => p.usuario.create({ data }),

    getUser: (id: string) =>
      p.usuario.findUnique({ where: { id } }),

    getUserByEmail: (email: string) =>
      p.usuario.findUnique({ where: { email } }),

    getUserByAccount: async ({ providerAccountId, provider }: any) => {
      const account = await p.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider,
            providerAccountId,
          },
        },
        include: { user: true },
      })
      return account?.user ?? null
    },

    updateUser: ({ id, ...data }: any) =>
      p.usuario.update({ where: { id }, data }),

    linkAccount: (data: any) =>
      p.account.create({ data }),

    createSession: (data: any) =>
      p.session.create({ data }),

    getSessionAndUser: async (sessionToken: string) => {
      const s = await p.session.findUnique({
        where: { sessionToken },
        include: { user: true },
      })

      if (!s) return null

      return {
        session: s,
        user: s.user,
      }
    },

    updateSession: ({ sessionToken, ...data }: any) =>
      p.session.update({
        where: { sessionToken },
        data,
      }),

    deleteSession: (sessionToken: string) =>
      p.session.delete({
        where: { sessionToken },
      }),
  }
}

export const authOptions: NextAuthOptions = {
  adapter: CustomPrismaAdapter(prisma),

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

        const user = await prisma.usuario.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.senha || !user.ativo) return null

        const ok = await bcrypt.compare(
          credentials.password,
          user.senha
        )

        if (!ok) return null

        return {
          id: user.id,
          email: user.email!,
          name: user.nome,
          image: user.image,
        }
      },
    }),
  ],

  session: {
    strategy: 'jwt',
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
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