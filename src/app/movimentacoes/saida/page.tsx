import { AppLayout } from '@/components/layout/AppLayout'
import { MovimentacaoForm } from '@/components/movimentacoes/MovimentacaoForm'
export default function Page() {
  return <AppLayout><div className="flex justify-center"><div className="w-full max-w-2xl"><MovimentacaoForm tipo="SAIDA" /></div></div></AppLayout>
}
