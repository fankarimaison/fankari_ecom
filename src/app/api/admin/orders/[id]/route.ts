import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

type RouteContext = { params: Promise<{ id: string }> }

const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']

// PATCH /api/admin/orders/[id] { status } — CANCELLED restores stock for its items
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await getSessionUser()
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

    const order = await db.order.findUnique({ where: { id }, include: { items: true } })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (status === 'CANCELLED' && order.status !== 'CANCELLED') {
      // Restock every line exactly once (only on the transition into CANCELLED).
      await db.$transaction([
        db.order.update({ where: { id }, data: { status } }),
        ...order.items.map((item) =>
          db.product.updateMany({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          })
        ),
      ])
    } else {
      await db.order.update({ where: { id }, data: { status } })
    }

    const updated = await db.order.findUnique({ where: { id }, include: { items: true } })
    return NextResponse.json({ order: updated })
  } catch (err) {
    console.error('PATCH /api/admin/orders/[id] error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
