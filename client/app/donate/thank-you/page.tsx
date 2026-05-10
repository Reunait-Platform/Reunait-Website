import { Suspense } from "react"
import ThankYouClient from "./ThankYouClient"

export default function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{
    payment_id?: string
    order_id?: string
    amount?: string
    currency?: string
    method?: string
  }>
}) {
  return (
    <Suspense fallback={null}>
      <ThankYouClient searchParams={searchParams} />
    </Suspense>
  )
}
