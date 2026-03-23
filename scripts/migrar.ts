/**
 * Script de migração: converte ativos antigos para Produto + Unidade
 * Rodar com: npx ts-node --skip-project scripts/migrar.ts
 * Ou: npx tsx scripts/migrar.ts
 */

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Iniciando migração de ativos → produtos + unidades...\n')

  // 1. Limpa movimentações antigas
  const movDel = await prisma.movimentacao.deleteMany({})
  console.log(`🗑️  ${movDel.count} movimentação(ões) removida(s)`)

  // 2. Busca todos os ativos (incluindo deletados)
  // @ts-ignore — modelo antigo ainda existe no banco mas não no schema novo
  const ativos = await prisma.$queryRaw`SELECT * FROM ativos`
  console.log(`📦 ${(ativos as unknown[]).length} ativo(s) encontrado(s)`)

  let produtosCriados = 0
  let unidadesCriadas = 0

  for (const ativo of ativos as Record<string, unknown>[]) {
    // Verifica se já existe um produto com este código
    const existente = await prisma.produto.findUnique({ where: { codigo: ativo.codigo as string } })

    let produto
    if (existente) {
      produto = existente
    } else {
      produto = await prisma.produto.create({
        data: {
          nome: ativo.nome as string,
          codigo: ativo.codigo as string,
          categoriaId: (ativo.categoria_id as string) || null,
          fornecedorId: (ativo.fornecedor_id as string) || null,
          valorUnitario: (ativo.valor_unitario as number) || 0,
          linkCompra: (ativo.link_compra as string) || null,
          observacoes: (ativo.observacoes as string) || null,
        },
      })
      produtosCriados++
      console.log(`  ✅ Produto criado: ${produto.nome} (${produto.codigo})`)
    }

    // Cria unidade se tinha etiqueta
    const etiqueta = ativo.etiqueta as string | null
    if (etiqueta) {
      const etiquetaExiste = await prisma.unidade.findUnique({ where: { etiqueta } })
      if (!etiquetaExiste) {
        await prisma.unidade.create({
          data: {
            produtoId: produto.id,
            etiqueta,
            dataCompra: ativo.data_compra ? new Date(ativo.data_compra as string) : null,
            status: (ativo.deletado as boolean) ? 'DESCARTADA' : 'ATIVA',
          },
        })
        unidadesCriadas++
        console.log(`     🏷️  Unidade criada: ${etiqueta} (${(ativo.deletado as boolean) ? 'DESCARTADA' : 'ATIVA'})`)
      }
    }
  }

  console.log(`\n✅ Migração concluída!`)
  console.log(`   Produtos criados: ${produtosCriados}`)
  console.log(`   Unidades criadas: ${unidadesCriadas}`)
  console.log(`\n⚠️  A tabela 'ativos' ainda existe no banco.`)
  console.log(`   Após confirmar que tudo está certo, rode:`)
  console.log(`   npx prisma db execute --stdin <<< "DROP TABLE ativos CASCADE;"`)
}

main()
  .catch(e => { console.error('❌ Erro na migração:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
