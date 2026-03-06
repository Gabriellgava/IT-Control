import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create Suppliers
  const supplier1 = await prisma.supplier.upsert({
    where: { id: 'supplier-1' },
    update: {},
    create: {
      id: 'supplier-1',
      name: 'Dell Technologies',
      contact: 'Vendas Dell',
      email: 'vendas@dell.com',
      phone: '(11) 4004-0100',
      website: 'https://dell.com',
    },
  })

  const supplier2 = await prisma.supplier.upsert({
    where: { id: 'supplier-2' },
    update: {},
    create: {
      id: 'supplier-2',
      name: 'HP Inc.',
      email: 'vendas@hp.com',
      phone: '(11) 4004-0200',
      website: 'https://hp.com',
    },
  })

  const supplier3 = await prisma.supplier.upsert({
    where: { id: 'supplier-3' },
    update: {},
    create: {
      id: 'supplier-3',
      name: 'Logitech',
      email: 'vendas@logitech.com',
      website: 'https://logitech.com',
    },
  })

  // Create Sectors
  const sectors = ['TI', 'Financeiro', 'RH', 'Comercial', 'Operações', 'Marketing']
  for (const sectorName of sectors) {
    await prisma.sector.upsert({
      where: { name: sectorName },
      update: {},
      create: { name: sectorName },
    })
  }

  // Create Users
  await prisma.user.upsert({
    where: { email: 'admin@empresa.com' },
    update: {},
    create: {
      name: 'Admin TI',
      email: 'admin@empresa.com',
      role: 'admin',
    },
  })

  await prisma.user.upsert({
    where: { email: 'joao@empresa.com' },
    update: {},
    create: {
      name: 'João Silva',
      email: 'joao@empresa.com',
      role: 'user',
    },
  })

  // Create Assets
  const asset1 = await prisma.asset.upsert({
    where: { code: 'NOTE-001' },
    update: {},
    create: {
      name: 'Notebook Dell Latitude 5520',
      code: 'NOTE-001',
      tag: 'ETQ-0001',
      supplierId: supplier1.id,
      purchaseLink: 'https://dell.com/latitude-5520',
      unitValue: 4500.00,
      quantity: 8,
      minStock: 3,
      purchaseDate: new Date('2024-01-15'),
      notes: 'Notebooks para equipe de TI',
    },
  })

  const asset2 = await prisma.asset.upsert({
    where: { code: 'MON-001' },
    update: {},
    create: {
      name: 'Monitor HP 24" Full HD',
      code: 'MON-001',
      tag: 'ETQ-0010',
      supplierId: supplier2.id,
      purchaseLink: 'https://hp.com/monitor-24',
      unitValue: 1200.00,
      quantity: 2,
      minStock: 5,
      purchaseDate: new Date('2024-02-10'),
      notes: 'Monitores para escritório',
    },
  })

  const asset3 = await prisma.asset.upsert({
    where: { code: 'TECLADO-001' },
    update: {},
    create: {
      name: 'Teclado Logitech MX Keys',
      code: 'TECLADO-001',
      tag: 'ETQ-0020',
      supplierId: supplier3.id,
      purchaseLink: 'https://logitech.com/mx-keys',
      unitValue: 450.00,
      quantity: 15,
      minStock: 10,
      purchaseDate: new Date('2024-03-05'),
    },
  })

  await prisma.asset.upsert({
    where: { code: 'CABO-USB' },
    update: {},
    create: {
      name: 'Cabo USB-C 2m',
      code: 'CABO-USB',
      supplierId: supplier3.id,
      unitValue: 35.00,
      quantity: 3,
      minStock: 10,
      purchaseDate: new Date('2024-03-10'),
    },
  })

  console.log('✅ Seed concluído com sucesso!')
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
