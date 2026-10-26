import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser, isSchemaMissing } from '@/lib/auth'
import { setupRequiredResponse } from '@/lib/dto'

// GET /api/admin/stats — minimal column fetches, computed in JS
export async function GET() {
  try {
    const supabase = await createClient()
    const user = await getSessionUser(supabase)
    if (!user) {
      return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
    }
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const [ordersRes, productsRes] = await Promise.all([
      supabase.from('orders').select('total,status,email'),
      supabase.from('products').select('stock,active'),
    ])

    for (const res of [ordersRes, productsRes]) {
      if (res.error) {
        if (isSchemaMissing(res.error)) return setupRequiredResponse()
        console.error('GET /api/admin/stats query error:', res.error.message)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
      }
    }

    const orders = (ordersRes.data ?? []) as {
      total: number | string
      status: string
      email: string
    }[]
    const products = (productsRes.data ?? []) as { stock: number | string; active: boolean }[]

    const stats = {
      revenue:
        Math.round(
          orders
            .filter((o) => o.status !== 'CANCELLED')
            .reduce((sum, o) => sum + Number(o.total), 0) * 100
        ) / 100,
      orders: orders.length,
      // Shoppers check out as guests — count distinct checkout emails
      customers: new Set(orders.map((o) => o.email.trim().toLowerCase()).filter(Boolean)).size,
      products: products.length,
      lowStock: products.filter((p) => p.active && Number(p.stock) <= 5).length,
      pending: orders.filter((o) => o.status === 'PENDING' || o.status === 'CONFIRMED').length,
    }

    return NextResponse.json({ stats })
  } catch (err) {
    console.error('GET /api/admin/stats error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
