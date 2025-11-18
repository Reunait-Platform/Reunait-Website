import { Suspense } from "react";
import SsoCompleteClient from "./SsoCompleteClient";

export default function SsoCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <SsoCompleteClient searchParams={searchParams} />
    </Suspense>
  );
}
