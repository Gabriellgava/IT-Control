import { SignatureForm } from '@/components/termos/SignatureForm'

async function getTermo(token: string) {
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const res = await fetch(`${base}/api/assinatura/${token}`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
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
