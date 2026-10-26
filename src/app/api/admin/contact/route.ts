import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser, isSchemaMissing } from '@/lib/auth'
import { setupRequiredResponse } from '@/lib/dto'

interface ContactRow {
  id: string
  name: string
  phone: string
  email: string
  message: string
  handled: boolean
  created_at: string
}

// GET /api/admin/contact — "Contact us" requests, newest first
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
      .from('contact_requests')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      if (isSchemaMissing(error)) return setupRequiredResponse()
      console.error('GET /api/admin/contact query error:', error.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    return NextResponse.json({
      requests: ((data ?? []) as ContactRow[]).map((r) => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        email: r.email,
        message: r.message,
        handled: r.handled,
        createdAt: r.created_at,
      })),
    })
  } catch (err) {
    console.error('GET /api/admin/contact error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
