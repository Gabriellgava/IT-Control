import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Criar Fornecedores
  const fornecedor1 = await prisma.fornecedor.upsert({
    where: { id: 'fornecedor-1' },
    update: {},
    create: {
      id: 'fornecedor-1',
      nome: 'Dell Technologies',
      contato: 'Vendas Dell',
      email: 'vendas@dell.com',
      telefone: '(11) 4004-0100',
      site: 'https://dell.com',
    },
  })

  const fornecedor2 = await prisma.fornecedor.upsert({
    where: { id: 'fornecedor-2' },
    update: {},
    create: {
      id: 'fornecedor-2',
      nome: 'HP Inc.',
      email: 'vendas@hp.com',
      telefone: '(11) 4004-0200',
      site: 'https://hp.com',
    },
  })

  const fornecedor3 = await prisma.fornecedor.upsert({
    where: { id: 'fornecedor-3' },
    update: {},
    create: {
      id: 'fornecedor-3',
      nome: 'Logitech',
      email: 'vendas@logitech.com',
      site: 'https://logitech.com',
    },
  })

  // Criar Setores
  const nomesSetores = ['TI', 'Financeiro', 'RH', 'Comercial', 'Operações', 'Marketing']
  for (const nomeSetor of nomesSetores) {
    await prisma.setor.upsert({
      where: { nome: nomeSetor },
      update: {},
      create: { nome: nomeSetor },
    })
  }

  // Criar Usuários
  await prisma.usuario.upsert({
    where: { email: 'admin@empresa.com' },
    update: {},
    create: {
      nome: 'Admin TI',
      email: 'admin@empresa.com',
      perfil: 'admin',
    },
  })

  await prisma.usuario.upsert({
    where: { email: 'joao@empresa.com' },
    update: {},
    create: {
      nome: 'João Silva',
      email: 'joao@empresa.com',
      perfil: 'usuario',
    },
  })

  // Criar Ativos
  const ativo1 = await prisma.ativo.upsert({
    where: { codigo: 'NOTE-001' },
    update: {},
    create: {
      nome: 'Notebook Dell Latitude 5520',
      codigo: 'NOTE-001',
      etiqueta: 'ETQ-0001',
      fornecedorId: fornecedor1.id,
      linkCompra: 'https://dell.com/latitude-5520',
      valorUnitario: 4500.00,
      quantidade: 8,
      estoqueMinimo: 3,
      dataCompra: new Date('2024-01-15'),
      observacoes: 'Notebooks para equipe de TI',
    },
  })

  const ativo2 = await prisma.ativo.upsert({
    where: { codigo: 'MON-001' },
    update: {},
    create: {
      nome: 'Monitor HP 24" Full HD',
      codigo: 'MON-001',
      etiqueta: 'ETQ-0010',
      fornecedorId: fornecedor2.id,
      linkCompra: 'https://hp.com/monitor-24',
      valorUnitario: 1200.00,
      quantidade: 2,
      estoqueMinimo: 5,
      dataCompra: new Date('2024-02-10'),
      observacoes: 'Monitores para escritório — ESTOQUE BAIXO',
    },
  })

  await prisma.ativo.upsert({
    where: { codigo: 'TECLADO-001' },
    update: {},
    create: {
      nome: 'Teclado Logitech MX Keys',
      codigo: 'TECLADO-001',
      etiqueta: 'ETQ-0020',
      fornecedorId: fornecedor3.id,
      linkCompra: 'https://logitech.com/mx-keys',
      valorUnitario: 450.00,
      quantidade: 15,
      estoqueMinimo: 10,
      dataCompra: new Date('2024-03-05'),
    },
  })

  await prisma.ativo.upsert({
    where: { codigo: 'CABO-USB' },
    update: {},
    create: {
      nome: 'Cabo USB-C 2m',
      codigo: 'CABO-USB',
      fornecedorId: fornecedor3.id,
      valorUnitario: 35.00,
      quantidade: 3,
      estoqueMinimo: 10,
      dataCompra: new Date('2024-03-10'),
      observacoes: 'Cabo de carregamento — ESTOQUE BAIXO',
    },
  })

  console.log('✅ Seed concluído com sucesso!')
  console.log('   → 3 fornecedores criados')
  console.log('   → 6 setores criados')
  console.log('   → 2 usuários criados')
  console.log('   → 4 ativos criados (2 com estoque baixo)')
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
