import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser, isSchemaMissing } from '@/lib/auth'
import {
  ADMIN_ORDER_SELECT,
  mapAdminOrder,
  ORDER_STATUSES,
  setupRequiredResponse,
  UUID_RE,
  type AdminOrderRow,
} from '@/lib/dto'

type RouteContext = { params: Promise<{ id: string }> }

const MAX_TEXT = 200

/** undefined = field not sent; string = new value ('' clears). */
function optionalText(value: unknown): string | undefined | null {
  if (value === undefined) return undefined
  if (typeof value !== 'string') return null
  const v = value.trim()
  return v.length > MAX_TEXT ? null : v
}

// PATCH /api/admin/orders/[id]
//   { status?, courierName?, trackingNumber?, trackingUrl?, estimatedDelivery?, note? }
// Status changes and notes are recorded on the order timeline (order_events).
// CANCELLED restocks via the admin_cancel_order RPC (one-time, atomic);
// cancelled orders cannot be reopened, since their stock was returned.
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
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const status =
      body.status === undefined
        ? undefined
        : typeof body.status === 'string'
          ? body.status.trim().toUpperCase()
          : ''
    if (status !== undefined && !(ORDER_STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const courierName = optionalText(body.courierName)
    const trackingNumber = optionalText(body.trackingNumber)
    const trackingUrl = optionalText(body.trackingUrl)
    const noteText = optionalText(body.note)
    if (courierName === null || trackingNumber === null || trackingUrl === null || noteText === null) {
      return NextResponse.json(
        { error: `Tracking details must be text of at most ${MAX_TEXT} characters` },
        { status: 400 },
      )
    }
    const note = noteText ?? ''
    if (trackingUrl && !/^https?:\/\//i.test(trackingUrl)) {
      return NextResponse.json(
        { error: 'Tracking link must start with http:// or https://' },
        { status: 400 },
      )
    }
    let estimatedDelivery: string | null | undefined
    if (body.estimatedDelivery !== undefined) {
      if (body.estimatedDelivery === null || body.estimatedDelivery === '') {
        estimatedDelivery = null
      } else if (
        typeof body.estimatedDelivery === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(body.estimatedDelivery) &&
        !Number.isNaN(Date.parse(body.estimatedDelivery))
      ) {
        estimatedDelivery = body.estimatedDelivery
      } else {
        return NextResponse.json({ error: 'Estimated delivery must be a date' }, { status: 400 })
      }
    }

    const { data: current, error: currentError } = await supabase
      .from('orders')
      .select('id,status,courier_name,tracking_number')
      .eq('id', id)
      .maybeSingle()
    if (currentError) {
      if (isSchemaMissing(currentError)) return setupRequiredResponse()
      console.error('PATCH /api/admin/orders/[id] lookup error:', currentError.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
    if (!current) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const statusChanged = status !== undefined && status !== current.status
    if (statusChanged && current.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Cancelled orders cannot be reopened' },
        { status: 400 },
      )
    }

    // Shipped / Out for delivery need the courier and tracking ID (sent now or saved before)
    if (statusChanged && (status === 'SHIPPED' || status === 'OUT_FOR_DELIVERY')) {
      const courier = courierName ?? current.courier_name ?? ''
      const awb = trackingNumber ?? current.tracking_number ?? ''
      if (!courier || !awb) {
        return NextResponse.json(
          { error: 'Add the courier and tracking ID before marking the order shipped' },
          { status: 400 },
        )
      }
    }

    // 1. Tracking details
    const tracking: Record<string, unknown> = {}
    if (courierName !== undefined) tracking.courier_name = courierName
    if (trackingNumber !== undefined) tracking.tracking_number = trackingNumber
    if (trackingUrl !== undefined) tracking.tracking_url = trackingUrl
    if (estimatedDelivery !== undefined) tracking.estimated_delivery = estimatedDelivery
    if (Object.keys(tracking).length > 0) {
      const { error } = await supabase.from('orders').update(tracking).eq('id', id)
      if (error) {
        console.error('PATCH /api/admin/orders/[id] tracking error:', error.message)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
      }
    }

    // 2. Status (+ timeline entry)
    if (statusChanged && status === 'CANCELLED') {
      const { error } = await supabase.rpc('admin_cancel_order', { p_order_id: id, p_note: note })
      if (error) {
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
    } else if (statusChanged || note) {
      if (statusChanged) {
        const { error } = await supabase.from('orders').update({ status }).eq('id', id)
        if (error) {
          console.error('PATCH /api/admin/orders/[id] update error:', error.message)
          return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
        }
      }
      const { error } = await supabase
        .from('order_events')
        .insert({ order_id: id, status: statusChanged ? status : current.status, note })
      if (error) {
        console.error('PATCH /api/admin/orders/[id] event error:', error.message)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
      }
    }

    // Re-fetch with the admin-orders shape (items, timeline, user embedded).
    const { data: full, error: fetchError } = await supabase
      .from('orders')
      .select(ADMIN_ORDER_SELECT)
      .eq('id', id)
      .maybeSingle()
    if (fetchError || !full) {
      if (fetchError) console.error('PATCH /api/admin/orders/[id] refetch error:', fetchError.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    return NextResponse.json({ order: mapAdminOrder(full as AdminOrderRow) })
  } catch (err) {
    console.error('PATCH /api/admin/orders/[id] error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
