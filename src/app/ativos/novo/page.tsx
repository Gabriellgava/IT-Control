'use client'
import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { AtivoForm } from '@/components/ativos/AtivoForm'
import type { Fornecedor, Categoria } from '@/types'

export default function Page() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  useEffect(() => {
    fetch('/api/fornecedores').then(r => r.json()).then(setFornecedores)
    fetch('/api/categorias').then(r => r.json()).then(setCategorias)
  }, [])
  return (
    <AppLayout>
      <div className="flex justify-center">
        <div className="w-full max-w-2xl">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Adicionar Ativo</h1>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <AtivoForm fornecedores={fornecedores} categorias={categorias} />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
