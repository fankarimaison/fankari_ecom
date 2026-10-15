import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser, isSchemaMissing } from '@/lib/auth'
import {
  fetchCartPayload,
  setupRequiredResponse,
  UUID_RE,
  type CartPayload,
} from '@/lib/dto'

type SchemaError = { code?: string; message?: string }

// GET /api/cart
export async function GET() {
  try {
    const supabase = await createClient()
    const user = await getSessionUser(supabase)
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to use your cart' }, { status: 401 })
    }

    const payload = await fetchCartPayload(supabase, user.id)
    return NextResponse.json(payload)
  } catch (err) {
    if (isSchemaMissing(err as SchemaError)) return setupRequiredResponse()
    console.error('GET /api/cart error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// POST /api/cart { productId, quantity? } — upsert (increments when the item exists)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await getSessionUser(supabase)
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to use your cart' }, { status: 401 })
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const productId = typeof body.productId === 'string' ? body.productId : ''
    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 })
    }

    let quantity = 1
    if (body.quantity !== undefined) {
      if (
        typeof body.quantity !== 'number' ||
        !Number.isInteger(body.quantity) ||
        body.quantity < 1
      ) {
        return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 })
      }
      quantity = body.quantity
    }

    if (!UUID_RE.test(productId)) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .maybeSingle()
    if (productError) {
      if (isSchemaMissing(productError)) return setupRequiredResponse()
      console.error('POST /api/cart product fetch error:', productError.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
    if (!product || !product.active) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const { data: existing, error: existingError } = await supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .maybeSingle()
    if (existingError) {
      console.error('POST /api/cart item fetch error:', existingError.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    const stock = Number(product.stock)
    const requestedTotal = (existing ? Number(existing.quantity) : 0) + quantity
    if (requestedTotal > stock) {
      return NextResponse.json({ error: `Only ${stock} left in stock` }, { status: 400 })
    }

    if (existing) {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: requestedTotal })
        .eq('id', existing.id)
      if (error) {
        console.error('POST /api/cart update error:', error.message)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
      }
    } else {
      const { error } = await supabase
        .from('cart_items')
        .insert({ user_id: user.id, product_id: productId, quantity })
      if (error) {
        console.error('POST /api/cart insert error:', error.message)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
      }
    }

    const payload: CartPayload = await fetchCartPayload(supabase, user.id)
    return NextResponse.json(payload)
  } catch (err) {
    if (isSchemaMissing(err as SchemaError)) return setupRequiredResponse()
    console.error('POST /api/cart error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
