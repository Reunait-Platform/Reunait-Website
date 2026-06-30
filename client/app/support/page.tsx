import { Suspense } from "react"
import SupportClient from "./SupportClient"

export default function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{
    payment_status?: string
    payment_id?: string
    order_id?: string
    amount?: string
    currency?: string
    error?: string
    error_code?: string
  }>
}) {
  return (
    <Suspense fallback={null}>
      <SupportClient searchParams={searchParams} />
    </Suspense>
  )
}

