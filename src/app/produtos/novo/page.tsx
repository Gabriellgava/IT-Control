'use client'
import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProdutoForm } from '@/components/produtos/ProdutoForm'
import type { Categoria, Fornecedor } from '@/types'

export default function Page() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  useEffect(() => {
    fetch('/api/categorias').then(r => r.json()).then(setCategorias)
    fetch('/api/fornecedores').then(r => r.json()).then(setFornecedores)
  }, [])
  return (
    <AppLayout>
      <div className="flex justify-center">
        <div className="w-full max-w-2xl">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Novo Produto</h1>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <ProdutoForm categorias={categorias} fornecedores={fornecedores} />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
