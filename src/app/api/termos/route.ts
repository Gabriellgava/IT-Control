import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateSignatureToken } from '@/lib/termos/security'
import { registrarAuditoria } from '@/lib/termos/auditoria'
import { normalizarTexto } from '@/lib/texto'

const metadataComment = (metadata: unknown) => `<!--IT_CONTROL_TERMO_METADATA:${Buffer.from(JSON.stringify(metadata), 'utf8').toString('base64')}-->`

const normalizeItems = (items: unknown) =>
  Array.isArray(items)
    ? items
        .map((item) => {
          if (!item || typeof item !== 'object') return null
          const current = item as Record<string, unknown>
          return {
            etiqueta: normalizarTexto(String(current.etiqueta ?? '')),
            tipo: normalizarTexto(String(current.tipo ?? '')),
            descricao: normalizarTexto(String(current.descricao ?? '')),
            marca: normalizarTexto(String(current.marca ?? '')),
            modelo: normalizarTexto(String(current.modelo ?? '')),
          }
        })
        .filter((item) => item && item.etiqueta && item.tipo)
        .slice(0, 300)
    : []

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.titulo || !body.conteudoHtml || !body.funcionarioId) {
      return NextResponse.json({ error: 'Dados obrigatórios ausentes' }, { status: 400 })
    }

    const funcionario = await prisma.funcionario.findUnique({ where: { id: body.funcionarioId } })
    if (!funcionario) return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })

    const token = generateSignatureToken()
    const metadata = {
      empresa: normalizarTexto(String(body.empresa ?? '')),
      cnpjEmpresa: normalizarTexto(String(body.cnpjEmpresa ?? '')),
      enderecoEmpresa: normalizarTexto(String(body.enderecoEmpresa ?? '')),
      setores: Array.isArray(body.setores) ? body.setores.map((setor: unknown) => normalizarTexto(String(setor))).filter(Boolean) : [],
      dataEntrega: normalizarTexto(String(body.dataEntrega ?? '')),
      dataDevolucao: normalizarTexto(String(body.dataDevolucao ?? '')),
      observacoes: normalizarTexto(String(body.observacoes ?? '')),
      itens: normalizeItems(body.itens),
    }
    const conteudoHtml = `${body.conteudoHtml}
${metadataComment(metadata)}`

    const termo = await prisma.termo.create({
      data: {
        titulo: body.titulo,
        conteudoHtml,
        funcionarioId: body.funcionarioId,
        criadoPorId: body.criadoPorId,
        token,
      },
    })

    await registrarAuditoria(termo.id, 'TERMO_CRIADO', { status: termo.status }, { atorId: body.criadoPorId })

    return NextResponse.json({ termoId: termo.id, tokenAssinatura: token }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar termo'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
