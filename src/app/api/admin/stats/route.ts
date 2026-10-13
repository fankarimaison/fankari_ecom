import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

// GET /api/admin/stats
export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
    }
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const [revenueAgg, ordersCount, customersCount, productsCount, lowStockCount, pendingCount] =
      await Promise.all([
        db.order.aggregate({
          _sum: { total: true },
          where: { status: { not: 'CANCELLED' } },
        }),
        db.order.count(),
        db.user.count({ where: { role: 'CUSTOMER' } }),
        db.product.count(),
        db.product.count({ where: { active: true, stock: { lte: 5 } } }),
        db.order.count({ where: { status: { in: ['PENDING', 'CONFIRMED'] } } }),
      ])

    const stats = {
      revenue: revenueAgg._sum.total ?? 0,
      orders: ordersCount,
      customers: customersCount,
      products: productsCount,
      lowStock: lowStockCount,
      pending: pendingCount,
    }

    return NextResponse.json({ stats })
  } catch (err) {
    console.error('GET /api/admin/stats error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
