import { Suspense } from "react"
import DonateClient from "./DonateClient"

export default function DonatePage({
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
      <DonateClient searchParams={searchParams} />
    </Suspense>
  )
}

