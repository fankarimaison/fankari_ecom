import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser, isSchemaMissing } from '@/lib/auth'
import {
  fetchCartPayload,
  setupRequiredResponse,
  UUID_RE,
  type CartPayload,
} from '@/lib/dto'

type RouteContext = { params: Promise<{ id: string }> }
type SchemaError = { code?: string; message?: string }

// PUT /api/cart/[id] { quantity } — quantity <= 0 removes the item
export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const supabase = await createClient()
    const user = await getSessionUser(supabase)
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to use your cart' }, { status: 401 })
    }

    const { id } = await params

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    const quantity = body?.quantity
    if (typeof quantity !== 'number' || !Number.isInteger(quantity)) {
      return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 })
    }

    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 })
    }

    const { data: item, error: fetchError } = await supabase
      .from('cart_items')
      .select('*, product:products(*)')
      .eq('id', id)
      .maybeSingle()
    if (fetchError) {
      if (isSchemaMissing(fetchError)) return setupRequiredResponse()
      console.error('PUT /api/cart/[id] fetch error:', fetchError.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
    if (!item || item.user_id !== user.id) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 })
    }

    if (quantity <= 0) {
      const { error } = await supabase.from('cart_items').delete().eq('id', id)
      if (error) {
        console.error('PUT /api/cart/[id] delete error:', error.message)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
      }
      const payload: CartPayload = await fetchCartPayload(supabase, user.id)
      return NextResponse.json(payload)
    }

    const stock = Number(item.product?.stock ?? 0)
    if (quantity > stock) {
      return NextResponse.json({ error: `Only ${stock} left in stock` }, { status: 400 })
    }

    const { error } = await supabase.from('cart_items').update({ quantity }).eq('id', id)
    if (error) {
      console.error('PUT /api/cart/[id] update error:', error.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    const payload: CartPayload = await fetchCartPayload(supabase, user.id)
    return NextResponse.json(payload)
  } catch (err) {
    if (isSchemaMissing(err as SchemaError)) return setupRequiredResponse()
    console.error('PUT /api/cart/[id] error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// DELETE /api/cart/[id]
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const supabase = await createClient()
    const user = await getSessionUser(supabase)
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to use your cart' }, { status: 401 })
    }

    const { id } = await params

    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 })
    }

    const { data: item, error: fetchError } = await supabase
      .from('cart_items')
      .select('id, user_id')
      .eq('id', id)
      .maybeSingle()
    if (fetchError) {
      if (isSchemaMissing(fetchError)) return setupRequiredResponse()
      console.error('DELETE /api/cart/[id] fetch error:', fetchError.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
    if (!item || item.user_id !== user.id) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 })
    }

    const { error } = await supabase.from('cart_items').delete().eq('id', id)
    if (error) {
      console.error('DELETE /api/cart/[id] delete error:', error.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    const payload: CartPayload = await fetchCartPayload(supabase, user.id)
    return NextResponse.json(payload)
  } catch (err) {
    if (isSchemaMissing(err as SchemaError)) return setupRequiredResponse()
    console.error('DELETE /api/cart/[id] error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
