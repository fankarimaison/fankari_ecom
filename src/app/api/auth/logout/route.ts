import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/auth/logout — ends the admin's Supabase Auth session
export async function POST() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/auth/logout error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
