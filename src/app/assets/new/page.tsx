'use client'

import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { AssetForm } from '@/components/assets/AssetForm'
import { Card } from '@/components/ui'
import type { Supplier } from '@/types'

export default function NewAsset() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  useEffect(() => {
    fetch('/api/suppliers').then(r => r.json()).then(setSuppliers)
  }, [])

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Adicionar Ativo</h1>
          <p className="text-sm text-gray-500 mt-1">Cadastre um novo produto no inventário de TI</p>
        </div>
        <Card className="p-6">
          <AssetForm suppliers={suppliers} />
        </Card>
      </div>
    </AppLayout>
  )
}
