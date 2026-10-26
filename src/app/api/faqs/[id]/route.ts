import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth'
import { UUID_RE } from '@/lib/dto'
import { FAQ_SELECT, mapFaq, parseFaqInput, type FaqRow } from '@/lib/faqs'

type RouteContext = { params: Promise<{ id: string }> }

async function requireAdmin() {
  const supabase = await createClient()
  const user = await getSessionUser(supabase)
  if (!user) return { supabase, error: NextResponse.json({ error: 'Please sign in' }, { status: 401 }) }
  if (user.role !== 'ADMIN') {
    return { supabase, error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) }
  }
  return { supabase, error: null }
}

// PUT /api/faqs/[id] { question?, answer?, sortOrder?, published? } — ADMIN
export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const { supabase, error: denied } = await requireAdmin()
    if (denied) return denied

    const { id } = await params
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    const parsed = parseFaqInput(
      (await req.json().catch(() => null)) as Record<string, unknown> | null,
      true,
    )
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })
    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('faqs')
      .update(parsed.data)
      .eq('id', id)
      .select(FAQ_SELECT)
      .maybeSingle()
    if (error) {
      console.error('PUT /api/faqs/[id] update error:', error.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }
    return NextResponse.json({ faq: mapFaq(data as FaqRow) })
  } catch (err) {
    console.error('PUT /api/faqs/[id] error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// DELETE /api/faqs/[id] — ADMIN
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { supabase, error: denied } = await requireAdmin()
    if (denied) return denied

    const { id } = await params
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    const { data, error } = await supabase.from('faqs').delete().eq('id', id).select('id').maybeSingle()
    if (error) {
      console.error('DELETE /api/faqs/[id] delete error:', error.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/faqs/[id] error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
