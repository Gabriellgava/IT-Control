import { prisma } from '@/lib/prisma'

export async function registrarAuditoria(termoId: string, evento: string, detalhes?: unknown, meta?: { ip?: string; userAgent?: string; atorId?: string }) {
  await prisma.termoAuditoria.create({
    data: {
      termoId,
      evento,
      detalhes: (detalhes as any) ?? undefined,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
      atorId: meta?.atorId,
    },
  })
}
