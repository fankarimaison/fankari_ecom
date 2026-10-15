import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSchemaMissing } from '@/lib/auth'
import { setupRequiredResponse } from '@/lib/dto'

// POST /api/track { orderNumber, email } — public order tracking (no sign-in).
// POST keeps the email out of URLs and logs. Both values must match the order,
// and "wrong email" and "no such order" get the same 404.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    const orderNumber = typeof body?.orderNumber === 'string' ? body.orderNumber.trim() : ''
    const email = typeof body?.email === 'string' ? body.email.trim() : ''
    if (!orderNumber || !email) {
      return NextResponse.json(
        { error: 'Enter your order number and the email used at checkout' },
        { status: 400 },
      )
    }

    const supabase = await createClient()
    const { data, error } = await supabase.rpc('track_order', {
      p_order_number: orderNumber,
      p_email: email,
    })
    if (error) {
      if (isSchemaMissing(error)) return setupRequiredResponse()
      console.error('POST /api/track rpc error:', error.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json(
        { error: 'No order matches that order number and email' },
        { status: 404 },
      )
    }
    return NextResponse.json({ order: data })
  } catch (err) {
    console.error('POST /api/track error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
