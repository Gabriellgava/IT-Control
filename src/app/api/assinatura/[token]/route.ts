import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureFuncionarioFolder, ensureTermoFolder, uploadPdf } from '@/lib/termos/drive'
import { registrarAuditoria } from '@/lib/termos/auditoria'
import { buildTermoPdf } from '@/lib/termos/pdf'

export const runtime = 'nodejs'

const ROUTE_TAG = '[api/assinatura/[token]]'

type RouteContext = {
  params: {
    token?: string
  }
}

function safeSerialize(value: unknown): unknown {
  if (value === undefined) {
    return undefined
  }

  const serialized = JSON.stringify(value, (_, currentValue: unknown) => {
      if (typeof currentValue === 'bigint') {
        return currentValue.toString()
      }

      if (currentValue instanceof Date) {
        return currentValue.toISOString()
      }

      if (Buffer.isBuffer(currentValue)) {
        return {
          type: 'Buffer',
          length: currentValue.length,
          base64: currentValue.toString('base64')
        }
      }

      if (
        typeof currentValue === 'object' &&
        currentValue !== null &&
        typeof (currentValue as { toFixed?: unknown }).toFixed === 'function' &&
        (currentValue as { constructor?: { name?: string } }).constructor?.name === 'Decimal'
      ) {
        return (currentValue as { toString: () => string }).toString()
      }

      return currentValue
    })

  if (!serialized) {
    return undefined
  }

  return JSON.parse(serialized)
}

function logAssinatura(message: string, payload?: unknown) {
  if (payload === undefined) {
    console.log(`${ROUTE_TAG} ${message}`)
    return
  }

  console.log(`${ROUTE_TAG} ${message}`, safeSerialize(payload))
}

function getErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      cause: safeSerialize(error.cause),
      stack: error.stack
    }
  }

  return {
    message: 'Erro desconhecido',
    cause: safeSerialize(error),
    stack: undefined
  }
}

function validateGoogleDriveEnv() {
  if (!process.env.GOOGLE_CLIENT_EMAIL) {
    throw new Error('GOOGLE_CLIENT_EMAIL não configurado')
  }

  if (!process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error('GOOGLE_PRIVATE_KEY não configurado')
  }

  if (!process.env.GOOGLE_DRIVE_TERMOS_ROOT_FOLDER_ID) {
    throw new Error('GOOGLE_DRIVE_TERMOS_ROOT_FOLDER_ID não configurado')
  }
}

function internalErrorResponse(error: unknown) {
  const details = getErrorDetails(error)

  logAssinatura('Erro interno da API', details)

  return NextResponse.json(
    {
      error: true,
      message: details.message,
      stack: process.env.NODE_ENV === 'development' ? details.stack : undefined,
      cause: details.cause
    },
    { status: 500 }
  )
}

export async function GET(_: NextRequest, { params }: RouteContext) {
  try {
    const token = params?.token?.trim()
    logAssinatura('GET token recebido', { token, params })

    if (!token) {
      return NextResponse.json({ error: true, message: 'Token inválido' }, { status: 400 })
    }

    const termoQuery = {
      where: { token },
      include: {
        funcionario: true,
        criadoPor: true,
        auditorias: { take: 5, orderBy: { criadoEm: 'desc' as const } }
      }
    }

    logAssinatura('GET prisma query termo.findUnique', termoQuery)
    const termo = await prisma.termo.findUnique(termoQuery)
    logAssinatura('GET resultado prisma termo.findUnique', termo)

    if (!termo) {
      return NextResponse.json({ error: true, message: 'Link inválido' }, { status: 404 })
    }

    if (termo.status === 'PENDENTE') {
      const updateQuery = { where: { id: termo.id }, data: { status: 'VISUALIZADO' as const } }
      logAssinatura('GET prisma query termo.update status VISUALIZADO', updateQuery)
      const termoAtualizado = await prisma.termo.update(updateQuery)
      logAssinatura('GET resultado prisma termo.update', termoAtualizado)
    }

    return NextResponse.json(
      safeSerialize({
        ok: true,
        data: {
          id: termo.id,
          titulo: termo.titulo,
          conteudoHtml: termo.conteudoHtml,
          status: termo.status === 'PENDENTE' ? 'VISUALIZADO' : termo.status,
          funcionario: {
            id: termo.funcionario.id,
            nome: termo.funcionario.nome,
            email: termo.funcionario.email
          },
          criadoPor: termo.criadoPor
            ? {
                id: termo.criadoPor.id,
                nome: termo.criadoPor.nome,
                email: termo.criadoPor.email
              }
            : null,
          signedAt: termo.signedAt,
          updatedAt: termo.atualizadoEm,
          auditTrailCount: termo.auditorias.length
        }
      })
    )
  } catch (error) {
    return internalErrorResponse(error)
  }
}

