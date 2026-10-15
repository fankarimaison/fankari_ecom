import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser, isSchemaMissing } from '@/lib/auth'
import {
  mapOrder,
  ORDER_SELECT,
  setupRequiredResponse,
  type OrderDTO,
  type OrderRow,
} from '@/lib/dto'
import { isPaymentMethod } from '@/lib/pricing'

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

// POST /api/orders — checkout via the atomic place_order RPC
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await getSessionUser(supabase)
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to place an order' }, { status: 401 })
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const customerName = str(body.customerName)
    const email = str(body.email)
    const phone = str(body.phone)
    const address = str(body.address)
    const city = str(body.city)
    const postalCode = str(body.postalCode)
    const notes = str(body.notes)

    if (!customerName)
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    if (!address) return NextResponse.json({ error: 'Shipping address is required' }, { status: 400 })
    if (!city) return NextResponse.json({ error: 'City is required' }, { status: 400 })
    if (!isPaymentMethod(body.paymentMethod))
      return NextResponse.json({ error: 'Please choose a payment method' }, { status: 400 })

    // Atomic: load cart → validate stock → create order + snapshot items →
    // decrement stock → clear cart. Returns the camelCase order JSON directly.
    const { data, error } = await supabase.rpc('place_order', {
      p_customer_name: customerName,
      p_email: email,
      p_phone: phone,
      p_address: address,
      p_city: city,
      p_postal_code: postalCode,
      p_notes: notes,
      p_payment_method: body.paymentMethod,
    })

    if (error) {
      if (isSchemaMissing(error)) return setupRequiredResponse()
      const msg = error.message ?? ''
      if (msg.includes('EMPTY_CART')) {
        return NextResponse.json({ error: 'Your cart is empty' }, { status: 400 })
      }
      if (msg.startsWith('STOCK:')) {
        // STOCK:<product name>:<stock left>
        const match = /^STOCK:(.+):(\d+)$/.exec(msg)
        const stock = match ? match[2] : '0'
        return NextResponse.json({ error: `Only ${stock} left in stock` }, { status: 400 })
      }
      if (msg.includes('PAYMENT_METHOD')) {
        return NextResponse.json({ error: 'Please choose a payment method' }, { status: 400 })
      }
      if (msg.includes('AUTH_REQUIRED')) {
        return NextResponse.json({ error: 'Please sign in to place an order' }, { status: 401 })
      }
      console.error('POST /api/orders rpc error:', msg)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    return NextResponse.json({ order: data as OrderDTO }, { status: 201 })
  } catch (err) {
    console.error('POST /api/orders error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// GET /api/orders — current user's orders, newest first
export async function GET() {
  try {
    const supabase = await createClient()
    const user = await getSessionUser(supabase)
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to view your orders' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('orders')
      .select(ORDER_SELECT)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) {
      if (isSchemaMissing(error)) return setupRequiredResponse()
      console.error('GET /api/orders query error:', error.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    return NextResponse.json({ orders: ((data ?? []) as OrderRow[]).map(mapOrder) })
  } catch (err) {
    console.error('GET /api/orders error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
