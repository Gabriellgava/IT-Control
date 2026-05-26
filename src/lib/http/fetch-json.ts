type FetchJsonOptions = RequestInit & {
  context: string
}

const isJsonResponse = (response: Response) => {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  return contentType.includes('application/json') || contentType.includes('+json')
}

export async function fetchJsonOrThrow<T>(url: string, options: FetchJsonOptions): Promise<T> {
  const { context, ...init } = options
  const response = await fetch(url, init)

  if (!response.ok) {
    const text = await response.text()
    console.error(`[fetchJsonOrThrow][${context}] HTTP ${response.status} em ${url}`, {
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      bodyPreview: text.slice(0, 1000),
    })
    throw new Error('Erro na API')
  }

  if (!isJsonResponse(response)) {
    const text = await response.text()
    console.error(`[fetchJsonOrThrow][${context}] resposta não é JSON em ${url}`, {
      contentType: response.headers.get('content-type'),
      bodyPreview: text.slice(0, 1000),
    })
    throw new Error('Serviço indisponível no momento. Tente novamente em instantes.')
  }

  try {
    return (await response.json()) as T
  } catch (error) {
    console.error(`[fetchJsonOrThrow][${context}] falha ao parsear JSON em ${url}`, error)
    throw new Error('Resposta inválida da API. Tente novamente.')
  }
}

export function getAppBaseUrl() {
  const appUrl = process.env.APP_URL?.trim() || process.env.NEXTAUTH_URL?.trim() || ''
  if (!appUrl) {
    console.warn('[termos] APP_URL/NEXTAUTH_URL não definido. Usando URL relativa para compatibilidade Vercel.')
    return ''
  }

  const isLocalhost = /localhost|127\.0\.0\.1/.test(appUrl)
  if (process.env.NODE_ENV === 'production' && isLocalhost) {
    console.error('[termos] APP_URL inválida em produção (localhost detectado). Ignorando para evitar fetch local.')
    return ''
  }

  return appUrl.replace(/\/$/, '')
}
