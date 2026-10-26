import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSchemaMissing } from '@/lib/auth'
import { buildCartPayload, parseBagLines, setupRequiredResponse } from '@/lib/dto'

type SchemaError = { code?: string; message?: string }

// POST /api/cart { items: [{ productId, quantity }] } — prices the shopper's
// bag. The bag itself lives in the browser (no sign-in), so this only looks
// products up and computes the totals place_order() will charge.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    const lines = parseBagLines(body?.items)
    if (!lines) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const supabase = await createClient()
    return NextResponse.json(await buildCartPayload(supabase, lines))
  } catch (err) {
    if (isSchemaMissing(err as SchemaError)) return setupRequiredResponse()
    console.error('POST /api/cart error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
