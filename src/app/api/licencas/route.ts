import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const licencas = await prisma.licenca.findMany({
      orderBy: { criadoEm: 'desc' },
    })
    return NextResponse.json(licencas)
  } catch (error) {
    console.error('Erro ao buscar licenças:', error)
    return NextResponse.json({ error: 'Erro ao buscar licenças' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.produtoLicenca?.trim()) {
      return NextResponse.json({ error: 'Produto da licença é obrigatório' }, { status: 400 })
    }

    // Se tiver máquina vinculada, solicitadoPor é obrigatório
    const maquinaEtiqueta = body.maquinaEtiqueta?.trim() || null
    if (maquinaEtiqueta && !body.solicitadoPor?.trim()) {
      return NextResponse.json({ error: 'Solicitado por é obrigatório quando há máquina vinculada' }, { status: 400 })
    }

    // Se tiver máquina vinculada, verificar duplicidade
    if (maquinaEtiqueta) {
      const produtoLicencaLower = body.produtoLicenca.toLowerCase()
      const isWindows = produtoLicencaLower.includes('windows')
      const isOffice = produtoLicencaLower.includes('office')

      const licencasExistentes = await prisma.licenca.findMany({
        where: { maquinaEtiqueta }
      })

      if (isWindows) {
        const windowsExistente = licencasExistentes.some(l => l.produtoLicenca.toLowerCase().includes('windows'))
        if (windowsExistente) {
          return NextResponse.json({ error: 'Esta máquina já possui uma licença de Windows cadastrada' }, { status: 400 })
        }
      }

      if (isOffice) {
        const officeExistente = licencasExistentes.some(l => l.produtoLicenca.toLowerCase().includes('office'))
        if (officeExistente) {
          return NextResponse.json({ error: 'Esta máquina já possui uma licença de Office cadastrada' }, { status: 400 })
        }
      }
    }

    const licenca = await prisma.licenca.create({
      data: {
        solicitadoPor: body.solicitadoPor?.trim() || null,
        maquinaEtiqueta,
        produtoLicenca: body.produtoLicenca.trim(),
        codigoLicenca: body.codigoLicenca?.trim() || null,
      },
    })

    return NextResponse.json(licenca, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar licença:', error)
    return NextResponse.json({ error: 'Erro ao criar licença' }, { status: 500 })
  }
}
