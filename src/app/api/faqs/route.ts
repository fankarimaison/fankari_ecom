import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser, isSchemaMissing } from '@/lib/auth'
import { setupRequiredResponse } from '@/lib/dto'
import { FAQ_SELECT, mapFaq, parseFaqInput, type FaqRow } from '@/lib/faqs'

// GET /api/faqs — FAQs in display order. Shoppers get published ones only; a
// signed-in admin also gets hidden ones (RLS decides), each with `published`.
export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('faqs')
      .select(FAQ_SELECT)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) {
      if (isSchemaMissing(error)) return NextResponse.json({ faqs: [] })
      console.error('GET /api/faqs query error:', error.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
    return NextResponse.json({ faqs: ((data ?? []) as FaqRow[]).map(mapFaq) })
  } catch (err) {
    console.error('GET /api/faqs error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// POST /api/faqs { question, answer, sortOrder?, published? } — ADMIN
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await getSessionUser(supabase)
    if (!user) {
      return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
    }
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const parsed = parseFaqInput(
      (await req.json().catch(() => null)) as Record<string, unknown> | null,
      false,
    )
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

    // New questions go last unless an order was given
    if (parsed.data.sort_order === undefined) {
      const { data: last } = await supabase
        .from('faqs')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle()
      parsed.data.sort_order = (last?.sort_order ?? 0) + 1
    }

    const { data, error } = await supabase.from('faqs').insert(parsed.data).select(FAQ_SELECT).single()
    if (error) {
      if (isSchemaMissing(error)) return setupRequiredResponse()
      console.error('POST /api/faqs insert error:', error.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
    return NextResponse.json({ faq: mapFaq(data as FaqRow) }, { status: 201 })
  } catch (err) {
    console.error('POST /api/faqs error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
