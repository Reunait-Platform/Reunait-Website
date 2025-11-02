import CaseOwnerProfileClient from "@/components/caseOwnerProfile/CaseOwnerProfileClient"

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CaseOwnerProfilePage({ searchParams }: PageProps) {
  const sp = await searchParams
  const caseOwner = (Array.isArray(sp.caseOwner) ? sp.caseOwner[0] : sp.caseOwner) || null
  return <CaseOwnerProfileClient caseOwner={caseOwner} />
}
