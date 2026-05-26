import { SignatureForm } from '@/components/termos/SignatureForm'
import { fetchJsonOrThrow, getAppBaseUrl } from '@/lib/http/fetch-json'

async function getTermo(token: string) {
  const base = getAppBaseUrl()
  const url = `${base}/api/assinatura/${token}`
  try {
    return await fetchJsonOrThrow<{ titulo: string; funcionario: string; conteudoHtml: string }>(url, {
      cache: 'no-store',
      context: 'assinatura-page-get-termo',
    })
  } catch (error) {
    console.error('[assinatura-page] erro ao carregar termo', { token, url, error })
    return null
  }
}

export default async function AssinaturaPage({ params }: { params: { token: string } }) {
  const termo = await getTermo(params.token)

  if (!termo) return <div className="p-8">Link inválido ou expirado.</div>

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">{termo.titulo}</h1>
      <p className="text-sm text-gray-600">Colaborador: {termo.funcionario}</p>
      <article className="prose" dangerouslySetInnerHTML={{ __html: termo.conteudoHtml }} />
      <SignatureForm token={params.token} />
    </main>
  )
}