export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  try {
    const token = params?.token?.trim()
    logAssinatura('POST token recebido', { token, params })

    if (!token) {
      return NextResponse.json({ error: true, message: 'Token inválido' }, { status: 400 })
    }

    const termoQuery = { where: { token }, include: { funcionario: true } }
    logAssinatura('POST prisma query termo.findUnique', termoQuery)
    const termo = await prisma.termo.findUnique(termoQuery)
    logAssinatura('POST resultado prisma termo.findUnique', termo)

    if (!termo) return NextResponse.json({ error: true, message: 'Link inválido' }, { status: 404 })
    if (termo.status === 'ASSINADO') return NextResponse.json({ error: true, message: 'Termo já assinado' }, { status: 409 })

    const body = await request.json()
    logAssinatura('POST payload completo recebido', body)

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: true, message: 'Body inválido' },
        { status: 400 }
      )
    }

    const acceptedTerms = body.acceptedTerms === true
    const rawSignerName =
      typeof body.signerName === 'string'
        ? body.signerName
        : typeof body.typedName === 'string'
          ? body.typedName
          : ''
    const signerName = rawSignerName.trim() || termo.funcionario.nome
    const mode = typeof body.mode === 'string' ? body.mode.trim().toLowerCase() : ''
    const signatureMode = mode || (typeof body.signatureType === 'string' ? body.signatureType.trim().toLowerCase() : '')
    const isTypedSignature = signatureMode === 'typed'
    const isDrawSignature = signatureMode === 'draw'

    logAssinatura('POST mode recebido', { mode: signatureMode })
    logAssinatura('POST signerName resolvido', { signerName })
    logAssinatura('POST assinatura recebida', {
      mode: signatureMode,
      hasSignatureImageDataUrl: Boolean(body.signatureImageDataUrl),
      signaturePreview:
        typeof body.signatureImageDataUrl === 'string' && body.signatureImageDataUrl
          ? `${body.signatureImageDataUrl.slice(0, 30)}...`
          : null
    })

    if (!acceptedTerms) {
      return NextResponse.json({ error: true, message: 'Aceite obrigatório' }, { status: 400 })
    }

    if (!signerName) {
      return NextResponse.json({ error: true, message: 'Nome do assinante é obrigatório' }, { status: 400 })
    }

    if (!isTypedSignature && !isDrawSignature) {
      return NextResponse.json({ error: true, message: 'Modo de assinatura inválido' }, { status: 400 })
    }

    let signatureImageDataUrl: string | null = null

    if (isDrawSignature) {
      if (body.signatureImageDataUrl) {
        if (typeof body.signatureImageDataUrl !== 'string') {
          return NextResponse.json({ error: true, message: 'Assinatura desenhada inválida' }, { status: 400 })
        }

        const normalizedSignature = body.signatureImageDataUrl.trim()
        const base64Pattern = /^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+$/
        if (!normalizedSignature || !base64Pattern.test(normalizedSignature)) {
          return NextResponse.json({ error: true, message: 'Assinatura base64 inválida' }, { status: 400 })
        }

        signatureImageDataUrl = normalizedSignature
      } else {
        return NextResponse.json({ error: true, message: 'Assinatura desenhada é obrigatória no modo draw' }, { status: 400 })
      }
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const userAgent = request.headers.get('user-agent') ?? 'unknown'
    const signedAt = new Date()

    const updateAssinaturaQuery = {
      where: { id: termo.id },
      data: {
        status: 'ASSINADO' as const,
        signerName,
        signerIp: ip,
        signerUserAgent: userAgent,
        signatureImageDataUrl,
        acceptedTerms,
        signedAt
      }
    }
    logAssinatura('POST prisma query termo.update assinatura', updateAssinaturaQuery)
    const updated = await prisma.termo.update(updateAssinaturaQuery)
    logAssinatura('POST resultado prisma termo.update assinatura', updated)
    logAssinatura('POST assinatura persistida com status ASSINADO - iniciando integração Drive', {
      termoId: termo.id,
      status: updated.status,
      signedAt,
    })

    let driveFileId: string | null = null

    try {
      validateGoogleDriveEnv()
      logAssinatura('POST upload drive - root folder configurada', {
        rootFolderId: process.env.GOOGLE_DRIVE_TERMOS_ROOT_FOLDER_ID,
      })
      logAssinatura('POST upload drive - iniciando geração do PDF', {
        termoId: termo.id,
        token,
        colaborador: termo.funcionario.nome
      })

      const pdf = await buildTermoPdf({
        termoId: termo.id,
        titulo: updated.titulo,
        texto: updated.conteudoHtml,
        empresa: 'IT Control',
        colaborador: termo.funcionario.nome,
        colaboradorEmail: termo.funcionario.email,
        assinaturaTexto: signerName,
        assinaturaImagemDataUrl: signatureImageDataUrl,
        assinadoEm: signedAt,
        assinadorIp: ip
      })

      logAssinatura('POST upload drive - PDF gerado', { termoId: termo.id, pdfBytes: pdf.length })

      logAssinatura('POST upload drive - garantindo pasta do funcionário', { funcionario: termo.funcionario.nome })
      const funcionarioFolderId = await ensureFuncionarioFolder(termo.funcionario.nome)

      logAssinatura('POST upload drive - garantindo pasta do termo', {
        funcionarioFolderId,
        termoDataAtual: signedAt
      })
      const termoFolderId = await ensureTermoFolder(funcionarioFolderId, signedAt)

      logAssinatura('POST upload Google Drive iniciado', {
        termoFolderId,
        fileName: `termo-assinado-${termo.id}.pdf`
      })
      const final = await uploadPdf(termoFolderId, `termo-assinado-${termo.id}.pdf`, pdf)
      console.log('[DRIVE] upload Google Drive concluído', { termoId: termo.id, folderId: termoFolderId, fileId: final.fileId })
      driveFileId = final.fileId

      const updateDriveQuery = {
        where: { id: termo.id },
        data: { driveFolderId: termoFolderId, driveFileId: final.fileId, driveFileLink: final.link ?? undefined }
      }
      logAssinatura('POST prisma query termo.update drive', updateDriveQuery)
      const updatedDrive = await prisma.termo.update(updateDriveQuery)
      logAssinatura('POST resultado prisma termo.update drive', updatedDrive)

      await registrarAuditoria(termo.id, 'TERMO_ASSINADO', { finalFileId: final.fileId }, { ip, userAgent })
    } catch (driveError) {
      const details = getErrorDetails(driveError)
      console.error(`${ROUTE_TAG} Falha no fluxo do Google Drive após assinatura concluída`, details)
    }

    return NextResponse.json(safeSerialize({ ok: true, termoId: termo.id, driveFileId }))
  } catch (error) {
    return internalErrorResponse(error)
  }
}
