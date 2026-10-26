import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser, isSchemaMissing } from '@/lib/auth'
import { setupRequiredResponse, UUID_RE } from '@/lib/dto'

type RouteContext = { params: Promise<{ id: string }> }

// PATCH /api/admin/contact/[id] { handled: boolean }
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const supabase = await createClient()
    const user = await getSessionUser(supabase)
    if (!user) {
      return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
    }
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    if (typeof body?.handled !== 'boolean') {
      return NextResponse.json({ error: 'handled must be true or false' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('contact_requests')
      .update({ handled: body.handled })
      .eq('id', id)
      .select('id')
      .maybeSingle()
    if (error) {
      if (isSchemaMissing(error)) return setupRequiredResponse()
      console.error('PATCH /api/admin/contact/[id] error:', error.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('PATCH /api/admin/contact/[id] error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
