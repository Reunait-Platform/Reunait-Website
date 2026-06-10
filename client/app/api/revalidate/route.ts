import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tag = searchParams.get('tag')
    const secret = searchParams.get('secret')

    // Also check JSON body if not provided in the query params
    let bodySecret = null
    let bodyTag = null
    try {
      if (request.headers.get('content-type')?.includes('application/json')) {
        const body = await request.json()
        bodySecret = body.secret
        bodyTag = body.tag
      }
    } catch {
      // Ignore body parsing failures
    }

    const finalSecret = secret || bodySecret
    const finalTag = tag || bodyTag

    // Verify secret validation
    if (!finalSecret || finalSecret !== process.env.REVALIDATE_SECRET) {
      console.warn('[Revalidate Webhook] Unauthorized request or mismatched secret')
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    if (!finalTag) {
      return NextResponse.json({ success: false, message: 'Missing tag parameter' }, { status: 400 })
    }

    // Purge cache at the Next.js server / Edge level
    revalidateTag(finalTag, 'max')
    console.log(`[Revalidate Webhook] Successfully revalidated tag: ${finalTag}`)

    return NextResponse.json({
      success: true,
      revalidated: true,
      tag: finalTag,
      now: Date.now()
    })
  } catch (error) {
    console.error('[Revalidate Webhook] Error processing revalidation:', error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tag = searchParams.get('tag')
    const secret = searchParams.get('secret')

    // Verify secret validation
    if (!secret || secret !== process.env.REVALIDATE_SECRET) {
      console.warn('[Revalidate Webhook GET] Unauthorized request or mismatched secret')
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    if (!tag) {
      return NextResponse.json({ success: false, message: 'Missing tag parameter' }, { status: 400 })
    }

    revalidateTag(tag, 'max')
    console.log(`[Revalidate Webhook GET] Successfully revalidated tag: ${tag}`)

    return NextResponse.json({
      success: true,
      revalidated: true,
      tag,
      now: Date.now()
    })
  } catch (error) {
    console.error('[Revalidate Webhook GET] Error processing revalidation:', error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}
