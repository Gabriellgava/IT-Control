import { AppLayout } from '@/components/layout/AppLayout'
import { MovementForm } from '@/components/movements/MovementForm'

export default function StockIn() {
  return (
    <AppLayout>
      <MovementForm type="ENTRADA" />
    </AppLayout>
  )
}
