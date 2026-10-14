import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/auth/logout — clears the sb-* session cookies
export async function POST() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch (err) {
    // Never fail the logout — the client wants its session gone either way.
    console.error('POST /api/auth/logout error:', err)
  }
  return NextResponse.json({ success: true })
}
