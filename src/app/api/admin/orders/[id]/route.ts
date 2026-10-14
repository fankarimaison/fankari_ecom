import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser, isSchemaMissing } from '@/lib/auth'
import {
  mapAdminOrder,
  setupRequiredResponse,
  UUID_RE,
  type AdminOrderDTO,
  type AdminOrderRow,
} from '@/lib/dto'

type RouteContext = { params: Promise<{ id: string }> }

const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']

// PATCH /api/admin/orders/[id] { status } — CANCELLED restocks via the
// admin_cancel_order RPC (single atomic transition, one-time restock).
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

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    const status = typeof body?.status === 'string' ? body.status.trim().toUpperCase() : ''
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (status === 'CANCELLED') {
      const { data, error } = await supabase.rpc('admin_cancel_order', { p_order_id: id })
      if (error) {
        if (isSchemaMissing(error)) return setupRequiredResponse()
        const msg = error.message ?? ''
        if (msg.includes('ALREADY_CANCELLED')) {
          return NextResponse.json({ error: 'Order is already cancelled' }, { status: 400 })
        }
        if (msg.includes('NOT_FOUND')) {
          return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }
        if (msg.includes('FORBIDDEN')) {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }
        console.error('PATCH /api/admin/orders/[id] rpc error:', msg)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
      }
      // The RPC returns the camelCase order with user + items embedded.
      return NextResponse.json({ order: data as AdminOrderDTO })
    }

    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select('id')
      .maybeSingle()
    if (updateError) {
      if (isSchemaMissing(updateError)) return setupRequiredResponse()
      console.error('PATCH /api/admin/orders/[id] update error:', updateError.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
    if (!updated) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Re-fetch with the admin-orders shape (items + user embedded).
    const { data: full, error: fetchError } = await supabase
      .from('orders')
      .select('*, items:order_items(*), user:profiles(name,email)')
      .eq('id', id)
      .maybeSingle()
    if (fetchError) {
      console.error('PATCH /api/admin/orders/[id] refetch error:', fetchError.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
    if (!full) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({ order: mapAdminOrder(full as AdminOrderRow) })
  } catch (err) {
    console.error('PATCH /api/admin/orders/[id] error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
