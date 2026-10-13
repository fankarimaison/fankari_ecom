import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

type RouteContext = { params: Promise<{ id: string }> }

const round2 = (n: number) => Math.round(n * 100) / 100

/** Full refreshed cart payload, shared by every cart mutation response. */
async function buildCartResponse(userId: string) {
  const rows = await db.cartItem.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: { product: true },
  })
  const subtotal = round2(rows.reduce((sum, item) => sum + item.product.price * item.quantity, 0))
  const count = rows.reduce((sum, item) => sum + item.quantity, 0)
  return NextResponse.json({ items: rows, subtotal, count })
}

// PUT /api/cart/[id] { quantity } — quantity <= 0 removes the item
export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to use your cart' }, { status: 401 })
    }

    const { id } = await params

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    const quantity = body?.quantity
    if (typeof quantity !== 'number' || !Number.isInteger(quantity)) {
      return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 })
    }

    const item = await db.cartItem.findUnique({
      where: { id },
      include: { product: true },
    })
    if (!item || item.userId !== user.id) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 })
    }

    if (quantity <= 0) {
      await db.cartItem.delete({ where: { id } })
      return await buildCartResponse(user.id)
    }

    if (quantity > item.product.stock) {
      return NextResponse.json(
        { error: `Only ${item.product.stock} left in stock` },
        { status: 400 }
      )
    }

    await db.cartItem.update({ where: { id }, data: { quantity } })
    return await buildCartResponse(user.id)
  } catch (err) {
    console.error('PUT /api/cart/[id] error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// DELETE /api/cart/[id]
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to use your cart' }, { status: 401 })
    }

    const { id } = await params

    const item = await db.cartItem.findUnique({ where: { id } })
    if (!item || item.userId !== user.id) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 })
    }

    await db.cartItem.delete({ where: { id } })
    return await buildCartResponse(user.id)
  } catch (err) {
    console.error('DELETE /api/cart/[id] error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
