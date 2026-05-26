import { SignatureForm } from '@/components/termos/SignatureForm'
import { prisma } from '@/lib/prisma'

type AssinaturaPageState =
  | { state: 'invalid-token' }
  | { state: 'not-found' }
  | { state: 'error'; message: string }
  | {
      state: 'ok'
      termo: {
        id: string
        titulo: string
        conteudoHtml: string
        status: string
        funcionario: {
          id: string
          nome: string
          email: string
        }
        signedAt: Date | null
        signatureImageDataUrl: string | null
      }
    }

async function getTermoState(token: string): Promise<AssinaturaPageState> {
  const trimmedToken = token?.trim()

  console.log('[assinatura-page] payload recebido', { token: trimmedToken })

  if (!trimmedToken) {
    console.log('[assinatura-page] result.ok', false)
    return { state: 'invalid-token' }
  }

  try {
    const termo = await prisma.termo.findUnique({
      where: { token: trimmedToken },
      include: { funcionario: true },
    })

    const result = {
      ok: Boolean(termo),
      data: termo
        ? {
            id: termo.id,
            titulo: termo.titulo,
            conteudoHtml: termo.conteudoHtml,
            status: termo.status,
            funcionario: {
              id: termo.funcionario.id,
              nome: termo.funcionario.nome,
              email: termo.funcionario.email,
            },
            signedAt: termo.signedAt,
            signatureImageDataUrl: termo.signatureImageDataUrl,
          }
        : null,
    }

    console.log('[assinatura-page] payload recebido da consulta', {
      token: trimmedToken,
      result,
    })
    console.log('[assinatura-page] result.ok', result.ok)

    if (!result.ok || !result.data) {
      return { state: 'not-found' }
    }

    if (termo?.status === 'PENDENTE') {
      await prisma.termo.update({ where: { id: termo.id }, data: { status: 'VISUALIZADO' } })
      result.data.status = 'VISUALIZADO'
    }

    console.log('[assinatura-page] termo carregado', {
      id: result.data.id,
      status: result.data.status,
      funcionarioId: result.data.funcionario.id,
    })

    return { state: 'ok', termo: result.data }
  } catch (error) {
    console.error('[assinatura-page] erro ao carregar termo', {
      token: trimmedToken,
      error,
    })

    return {
      state: 'error',
      message: 'Não foi possível carregar o termo agora. Tente novamente em instantes.',
    }
  }
}

export default async function AssinaturaPage({ params }: { params: { token: string } }) {
  const termoState = await getTermoState(params.token)

  if (termoState.state === 'invalid-token') {
    return <div className="mx-auto max-w-3xl p-6 text-sm text-red-700">Token inválido. Confira o link recebido e tente novamente.</div>
  }

  if (termoState.state === 'not-found') {
    return <div className="mx-auto max-w-3xl p-6 text-sm text-gray-700">Termo inexistente ou link expirado.</div>
  }

  if (termoState.state === 'error') {
    return <div className="mx-auto max-w-3xl p-6 text-sm text-red-700">{termoState.message}</div>
  }

  const { termo } = termoState

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">{termo.titulo}</h1>

      <section className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
        <p>
          <strong>Colaborador:</strong> {termo.funcionario.nome}
        </p>
        <p>
          <strong>E-mail:</strong> {termo.funcionario.email}
        </p>
        <p>
          <strong>Status:</strong> {termo.status}
        </p>
      </section>

      <article className="prose max-w-none" dangerouslySetInnerHTML={{ __html: termo.conteudoHtml }} />

      {termo.status === 'ASSINADO' ? (
        <section className="rounded-lg border border-green-200 bg-green-50 p-4">
          <h2 className="font-semibold text-green-800">Termo já assinado</h2>
          <p className="text-sm text-green-700">Este termo foi confirmado{termo.signedAt ? ` em ${new Date(termo.signedAt).toLocaleString('pt-BR')}` : ''}.</p>
          {termo.signatureImageDataUrl ? (
            <div className="mt-3">
              <p className="mb-2 text-sm font-medium text-green-800">Assinatura registrada:</p>
              <img src={termo.signatureImageDataUrl} alt="Assinatura registrada" className="max-h-40 rounded border bg-white p-2" />
            </div>
          ) : null}
        </section>
      ) : (
        <SignatureForm token={params.token} />
      )}
    </main>
  )
}
