import { Suspense } from "react";
import ResetPasswordClient from "./ResetPasswordClient";

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{
    returnTo?: string;
    returnBackUrl?: string;
    redirect_url?: string;
  }>;
}) {
  return (
    <Suspense fallback={null}>
      <ResetPasswordClient searchParams={searchParams} />
    </Suspense>
  );
}


