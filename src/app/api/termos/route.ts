import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildTermoPdf } from '@/lib/termos/pdf'
import { ensureFuncionarioFolder, ensureTermoFolder, uploadPdf } from '@/lib/termos/drive'
import { generateSignatureToken, hashSignatureToken } from '@/lib/termos/security'
import { registrarAuditoria } from '@/lib/termos/auditoria'

function buildFileName(tipo: 'original' | 'assinado', termoId: string, funcionarioNome: string) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const nome = funcionarioNome.trim().replace(/\s+/g, '_')
  return `${tipo}-${termoId}-${nome}-${stamp}.pdf`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.titulo || !body.conteudoHtml || !body.funcionarioId) {
      return NextResponse.json({ error: 'Dados obrigatórios ausentes' }, { status: 400 })
    }

    const funcionario = await prisma.funcionario.findUnique({ where: { id: body.funcionarioId } })
    if (!funcionario) return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })

    const token = generateSignatureToken()
    const tokenHash = hashSignatureToken(token)
    const expiraEm = new Date(Date.now() + Number(body.validadeHoras ?? 72) * 60 * 60 * 1000)

    const termo = await prisma.termo.create({
      data: {
        titulo: body.titulo,
        conteudoHtml: body.conteudoHtml,
        funcionarioId: body.funcionarioId,
        criadoPorId: body.criadoPorId,
        assinaturaTokenHash: tokenHash,
        tokenExpiraEm: expiraEm,
      },
    })

    const funcionarioFolderId = await ensureFuncionarioFolder(funcionario.nome)
    const termoFolderId = await ensureTermoFolder(funcionarioFolderId, termo.id)
    const pdf = await buildTermoPdf({
      titulo: body.titulo,
      texto: body.conteudoHtml,
      empresa: body.empresa,
      colaborador: funcionario.nome,
      setores: Array.isArray(body.setores) ? body.setores : [],
      dataEntrega: body.dataEntrega,
      dataDevolucao: body.dataDevolucao,
      observacoes: body.observacoes,
      itens: Array.isArray(body.itens) ? body.itens : [],
    })
    const original = await uploadPdf(termoFolderId, buildFileName('original', termo.id, funcionario.nome), pdf)

    await prisma.termo.update({
      where: { id: termo.id },
      data: {
        driveFolderId: termoFolderId,
        drivePdfOriginalFileId: original.fileId,
        drivePdfOriginalLink: original.link ?? undefined,
      },
    })

    await registrarAuditoria(
      termo.id,
      'TERMO_CRIADO',
      { driveFolderId: termoFolderId, drivePdfOriginalFileId: original.fileId },
      { atorId: body.criadoPorId }
    )

    return NextResponse.json({ termoId: termo.id, tokenAssinatura: token }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar termo'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
