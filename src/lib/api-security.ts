import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'

type RateLimitBucket = { count: number; resetAt: number }

const rateLimitStore = new Map<string, RateLimitBucket>()
const RATE_WINDOW_MS = 60_000
const RATE_MAX_REQUESTS = 120

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
}

function cleanupRateLimitStore(now: number) {
  if (rateLimitStore.size < 5000) return
  for (const [key, bucket] of rateLimitStore) {
    if (bucket.resetAt <= now) rateLimitStore.delete(key)
  }
}

export function enforceRateLimit(request: NextRequest): NextResponse | null {
  const now = Date.now()
  cleanupRateLimitStore(now)

  const key = `${getClientIp(request)}:${request.method}:${request.nextUrl.pathname}`
  const bucket = rateLimitStore.get(key)

  if (!bucket || bucket.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return null
  }

  bucket.count += 1
  if (bucket.count > RATE_MAX_REQUESTS) {
    return NextResponse.json({ error: 'Muitas requisições. Tente novamente em instantes.' }, { status: 429 })
  }

  return null
}

export function enforceSameOriginForMutations(request: NextRequest): NextResponse | null {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return null

  const origin = request.headers.get('origin')
  const host = request.headers.get('host')

  if (!origin || !host) {
    return NextResponse.json({ error: 'Origem inválida para operação sensível' }, { status: 403 })
  }

  try {
    const originHost = new URL(origin).host
    if (originHost !== host) {
      return NextResponse.json({ error: 'Origem não permitida' }, { status: 403 })
    }
    return null
  } catch {
    return NextResponse.json({ error: 'Origem malformada' }, { status: 403 })
  }
}

export async function requireAuthenticatedUser() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return {
      session: null,
      response: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }),
    }
  }

  if ((session.user as { bloqueado?: boolean }).bloqueado) {
    return {
      session: null,
      response: NextResponse.json({ error: 'Usuário bloqueado' }, { status: 403 }),
    }
  }

  return { session, response: null }
}

export async function requireAdminUser() {
  const result = await requireAuthenticatedUser()
  if (result.response) return result

  if (result.session?.user?.perfil !== 'admin') {
    return {
      session: null,
      response: NextResponse.json({ error: 'Sem permissão' }, { status: 403 }),
    }
  }

  return result
}

export function sanitizeNullableText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const sanitized = value.trim()
  return sanitized.length > 0 ? sanitized : null
}

export function sanitizeEmail(value: unknown): string | null {
  const email = sanitizeNullableText(value)?.toLowerCase()
  if (!email) return null
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  return valid ? email : null
}

export function sanitizeOptionalUrl(value: unknown): string | null {
  const sanitized = sanitizeNullableText(value)
  if (!sanitized) return null

  try {
    const parsed = new URL(sanitized)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? sanitized : null
  } catch {
    return null
  }
}

export function sanitizeMoney(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return parsed
}

export function sanitizePerfil(value: unknown): 'admin' | 'usuario' {
  return value === 'admin' ? 'admin' : 'usuario'
}

export function serializeUsuario<T extends { senha?: string | null }>(usuario: T) {
  const { senha: _senha, ...safeUsuario } = usuario
  return safeUsuario
}
