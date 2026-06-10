import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const empresa = await prisma.empresa.findFirst()
    if (!empresa) {
      return NextResponse.json(null)
    }
    return NextResponse.json(empresa)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar dados da empresa' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.perfil !== 'admin')
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  try {
    const body = await request.json()
    
    // Verificar se já existe uma empresa
    const empresaExistente = await prisma.empresa.findFirst()
    
    if (empresaExistente) {
      // Atualizar empresa existente
      const empresa = await prisma.empresa.update({
        where: { id: empresaExistente.id },
        data: {
          razaoSocial: body.razaoSocial?.trim(),
          nomeFantasia: body.nomeFantasia?.trim() || null,
          cnpj: body.cnpj?.trim(),
          inscricaoEstadual: body.inscricaoEstadual?.trim() || null,
          emailCorporativo: body.emailCorporativo?.trim() || null,
          telefone: body.telefone?.trim() || null,
          website: body.website?.trim() || null,
          endereco: body.endereco?.trim() || null,
          cep: body.cep?.trim() || null,
          rua: body.rua?.trim() || null,
          numero: body.numero?.trim() || null,
          complemento: body.complemento?.trim() || null,
          bairro: body.bairro?.trim() || null,
          cidade: body.cidade?.trim() || null,
          estado: body.estado?.trim() || null,
          representanteNome: body.representanteNome?.trim() || null,
          representanteCargo: body.representanteCargo?.trim() || null,
          representanteEmail: body.representanteEmail?.trim() || null,
          representanteTelefone: body.representanteTelefone?.trim() || null,
          logoUrl: body.logoUrl || null,
          assinaturaUrl: body.assinaturaUrl || null,
          usarLogoNoPdf: body.usarLogoNoPdf ?? true,
          exibirCargoRepresentante: body.exibirCargoRepresentante ?? true,
          assinaturaAutomatica: body.assinaturaAutomatica ?? false,
          mostrarEnderecoNoTermo: body.mostrarEnderecoNoTermo ?? true,
        },
      })
      return NextResponse.json(empresa)
    } else {
      // Criar nova empresa
      const empresa = await prisma.empresa.create({
        data: {
          razaoSocial: body.razaoSocial?.trim(),
          nomeFantasia: body.nomeFantasia?.trim() || null,
          cnpj: body.cnpj?.trim(),
          inscricaoEstadual: body.inscricaoEstadual?.trim() || null,
          emailCorporativo: body.emailCorporativo?.trim() || null,
          telefone: body.telefone?.trim() || null,
          website: body.website?.trim() || null,
          endereco: body.endereco?.trim() || null,
          cep: body.cep?.trim() || null,
          rua: body.rua?.trim() || null,
          numero: body.numero?.trim() || null,
          complemento: body.complemento?.trim() || null,
          bairro: body.bairro?.trim() || null,
          cidade: body.cidade?.trim() || null,
          estado: body.estado?.trim() || null,
          representanteNome: body.representanteNome?.trim() || null,
          representanteCargo: body.representanteCargo?.trim() || null,
          representanteEmail: body.representanteEmail?.trim() || null,
          representanteTelefone: body.representanteTelefone?.trim() || null,
          logoUrl: body.logoUrl || null,
          assinaturaUrl: body.assinaturaUrl || null,
          usarLogoNoPdf: body.usarLogoNoPdf ?? true,
          exibirCargoRepresentante: body.exibirCargoRepresentante ?? true,
          assinaturaAutomatica: body.assinaturaAutomatica ?? false,
          mostrarEnderecoNoTermo: body.mostrarEnderecoNoTermo ?? true,
        },
      })
      return NextResponse.json(empresa, { status: 201 })
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002')
      return NextResponse.json({ error: 'CNPJ já cadastrado' }, { status: 400 })
    console.error(error)
    return NextResponse.json({ error: 'Erro ao salvar dados da empresa' }, { status: 500 })
  }
}
