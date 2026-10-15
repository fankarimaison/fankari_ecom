import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser, isSchemaMissing } from '@/lib/auth'
import { mapOrder, setupRequiredResponse, UUID_RE } from '@/lib/dto'

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/orders/[id] — RLS hides other users' orders, so "unknown" and
// "not yours" are both a plain 404 (no information leak).
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const supabase = await createClient()
    const user = await getSessionUser(supabase)
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to view your orders' }, { status: 401 })
    }

    const { id } = await params
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('id', id)
      .maybeSingle()
    if (error) {
      if (isSchemaMissing(error)) return setupRequiredResponse()
      console.error('GET /api/orders/[id] query error:', error.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({ order: mapOrder(data) })
  } catch (err) {
    console.error('GET /api/orders/[id] error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
