import { AppLayout } from '@/components/layout/AppLayout'
import { MovementForm } from '@/components/movements/MovementForm'

export default function StockOut() {
  return (
    <AppLayout>
      <MovementForm type="OUT" />
    </AppLayout>
  )
}
