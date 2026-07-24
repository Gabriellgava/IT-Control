import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { maquinaEtiqueta } = body

    if (!maquinaEtiqueta?.trim()) {
      return NextResponse.json({ error: 'Máquina é obrigatória' }, { status: 400 })
    }

    // Verificar se a licença existe
    const licenca = await prisma.licenca.findUnique({
      where: { id: params.id }
    })

    if (!licenca) {
      return NextResponse.json({ error: 'Licença não encontrada' }, { status: 404 })
    }

    // Verificar se a máquina já tem licença do mesmo tipo
    const produtoLicencaLower = licenca.produtoLicenca.toLowerCase()
    const isWindows = produtoLicencaLower.includes('windows')
    const isOffice = produtoLicencaLower.includes('office')

    const licencasExistentes = await prisma.licenca.findMany({
      where: { maquinaEtiqueta: maquinaEtiqueta.trim() }
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

    const atualizada = await prisma.licenca.update({
      where: { id: params.id },
      data: { maquinaEtiqueta: maquinaEtiqueta.trim() }
    })

    return NextResponse.json(atualizada)
  } catch (error) {
    console.error('Erro ao vincular licença:', error)
    return NextResponse.json({ error: 'Erro ao vincular licença' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.licenca.delete({
      where: { id: params.id },
    })
    return NextResponse.json({ sucesso: true })
  } catch (error) {
    console.error('Erro ao excluir licença:', error)
    return NextResponse.json({ error: 'Erro ao excluir licença' }, { status: 500 })
  }
}
