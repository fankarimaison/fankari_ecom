import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser, isSchemaMissing } from '@/lib/auth'
import {
  mapAdminOrder,
  setupRequiredResponse,
  type AdminOrderRow,
} from '@/lib/dto'

// GET /api/admin/orders — all orders, newest first, with user name/email
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

    const { data, error } = await supabase
      .from('orders')
      .select('*, items:order_items(*), user:profiles(name,email)')
      .order('created_at', { ascending: false })
    if (error) {
      if (isSchemaMissing(error)) return setupRequiredResponse()
      console.error('GET /api/admin/orders query error:', error.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    return NextResponse.json({ orders: ((data ?? []) as AdminOrderRow[]).map(mapAdminOrder) })
  } catch (err) {
    console.error('GET /api/admin/orders error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
