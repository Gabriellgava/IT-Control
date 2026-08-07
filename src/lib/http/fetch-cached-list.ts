type ApiListResponse<T> = T[] | { data?: T[] }

const cache = new Map<string, Promise<unknown>>()

export function fetchCachedList<T>(url: string): Promise<T[]> {
  const cached = cache.get(url)
  if (cached) return cached as Promise<T[]>

  const request = fetch(url)
    .then(async (response) => {
      if (!response.ok) throw new Error('Não foi possível carregar os dados.')
      const payload = await response.json() as ApiListResponse<T>
      return Array.isArray(payload) ? payload : (payload.data ?? [])
    })
    .catch((error) => {
      cache.delete(url)
      throw error
    })

  cache.set(url, request)
  return request
}

export function invalidateCachedList(url: string) {
  cache.delete(url)
}
