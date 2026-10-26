import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSchemaMissing } from '@/lib/auth'
import { parseBagLines, setupRequiredResponse, type OrderDTO } from '@/lib/dto'
import { isPaymentMethod } from '@/lib/pricing'

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

// POST /api/orders — guest checkout via the atomic place_order RPC. The bag
// comes from the browser as items: [{ productId, quantity }].
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const items = parseBagLines(body.items)
    if (!items) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    if (items.length === 0) {
      return NextResponse.json({ error: 'Your cart is empty' }, { status: 400 })
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
    if (phone.replace(/\D/g, '').length < 8)
      return NextResponse.json({ error: 'WhatsApp number is required' }, { status: 400 })
    if (!address) return NextResponse.json({ error: 'Shipping address is required' }, { status: 400 })
    if (!city) return NextResponse.json({ error: 'City is required' }, { status: 400 })
    if (!isPaymentMethod(body.paymentMethod))
      return NextResponse.json({ error: 'Please choose a payment method' }, { status: 400 })

    // Atomic: validate stock → create order + snapshot items → decrement
    // stock. Returns the camelCase order JSON directly.
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('place_order', {
      p_items: items,
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
        const name = match ? match[1] : 'An item'
        const stock = match ? match[2] : '0'
        return NextResponse.json(
          {
            error:
              stock === '0'
                ? `${name} is no longer available`
                : `Only ${stock} left in stock of ${name}`,
          },
          { status: 400 },
        )
      }
      if (msg.includes('PAYMENT_METHOD')) {
        return NextResponse.json({ error: 'Please choose a payment method' }, { status: 400 })
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
