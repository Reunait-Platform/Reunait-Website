import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { auth } from "@clerk/nextjs/server"
import { fetchCaseById, type CaseDetail } from "@/lib/api"
import { CaseDetailClient } from "@/components/cases/case-detail/CaseDetailClient"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CaseDetailPage({ params }: PageProps) {
  const { id } = await params
  let initialData: CaseDetail | null = null
  let initialMeta: any = null
  const serverNow = Date.now()

  try {
    const { getToken } = await auth()
    const token = getToken ? await getToken() : undefined
    const res = await fetchCaseById(id, token || undefined)
    initialData = res?.data ?? null
    initialMeta = (res as any)?._meta ?? null
  } catch (_) {
    // ignore, will render notFound below
  }

  if (!initialData) {
    notFound()
  }

  return (
    <CaseDetailClient id={id} initialData={initialData} initialMeta={initialMeta} initialNow={serverNow} />
  )
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  try {
    const res = await fetchCaseById(id)
    const data = res?.data
    const name = data?.fullName || 'Missing Person Case'
    const title = `Missing: ${name}`
    const descBase = data?.description || `Help find ${name}.`
    const description = descBase.length > 180 ? `${descBase.slice(0, 177)}…` : descBase
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
    const url = siteUrl ? `${siteUrl}/cases/${id}` : undefined
    const images = Array.isArray(data?.imageUrls) && data.imageUrls.length > 0 ? [data.imageUrls[0]] : undefined

    return {
      title,
      description,
      alternates: url ? { canonical: url } : undefined,
      openGraph: {
        title,
        description,
        url,
        type: 'article',
        images,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images,
      },
    }
  } catch {
    return {
      title: 'Missing Person Case',
      description: 'Help find missing persons.',
    }
  }
}


