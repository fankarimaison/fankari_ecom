import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

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

// GET /api/cart
export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to use your cart' }, { status: 401 })
    }
    return await buildCartResponse(user.id)
  } catch (err) {
    console.error('GET /api/cart error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// POST /api/cart { productId, quantity? } — upsert (increments when the item exists)
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
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

    const product = await db.product.findUnique({ where: { id: productId } })
    if (!product || !product.active) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const existing = await db.cartItem.findUnique({
      where: { userId_productId: { userId: user.id, productId } },
    })

    const requestedTotal = (existing?.quantity ?? 0) + quantity
    if (requestedTotal > product.stock) {
      return NextResponse.json(
        { error: `Only ${product.stock} left in stock` },
        { status: 400 }
      )
    }

    if (existing) {
      await db.cartItem.update({
        where: { id: existing.id },
        data: { quantity: requestedTotal },
      })
    } else {
      await db.cartItem.create({
        data: { userId: user.id, productId, quantity },
      })
    }

    return await buildCartResponse(user.id)
  } catch (err) {
    console.error('POST /api/cart error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
