import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const montarCodigoBase = (valor: string) => {
  const limpo = valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return limpo.slice(0, 24) || 'PRODUTO'
}

const gerarCodigoUnico = async (baseNome: string) => {
  const base = montarCodigoBase(baseNome)
  const prefixo = `${base}-AUTO`

  for (let i = 1; i <= 9999; i++) {
    const sufixo = i.toString().padStart(4, '0')
    const codigo = `${prefixo}-${sufixo}`
    const existente = await prisma.produto.findUnique({ where: { codigo } })
    if (!existente) return codigo
  }

  return `${prefixo}-${Date.now()}`
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const inventario = await prisma.inventario.findMany({ orderBy: { etiqueta: 'asc' } })

    let categoriasCriadas = 0
    let produtosCriados = 0
    let unidadesCriadas = 0
    let unidadesReativadas = 0

    for (const item of inventario) {
      const etiqueta = item.etiqueta.trim()
      const tipo = item.tipo.trim()
      const modelo = item.modelo.trim()
      const marca = item.marca.trim()

      if (!etiqueta || !tipo || !modelo) continue

      const unidadeExistente = await prisma.unidade.findUnique({
        where: { etiqueta },
      })

      if (unidadeExistente?.status === 'ATIVA') continue

      let categoria = await prisma.categoria.findFirst({
        where: { nome: { equals: tipo, mode: 'insensitive' } },
      })

      if (!categoria) {
        categoria = await prisma.categoria.create({ data: { nome: tipo } })
        categoriasCriadas++
      }

      const nomesCandidatos = [`${tipo} ${marca} ${modelo}`.trim(), modelo, tipo]
      let produto = null

      for (const nome of nomesCandidatos) {
        produto = await prisma.produto.findFirst({
          where: { nome: { equals: nome, mode: 'insensitive' } },
        })

        if (produto) break
      }

      if (!produto) {
        const nomeNovoProduto = `${tipo} ${marca} ${modelo}`.replace(/\s+/g, ' ').trim()
        const codigo = await gerarCodigoUnico(nomeNovoProduto)

        produto = await prisma.produto.create({
          data: {
            nome: nomeNovoProduto,
            codigo,
            categoriaId: categoria.id,
            observacoes: `Criado automaticamente a partir do inventário (${item.etiqueta})`,
          },
        })
        produtosCriados++
      } else if (!produto.categoriaId) {
        produto = await prisma.produto.update({
          where: { id: produto.id },
          data: { categoriaId: categoria.id },
        })
      }

      if (!unidadeExistente) {
        await prisma.unidade.create({
          data: {
            etiqueta,
            produtoId: produto.id,
            status: 'ATIVA',
          },
        })
        unidadesCriadas++
        continue
      }

      await prisma.unidade.update({
        where: { id: unidadeExistente.id },
        data: {
          produtoId: produto.id,
          status: 'ATIVA',
        },
      })
      unidadesReativadas++
    }

    const totalProcessado = categoriasCriadas + produtosCriados + unidadesCriadas + unidadesReativadas

    return NextResponse.json({
      sucesso: true,
      totalInventario: inventario.length,
      categoriasCriadas,
      produtosCriados,
      unidadesCriadas,
      unidadesReativadas,
      mensagem: totalProcessado === 0
        ? 'Nenhuma mudança necessária. Inventário e produtos já estão sincronizados.'
        : `Sincronização concluída: ${categoriasCriadas} categoria(s), ${produtosCriados} produto(s), ${unidadesCriadas} unidade(s) criada(s), ${unidadesReativadas} unidade(s) reativada(s).`,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao sincronizar inventário com produtos' }, { status: 500 })
  }
}
