'use client'
import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { AtivoForm } from '@/components/ativos/AtivoForm'
import type { Fornecedor } from '@/types'

export default function Page() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  useEffect(() => { fetch('/api/fornecedores').then(r => r.json()).then(setFornecedores) }, [])
  return (
    <AppLayout>
      <div className="flex justify-center">
        <div className="w-full max-w-2xl">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Adicionar Ativo</h1>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <AtivoForm fornecedores={fornecedores} />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
